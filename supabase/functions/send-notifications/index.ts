// supabase/functions/send-notifications/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as webpush from 'jsr:@negrel/webpush';

// TypeScript Interfaces
interface UserPreference {
  user_id: string;
  subscription: webpush.PushSubscription;
  reminder_time: string;
}

interface PillTracking {
  id: string;
  user_id: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'late' | 'missed';
  notification_count: number;
  next_notification_time: string;
  last_notification_at?: string;
}

interface UserPartner {
  id: string;
  user_id: string;
  partner_id: string;
  status: 'active' | 'inactive' | 'pending';
  notification_enabled: boolean;
  created_at: string;
  updated_at?: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

// Constants and Configuration
// Adjusted to 5-minute blocks - each number represents minutes
const ESCALATION_STEPS = [0, 30, 45, 50, 60].map((min) => Math.ceil(min / 5) * 5);
const INTERVAL_MINUTES = 5;

const supabase: SupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Logger utility
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

function roundToNearestInterval(date: Date): Date {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.floor(minutes / INTERVAL_MINUTES) * INTERVAL_MINUTES;
  const newDate = new Date(date);
  newDate.setMinutes(roundedMinutes, 0, 0);
  return newDate;
}

function getNextIntervalTime(date: Date): Date {
  const rounded = roundToNearestInterval(date);
  rounded.setMinutes(rounded.getMinutes() + INTERVAL_MINUTES);
  return rounded;
}

async function setupWebPush(): Promise<webpush.ApplicationServer> {
  try {
    const vapidKeys = await webpush.importVapidKeys(JSON.parse(Deno.env.get('VAPID_KEYS_JSON')!), { extractable: false });
    return await webpush.ApplicationServer.new({
      contactInformation: 'mailto:services@genod.ch',
      vapidKeys,
    });
  } catch (error) {
    logger.error('Failed to setup WebPush', error);
    throw new Error('WebPush initialization failed');
  }
}

async function notifyPartners(pill: PillTracking, appServer: webpush.ApplicationServer): Promise<void> {
  try {
    // Update pill status to late instead of missed
    const { error: updateError } = await supabase.from('pill_tracking').update({ status: 'late' }).eq('id', pill.id);

    if (updateError) throw updateError;

    // Fetch active partner
    const { data: partner, error: partnerError } = await supabase
      .from<UserPartner>('user_partners')
      .select('partner_id')
      .eq('user_id', pill.user_id)
      .eq('status', 'active')
      .single();

    if (partnerError) {
      if (partnerError.code === 'PGRST116') {
        logger.info(`No active partner found for user ${pill.user_id}`);
        return;
      }
      throw partnerError;
    }

    // Get partner's notification subscription
    const { data: partnerPref, error: prefError } = await supabase
      .from<UserPreference>('user_preferences')
      .select('subscription')
      .eq('user_id', partner.partner_id)
      .single();

    if (prefError) throw prefError;

    if (!partnerPref?.subscription) {
      logger.info(`No subscription found for partner ${partner.partner_id}`);
      return;
    }

    // Send notification to partner
    const payload: NotificationPayload = {
      title: 'Late Pill Alert!',
      body: `Your partner is late taking their ${new Date(pill.scheduled_time).toLocaleTimeString()} pill`,
      url: '/partner',
    };

    await sendNotification(appServer, partnerPref.subscription, payload);
    logger.info(`Partner notification sent for user ${pill.user_id} to partner ${partner.partner_id}`);
  } catch (error) {
    logger.error(`Failed to notify partners for pill ${pill.id}`, error);
    throw error;
  }
}

async function sendNotification(
  appServer: webpush.ApplicationServer,
  subscription: webpush.PushSubscription,
  payload: NotificationPayload,
): Promise<boolean> {
  try {
    logger.debug('Sending notification', { payload, subscription });
    const subscriber = appServer.subscribe(subscription);
    await subscriber.pushTextMessage(JSON.stringify(payload), {});
    return true;
  } catch (error) {
    logger.error('Push notification failed', error);
    return false;
  }
}

async function handler(req: Request): Promise<Response> {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const appServer = await setupWebPush();
    const now = new Date();
    const currentInterval = roundToNearestInterval(now);
    const nextInterval = getNextIntervalTime(now);

    logger.info(`Processing notifications for interval ${currentInterval.toISOString()}`);

    // Process pending pills
    const { data: pendingPills, error: fetchError } = await supabase
      .from<PillTracking>('pill_tracking')
      .select('*')
      .eq('status', 'pending')
      .filter('next_notification_time', 'gte', currentInterval.toISOString())
      .filter('next_notification_time', 'lt', nextInterval.toISOString());

    if (fetchError) throw fetchError;

    if (!pendingPills || pendingPills.length === 0) {
      logger.info('No pending pills to process in this interval');
      return new Response('No notifications to send', { status: 200 });
    }

    logger.info(`Processing ${pendingPills.length} pending pills`);

    for (const pill of pendingPills) {
      try {
        const currentStep = pill.notification_count;

        // Handle late pill case
        if (currentStep >= ESCALATION_STEPS.length) {
          await notifyPartners(pill, appServer);
          continue;
        }

        // Calculate next notification time based on intervals
        const scheduledTime = new Date(pill.scheduled_time);
        const nextStepMinutes = ESCALATION_STEPS[currentStep];
        const nextStepTime = new Date(scheduledTime.getTime() + nextStepMinutes * 60000);
        const roundedNextStepTime = roundToNearestInterval(nextStepTime);

        // Get user subscription
        const { data: userPref } = await supabase
          .from<UserPreference>('user_preferences')
          .select('subscription')
          .eq('user_id', pill.user_id)
          .single();

        if (userPref?.subscription) {
          const payload: NotificationPayload = {
            title: `Pill Reminder (${currentStep + 1}/${ESCALATION_STEPS.length})`,
            body: 'Time to take your pill!',
            url: '/home',
          };

          await sendNotification(appServer, userPref.subscription, payload);

          // Update pill tracking with next interval
          await supabase
            .from('pill_tracking')
            .update({
              notification_count: currentStep + 1,
              last_notification_at: currentInterval.toISOString(),
              next_notification_time: roundedNextStepTime.toISOString(),
            })
            .eq('id', pill.id);

          logger.info(`Notification sent for pill ${pill.id}, next notification at ${roundedNextStepTime.toISOString()}`);
        }
      } catch (pillError) {
        logger.error(`Error processing pill ${pill.id}`, pillError);
        continue;
      }
    }

    return new Response('Notifications processed successfully', { status: 200 });
  } catch (error) {
    logger.error('Handler error', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

serve(handler);


curl -L -X POST 'https://fxsmvpqbebukhqraxsja.supabase.co/functions/v1/daily-cleanup' \
-H 'Authorization: Bearer TtHvPtkNXfm/n3gbPtLzjpVfCKIv7FXjYyWXKWxFzBo='