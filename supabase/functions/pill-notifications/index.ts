import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import * as webpush from "@negrel/webpush";

// ============================================================================
// CONFIGURATION
// ============================================================================

const ESCALATION_MINUTES = [0, 15, 30, 60]; // Reminder intervals after scheduled_time
const PARTNER_ALERT_MINUTES = 90; // Alert partner after this delay

// ============================================================================
// TYPES
// ============================================================================

interface User {
  id: string;
  email: string | null;
  role: "pill_taker" | "partner";
  reminder_time: string | null;
  timezone: string | null;
  active: boolean | null;
  push_subscription: webpush.PushSubscription | null;
}

interface PillTracking {
  id: string;
  user_id: string;
  scheduled_time: string;
  status: "pending" | "taken" | "late_taken" | "missed";
  reminder_count: number;
  last_reminder_at: string | null;
  partner_alerted: boolean;
}

// ============================================================================
// LOGGER
// ============================================================================

const logger = {
  info: (msg: string, data?: unknown) =>
    console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : ""),
  error: (msg: string, err: unknown) => console.error(`[ERROR] ${msg}:`, err),
  debug: (msg: string, data?: unknown) =>
    console.debug(`[DEBUG] ${msg}`, data ? JSON.stringify(data) : ""),
};

// ============================================================================
// SUPABASE & WEBPUSH SETUP
// ============================================================================

const supabase: SupabaseClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function setupWebPush(): Promise<webpush.ApplicationServer> {
  const vapidKeys = await webpush.importVapidKeys(
    JSON.parse(Deno.env.get("VAPID_KEYS_JSON")!),
    { extractable: false }
  );
  return webpush.ApplicationServer.new({
    contactInformation: "mailto:services@genod.ch",
    vapidKeys,
  });
}

// ============================================================================
// NOTIFICATION SENDING
// ============================================================================

async function sendPushNotification(
  appServer: webpush.ApplicationServer,
  subscription: webpush.PushSubscription,
  title: string,
  body: string,
  url: string
): Promise<boolean> {
  try {
    const subscriber = appServer.subscribe(subscription);
    await subscriber.pushTextMessage(JSON.stringify({ title, body, url }), {});
    return true;
  } catch (error) {
    logger.error("Push notification failed", error);
    return false;
  }
}

async function logNotification(
  pillId: string | null,
  recipientId: string,
  type: "user_reminder" | "partner_alert",
  success: boolean,
  errorMessage: string | null
): Promise<void> {
  await supabase.from("notification_log").insert({
    pill_id: pillId,
    recipient_id: recipientId,
    notification_type: type,
    success,
    error_message: errorMessage,
  });
}

// ============================================================================
// TASK 1: CREATE DAILY PILLS
// ============================================================================

async function createDailyPills(): Promise<number> {
  const { data: pillTakers, error } = await supabase
    .from("users")
    .select("id, reminder_time, timezone")
    .eq("role", "pill_taker")
    .eq("active", true)
    .not("reminder_time", "is", null);

  if (error) throw error;
  if (!pillTakers?.length) return 0;

  let created = 0;

  for (const user of pillTakers as User[]) {
    if (!user.reminder_time) continue;

    const tz = user.timezone || "UTC";
    const [hours, minutes] = user.reminder_time.split(":").map(Number);

    // Calculate scheduled_time in user's timezone, then convert to UTC
    const nowInTz = DateTime.now().setZone(tz);
    const scheduledLocal = nowInTz.startOf("day").set({ hour: hours, minute: minutes });
    const scheduledUtc = scheduledLocal.toUTC();

    // Check if pill already exists for today (in user's local day)
    const dayStart = scheduledLocal.startOf("day").toUTC().toISO();
    const dayEnd = scheduledLocal.endOf("day").toUTC().toISO();

    const { data: existing } = await supabase
      .from("pill_tracking")
      .select("id")
      .eq("user_id", user.id)
      .gte("scheduled_time", dayStart)
      .lt("scheduled_time", dayEnd)
      .maybeSingle();

    if (existing) continue;

    // Create pill entry
    const { error: insertError } = await supabase.from("pill_tracking").insert({
      user_id: user.id,
      scheduled_time: scheduledUtc.toISO(),
      status: "pending",
      reminder_count: 0,
      partner_alerted: false,
    });

    if (insertError) {
      logger.error(`Failed to create pill for user ${user.id}`, insertError);
      continue;
    }

    created++;
  }

  logger.info(`Created ${created} daily pill entries`);
  return created;
}

// ============================================================================
// TASK 2: SEND USER REMINDERS
// ============================================================================

async function sendUserReminders(appServer: webpush.ApplicationServer): Promise<number> {
  const now = DateTime.utc();
  let sent = 0;

  // Get all pending pills where we might need to send a reminder
  const { data: pendingPills, error } = await supabase
    .from("pill_tracking")
    .select("*, users!inner(id, push_subscription)")
    .eq("status", "pending")
    .lte("scheduled_time", now.toISO());

  if (error) throw error;
  if (!pendingPills?.length) return 0;

  for (const pill of pendingPills as (PillTracking & { users: User })[]) {
    const scheduledTime = DateTime.fromISO(pill.scheduled_time);
    const minutesSinceScheduled = now.diff(scheduledTime, "minutes").minutes;

    // Determine which reminder we should be on
    const expectedReminderIndex = ESCALATION_MINUTES.findIndex(
      (m, i) =>
        minutesSinceScheduled >= m &&
        (i === ESCALATION_MINUTES.length - 1 || minutesSinceScheduled < ESCALATION_MINUTES[i + 1])
    );

    // Skip if we've already sent this reminder
    if (expectedReminderIndex < 0 || pill.reminder_count > expectedReminderIndex) {
      continue;
    }

    // Skip if no push subscription
    const subscription = pill.users?.push_subscription;
    if (!subscription) {
      logger.debug(`No push subscription for user ${pill.user_id}`);
      continue;
    }

    // Send the reminder
    const isFirst = pill.reminder_count === 0;
    const title = isFirst ? "Time to take your pill" : "Reminder: pill still pending";
    const body = "Tap to update your status.";

    const success = await sendPushNotification(appServer, subscription, title, body, "/home");
    await logNotification(pill.id, pill.user_id, "user_reminder", success, success ? null : "Push failed");

    // Update pill tracking only if notification was sent successfully
    // This allows retry on next run if push failed
    if (success) {
      await supabase
        .from("pill_tracking")
        .update({
          reminder_count: pill.reminder_count + 1,
          last_reminder_at: now.toISO(),
        })
        .eq("id", pill.id);
      sent++;
    }
  }

  logger.info(`Sent ${sent} user reminders`);
  return sent;
}

// ============================================================================
// TASK 3: SEND PARTNER ALERTS
// ============================================================================

async function sendPartnerAlerts(appServer: webpush.ApplicationServer): Promise<number> {
  const now = DateTime.utc();
  const alertThreshold = now.minus({ minutes: PARTNER_ALERT_MINUTES }).toISO();
  let sent = 0;

  // Get pending pills that are past the partner alert threshold and not yet alerted
  const { data: latePills, error } = await supabase
    .from("pill_tracking")
    .select("*")
    .eq("status", "pending")
    .eq("partner_alerted", false)
    .lte("scheduled_time", alertThreshold);

  if (error) throw error;
  if (!latePills?.length) return 0;

  for (const pill of latePills as PillTracking[]) {
    // Find active partner
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("partner_id")
      .eq("pill_taker_id", pill.user_id)
      .eq("status", "active")
      .maybeSingle();

    if (!partnership) {
      // No partner, just mark as alerted to avoid retry
      await supabase
        .from("pill_tracking")
        .update({ partner_alerted: true })
        .eq("id", pill.id);
      continue;
    }

    // Get partner's push subscription
    const { data: partner } = await supabase
      .from("users")
      .select("id, push_subscription")
      .eq("id", partnership.partner_id)
      .maybeSingle();

    if (!partner?.push_subscription) {
      logger.debug(`Partner ${partnership.partner_id} has no push subscription`);
      await supabase
        .from("pill_tracking")
        .update({ partner_alerted: true })
        .eq("id", pill.id);
      continue;
    }

    // Send alert
    const scheduledTime = DateTime.fromISO(pill.scheduled_time).toLocaleString(DateTime.TIME_SIMPLE);
    const title = "Late Pill Alert";
    const body = `Your partner has not confirmed their ${scheduledTime} pill.`;

    const success = await sendPushNotification(
      appServer,
      partner.push_subscription as webpush.PushSubscription,
      title,
      body,
      "/partner"
    );

    await logNotification(pill.id, partner.id, "partner_alert", success, success ? null : "Push failed");

    // Mark as alerted only if notification was sent successfully
    // This allows retry on next run if push failed
    if (success) {
      await supabase
        .from("pill_tracking")
        .update({ partner_alerted: true, status: "late_taken" })
        .eq("id", pill.id);
      sent++;
    }
  }

  logger.info(`Sent ${sent} partner alerts`);
  return sent;
}

// ============================================================================
// TASK 4: MARK MISSED PILLS
// ============================================================================

async function markMissedPills(): Promise<number> {
  // Mark pills as missed only if they're from a previous day (end of day logic)
  const todayStart = DateTime.utc().startOf("day").toISO();

  const { data, error } = await supabase
    .from("pill_tracking")
    .update({ status: "missed" })
    .in("status", ["pending", "late_taken"])
    .lt("scheduled_time", todayStart)
    .select("id");

  if (error) throw error;

  const count = data?.length || 0;
  if (count > 0) {
    logger.info(`Marked ${count} pills as missed`);
  }
  return count;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    logger.info("Starting pill-notifications job");
    const appServer = await setupWebPush();

    // Execute all tasks
    const [pillsCreated, remindersSent, alertsSent, pillsMissed] = await Promise.all([
      createDailyPills(),
      sendUserReminders(appServer),
      sendPartnerAlerts(appServer),
      markMissedPills(),
    ]);

    const summary = {
      pillsCreated,
      remindersSent,
      alertsSent,
      pillsMissed,
      timestamp: new Date().toISOString(),
    };

    logger.info("Job completed", summary);
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Job failed", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
