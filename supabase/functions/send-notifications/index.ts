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
  status: 'pending' | 'taken' | 'missed';
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
const ESCALATION_STEPS = [0, 30, 45, 50, 60]; // Minutes after scheduled time
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

async function createNewPillEntries(currentUTCTime: string): Promise<void> {
  try {
    const { data: users, error } = await supabase
      .from<UserPreference>('user_preferences')
      .select('user_id, reminder_time')
      .eq('reminder_time', currentUTCTime);

    if (error) throw error;
    if (!users || users.length === 0) return;

    logger.info(`Checking pill entries for ${users.length} users at ${currentUTCTime}`);

    for (const user of users) {
      // Check if a pill entry already exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingPills, error: checkError } = await supabase
        .from('pill_tracking')
        .select('id')
        .eq('user_id', user.user_id)
        .gte('scheduled_time', today.toISOString())
        .lt('scheduled_time', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

      if (checkError) {
        logger.error(`Failed to check existing pills for user ${user.user_id}`, checkError);
        continue;
      }

      if (existingPills && existingPills.length > 0) {
        logger.info(`Pill entry already exists for user ${user.user_id} today`);
        continue;
      }

      // Create new pill entry only if none exists
      const [hours, minutes] = user.reminder_time.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setUTCHours(hours, minutes, 0, 0);

      // If scheduled time is in the past for today, schedule for tomorrow
      if (scheduledTime < new Date()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const { error: insertError } = await supabase.from('pill_tracking').insert({
        user_id: user.user_id,
        scheduled_time: scheduledTime.toISOString(),
        next_notification_time: scheduledTime.toISOString(),
        status: 'pending',
        notification_count: 0,
      });

      if (insertError) {
        logger.error(`Failed to create pill entry for user ${user.user_id}`, insertError);
      } else {
        logger.info(`Created pill entry for user ${user.user_id} for ${scheduledTime.toISOString()}`);
      }
    }
  } catch (error) {
    logger.error('Failed to create new pill entries', error);
    throw error;
  }
}

async function notifyPartners(pill: PillTracking, appServer: webpush.ApplicationServer): Promise<void> {
  try {
    // Update pill status first
    const { error: updateError } = await supabase.from('pill_tracking').update({ status: 'missed' }).eq('id', pill.id);

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
        // No partner found
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
      title: 'Missed pill !',
      body: `Your partner missed their ${new Date(pill.scheduled_time).toLocaleTimeString()} pill`,
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
    const currentUTCTime = now.toISOString().slice(11, 19);

    logger.info(`Starting notification processing at ${now.toISOString()}`);

    // Create new pill entries for the current time
    await createNewPillEntries(currentUTCTime);

    // Process pending pills
    const { data: pendingPills, error: fetchError } = await supabase
      .from<PillTracking>('pill_tracking')
      .select('*')
      .lte('next_notification_time', now.toISOString())
      .eq('status', 'pending');

    if (fetchError) throw fetchError;

    if (!pendingPills || pendingPills.length === 0) {
      logger.info('No pending pills to process');
      return new Response('No notifications to send', { status: 200 });
    }

    logger.info(`Processing ${pendingPills.length} pending pills`);

    for (const pill of pendingPills) {
      try {
        const currentStep = pill.notification_count;

        // Handle missed pill case
        if (currentStep >= ESCALATION_STEPS.length) {
          await notifyPartners(pill, appServer);
          continue;
        }

        // Calculate next notification time
        const scheduledTime = new Date(pill.scheduled_time);
        const nextStepTime = new Date(scheduledTime.getTime() + ESCALATION_STEPS[currentStep] * 60000);

        if (nextStepTime <= now) {
          // Get user subscription
          const { data: userPref } = await supabase
            .from<UserPreference>('user_preferences')
            .select('subscription')
            .eq('user_id', pill.user_id)
            .single();

          if (userPref?.subscription) {
            const payload: NotificationPayload = {
              title: `Pill Reminder (${currentStep + 1}/${ESCALATION_STEPS.length})`,
              body: 'Time to take your pill !',
              url: '/home',
            };

            await sendNotification(appServer, userPref.subscription, payload);

            // Update pill tracking
            await supabase
              .from('pill_tracking')
              .update({
                notification_count: currentStep + 1,
                last_notification_at: now.toISOString(),
                next_notification_time: nextStepTime.toISOString(),
              })
              .eq('id', pill.id);
          }
        }
      } catch (pillError) {
        logger.error(`Error processing pill ${pill.id}`, pillError);
        // Continue processing other pills
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
