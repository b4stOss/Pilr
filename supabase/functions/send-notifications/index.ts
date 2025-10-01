// supabase/functions/send-notifications/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DateTime } from 'https://esm.sh/luxon@3.4.4';
import * as webpush from 'jsr:@negrel/webpush';

interface NotificationQueueItem {
  id: string;
  pill_id: string;
  notification_type: 'pill_primary' | 'pill_follow_up' | 'partner_alert';
  recipient_id: string;
  scheduled_for: string;
  attempt_number: number;
  processed_at: string | null;
  success: boolean | null;
  error_message: string | null;
}

interface PillTracking {
  id: string;
  user_id: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'late' | 'missed';
  partner_notified_at: string | null;
}

interface UserProfile {
  id: string;
  email: string | null;
  push_subscription: webpush.PushSubscription | null;
}

interface Partnership {
  partner_id: string;
  notification_enabled: boolean;
}

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

const ESCALATION_DELAYS_MINUTES = [0, 30, 45];
const PARTNER_ALERT_DELAY_MINUTES = 60;

const supabase: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error: unknown) => {
    console.error(`[ERROR] ${message}:`, error);
  },
  debug: (message: string, data?: unknown) => {
    console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
};

const nowIso = () => new Date().toISOString();

async function setupWebPush(): Promise<webpush.ApplicationServer> {
  try {
    const vapidKeys = await webpush.importVapidKeys(JSON.parse(Deno.env.get('VAPID_KEYS_JSON')!), {
      extractable: false,
    });
    return await webpush.ApplicationServer.new({
      contactInformation: 'mailto:services@genod.ch',
      vapidKeys,
    });
  } catch (error) {
    logger.error('Failed to setup WebPush', error);
    throw new Error('WebPush initialization failed');
  }
}

async function sendNotification(
  appServer: webpush.ApplicationServer,
  subscription: webpush.PushSubscription,
  payload: NotificationPayload,
): Promise<boolean> {
  try {
    logger.debug('Sending notification', { payload });
    const subscriber = appServer.subscribe(subscription);
    await subscriber.pushTextMessage(JSON.stringify(payload), {});
    return true;
  } catch (error) {
    logger.error('Push notification failed', error);
    return false;
  }
}

async function completeQueueItem(id: string, success: boolean, errorMessage: string | null): Promise<void> {
  const { error } = await supabase
    .from('notification_queue')
    .update({
      processed_at: nowIso(),
      success,
      error_message: errorMessage,
    })
    .eq('id', id);

  if (error) {
    logger.error('Failed to update notification_queue', error);
  }
}

async function logNotification(
  item: NotificationQueueItem,
  success: boolean,
  errorMessage: string | null,
): Promise<void> {
  const { error } = await supabase.from('notification_log').insert({
    pill_id: item.pill_id,
    recipient_id: item.recipient_id,
    notification_type: item.notification_type,
    attempt_number: item.attempt_number,
    success,
    error_message: errorMessage,
  });

  if (error) {
    logger.error('Failed to log notification attempt', error);
  }
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, push_subscription')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return (data as UserProfile | null) ?? null;
}

async function scheduleFollowUp(pill: PillTracking, nextAttemptNumber: number): Promise<void> {
  if (nextAttemptNumber > ESCALATION_DELAYS_MINUTES.length) return;

  const { data: existing, error: existingError } = await supabase
    .from('notification_queue')
    .select('id')
    .eq('pill_id', pill.id)
    .eq('attempt_number', nextAttemptNumber)
    .eq('notification_type', 'pill_follow_up')
    .is('processed_at', null)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError;
  }

  if (existing) {
    logger.debug('Follow-up notification already scheduled', existing);
    return;
  }

  const offsetMinutes = ESCALATION_DELAYS_MINUTES[nextAttemptNumber - 1];
  const baseTimeUtc = DateTime.fromISO(pill.scheduled_time).plus({ minutes: offsetMinutes }).toUTC();
  const scheduledFor = baseTimeUtc <= DateTime.utc() ? DateTime.utc().plus({ minutes: 1 }) : baseTimeUtc;

  const { error: insertError } = await supabase.from('notification_queue').insert({
    pill_id: pill.id,
    notification_type: 'pill_follow_up',
    recipient_id: pill.user_id,
    scheduled_for: scheduledFor.toISO(),
    attempt_number: nextAttemptNumber,
  });

  if (insertError) throw insertError;
}

async function schedulePartnerAlert(pill: PillTracking): Promise<void> {
  if (pill.partner_notified_at) {
    logger.debug('Partner already notified for pill', pill.id);
    return;
  }

  const { data: existingAlert, error: existingAlertError } = await supabase
    .from('notification_queue')
    .select('id')
    .eq('pill_id', pill.id)
    .eq('notification_type', 'partner_alert')
    .is('processed_at', null)
    .maybeSingle();

  if (existingAlertError && existingAlertError.code !== 'PGRST116') {
    throw existingAlertError;
  }

  if (existingAlert) {
    logger.debug('Partner alert already scheduled', existingAlert);
    return;
  }

  const { data: partnership, error: partnershipError } = await supabase
    .from('partnerships')
    .select('partner_id, notification_enabled')
    .eq('pill_taker_id', pill.user_id)
    .eq('status', 'active')
    .maybeSingle();

  if (partnershipError && partnershipError.code !== 'PGRST116') {
    throw partnershipError;
  }

  const partner = partnership as Partnership | null;
  if (!partner || !partner.notification_enabled) {
    logger.info(`No active partner with notifications enabled for ${pill.user_id}`);
    return;
  }

  const alertTimeUtc = DateTime.fromISO(pill.scheduled_time)
    .plus({ minutes: PARTNER_ALERT_DELAY_MINUTES })
    .toUTC();
  const scheduledFor = alertTimeUtc <= DateTime.utc() ? DateTime.utc().plus({ minutes: 1 }) : alertTimeUtc;

  const { error: insertError } = await supabase.from('notification_queue').insert({
    pill_id: pill.id,
    notification_type: 'partner_alert',
    recipient_id: partner.partner_id,
    scheduled_for: scheduledFor.toISO(),
    attempt_number: 1,
  });

  if (insertError) throw insertError;

  await supabase
    .from('pill_tracking')
    .update({ status: 'late', updated_at: nowIso() })
    .eq('id', pill.id);
}

async function handlePillNotification(
  item: NotificationQueueItem,
  pill: PillTracking,
  appServer: webpush.ApplicationServer,
): Promise<void> {
  const userProfile = await fetchUserProfile(item.recipient_id);

  if (!userProfile?.push_subscription) {
    const message = 'Missing push subscription';
    logger.info(message, { userId: item.recipient_id });
    await logNotification(item, false, message);
    await completeQueueItem(item.id, false, message);
    await schedulePartnerAlert(pill);
    return;
  }

  const payload: NotificationPayload = {
    title: item.attempt_number === 1 ? 'Time to take your pill' : 'Reminder: pill still pending',
    body: 'Tap to update your status.',
    url: '/home',
  };

  const success = await sendNotification(appServer, userProfile.push_subscription, payload);
  await logNotification(item, success, success ? null : 'Push delivery failed');
  await completeQueueItem(item.id, success, success ? null : 'Push delivery failed');

  if (!success) {
    await schedulePartnerAlert(pill);
    return;
  }

  if (pill.status !== 'pending') {
    logger.debug('Pill already handled, skipping follow-ups', { pillId: pill.id, status: pill.status });
    return;
  }

  if (item.attempt_number < ESCALATION_DELAYS_MINUTES.length) {
    await scheduleFollowUp(pill, item.attempt_number + 1);
  } else {
    await schedulePartnerAlert(pill);
  }
}

async function handlePartnerNotification(
  item: NotificationQueueItem,
  pill: PillTracking,
  appServer: webpush.ApplicationServer,
): Promise<void> {
  const partnerProfile = await fetchUserProfile(item.recipient_id);

  if (!partnerProfile?.push_subscription) {
    const message = 'Partner missing push subscription';
    logger.info(message, { partnerId: item.recipient_id });
    await logNotification(item, false, message);
    await completeQueueItem(item.id, false, message);
    return;
  }

  const scheduledTime = DateTime.fromISO(pill.scheduled_time).toLocaleString(DateTime.TIME_SIMPLE);
  const payload: NotificationPayload = {
    title: 'Late Pill Alert',
    body: `Your partner has not confirmed their ${scheduledTime} pill.`,
    url: '/partner',
  };

  const success = await sendNotification(appServer, partnerProfile.push_subscription, payload);
  await logNotification(item, success, success ? null : 'Push delivery failed');
  await completeQueueItem(item.id, success, success ? null : 'Push delivery failed');

  if (success) {
    await supabase
      .from('pill_tracking')
      .update({ partner_notified_at: nowIso(), status: 'late', updated_at: nowIso() })
      .eq('id', pill.id);
  }
}

async function processQueueItem(item: NotificationQueueItem, appServer: webpush.ApplicationServer): Promise<void> {
  const { data: pillData, error: pillError } = await supabase
    .from('pill_tracking')
    .select('id, user_id, scheduled_time, status, partner_notified_at')
    .eq('id', item.pill_id)
    .maybeSingle();

  if (pillError && pillError.code !== 'PGRST116') {
    throw pillError;
  }

  const pill = pillData as PillTracking | null;
  if (!pill) {
    const message = 'Referenced pill not found';
    await logNotification(item, false, message);
    await completeQueueItem(item.id, false, message);
    return;
  }

  if (pill.status === 'taken' || pill.status === 'missed') {
    await logNotification(item, true, `Skipped. Pill status: ${pill.status}`);
    await completeQueueItem(item.id, true, `Skipped. Pill status: ${pill.status}`);
    return;
  }

  if (item.notification_type === 'partner_alert') {
    await handlePartnerNotification(item, pill, appServer);
  } else {
    await handlePillNotification(item, pill, appServer);
  }
}

async function handler(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const appServer = await setupWebPush();
    const now = DateTime.utc();

    const { data: queueItems, error: queueError } = await supabase
      .from('notification_queue')
      .select('*')
      .is('processed_at', null)
      .lte('scheduled_for', now.toISO())
      .order('scheduled_for', { ascending: true })
      .limit(200);

    if (queueError) throw queueError;
    if (!queueItems?.length) {
      logger.info('No queued notifications to process');
      return new Response('No notifications to process', { status: 200 });
    }

    for (const item of queueItems as NotificationQueueItem[]) {
      try {
        await processQueueItem(item, appServer);
      } catch (error) {
        logger.error(`Failed processing queue item ${item.id}`, error);
        await logNotification(item, false, 'Unhandled error during processing');
        await completeQueueItem(item.id, false, 'Unhandled error during processing');
      }
    }

    return new Response('Notifications processed successfully', { status: 200 });
  } catch (error) {
    logger.error('Handler error', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

serve(handler);
