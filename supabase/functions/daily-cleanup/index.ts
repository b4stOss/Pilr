// supabase/functions/daily-cleanup/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DateTime } from 'https://esm.sh/luxon@3.4.4';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error: unknown) => {
    console.error(`[ERROR] ${message}:`, error);
  },
};

const DEFAULT_TIMEZONE = 'UTC';

async function markMissedPills(): Promise<void> {
  const startOfTodayUtc = DateTime.utc().startOf('day');

  try {
    const { error } = await supabase
      .from('pill_tracking')
      .update({ status: 'missed' })
      .lt('scheduled_time', startOfTodayUtc.toISO())
      .in('status', ['pending', 'late']);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to mark missed pills', error);
    throw error;
  }
}

async function createDailyPillEntries(): Promise<void> {
  try {
    const { data: pillTakers, error } = await supabase
      .from('pill_takers')
      .select('user_id, reminder_time, timezone, active')
      .eq('active', true);

    if (error) throw error;
    if (!pillTakers?.length) return;

    let createdCount = 0;

    for (const pillTaker of pillTakers) {
      if (!pillTaker?.reminder_time) continue;

      const [hours, minutes] = pillTaker.reminder_time.split(':').map((value: string) => Number.parseInt(value, 10));
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        logger.error('Invalid reminder time encountered', pillTaker.reminder_time);
        continue;
      }

      const timezone = pillTaker.timezone || DEFAULT_TIMEZONE;
      const nowInZone = DateTime.now().setZone(timezone);
      const scheduledLocal = nowInZone.startOf('day').set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

      const dayStartUtc = scheduledLocal.startOf('day').toUTC();
      const dayEndUtc = scheduledLocal.endOf('day').toUTC();

      const { data: existing, error: existingError } = await supabase
        .from('pill_tracking')
        .select('id')
        .eq('user_id', pillTaker.user_id)
        .gte('scheduled_time', dayStartUtc.toISO())
        .lt('scheduled_time', dayEndUtc.toISO())
        .limit(1)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existing) {
        continue; // Already scheduled for today
      }

      const scheduledUtc = scheduledLocal.toUTC();

      const { data: inserted, error: insertError } = await supabase
        .from('pill_tracking')
        .insert({
          user_id: pillTaker.user_id,
          scheduled_time: scheduledUtc.toISO(),
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { error: queueError } = await supabase.from('notification_queue').insert({
        pill_id: inserted.id,
        notification_type: 'pill_primary',
        recipient_id: pillTaker.user_id,
        scheduled_for: scheduledUtc.toISO(),
        attempt_number: 1,
      });

      if (queueError) throw queueError;

      createdCount += 1;
    }

    logger.info(`Created ${createdCount} pill entries for ${DateTime.utc().toISO()}`);
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
