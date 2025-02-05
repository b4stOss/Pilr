// supabase/functions/daily-pills/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error: unknown) => {
    console.error(`[ERROR] ${message}:`, error);
  },
};

const INTERVAL_MINUTES = 5;

function roundToNearestInterval(date: Date): Date {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.floor(minutes / INTERVAL_MINUTES) * INTERVAL_MINUTES;
  const newDate = new Date(date);
  newDate.setMinutes(roundedMinutes, 0, 0);
  return newDate;
}

async function markMissedPills(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Update all 'late' or 'pending' pills from yesterday to 'missed'
    const { error } = await supabase
      .from('pill_tracking')
      .update({ status: 'missed' })
      .lt('scheduled_time', today.toISOString())
      .in('status', ['pending', 'late']);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to mark missed pills', error);
    throw error;
  }
}

async function createDailyPillEntries(): Promise<void> {
  try {
    const { data: users, error } = await supabase
      .from('user_preferences')
      .select('user_id, reminder_time')
      .not('reminder_time', 'is', null);

    if (error) throw error;
    if (!users?.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pillEntries = users.map((user) => {
      const [hours, minutes] = user.reminder_time.split(':').map(Number);
      const scheduledTime = new Date(today);
      scheduledTime.setHours(hours, minutes, 0, 0);

      // Round the scheduled time to nearest 5 minutes
      const roundedTime = roundToNearestInterval(scheduledTime);

      return {
        user_id: user.user_id,
        scheduled_time: roundedTime.toISOString(),
        next_notification_time: roundedTime.toISOString(),
        status: 'pending',
        notification_count: 0,
      };
    });

    const { error: insertError } = await supabase.from('pill_tracking').insert(pillEntries);

    if (insertError) throw insertError;

    logger.info(`Created ${pillEntries.length} pill entries for ${new Date().toISOString()}`);
  } catch (error) {
    logger.error('Failed to create daily pill entries', error);
    throw error;
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

    // First mark missed pills from yesterday
    await markMissedPills();

    // Then create new pills for today
    await createDailyPillEntries();

    return new Response('Daily pill management completed successfully', { status: 200 });
  } catch (error) {
    logger.error('Handler error', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

Deno.serve(handler);
