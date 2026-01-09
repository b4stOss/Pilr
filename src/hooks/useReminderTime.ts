import { useState, useEffect, useCallback } from 'react';
import { DateTime } from 'luxon';
import { supabase } from '../lib/supabase';
import { showErrorNotification } from '../utils';

interface UseReminderTimeOptions {
  userId: string | undefined;
  initialTime: string | null;
  isSubscribed: boolean;
  onSubscribe: () => Promise<boolean>;
  onSuccess: () => Promise<void>;
}

interface UseReminderTimeReturn {
  reminderTime: string;
  timeError: string | null;
  isSaving: boolean;
  handleTimeChange: (value: string) => void;
  handleSave: () => Promise<void>;
}

/**
 * Validates time format: HH:mm with 15-minute intervals
 */
function isValidTimeFormat(time: string): boolean {
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return false;
  }
  const minutes = parseInt(time.split(':')[1]);
  return minutes % 15 === 0;
}

export function useReminderTime({
  userId,
  initialTime,
  isSubscribed,
  onSubscribe,
  onSuccess,
}: UseReminderTimeOptions): UseReminderTimeReturn {
  const [reminderTime, setReminderTime] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync from initial time
  useEffect(() => {
    if (initialTime) {
      const [hours = '00', minutes = '00'] = initialTime.split(':');
      setReminderTime(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`);
    }
  }, [initialTime]);

  const handleTimeChange = useCallback((value: string) => {
    setReminderTime(value);

    if (!value) {
      setTimeError(null);
      return;
    }

    if (!isValidTimeFormat(value)) {
      setTimeError('Time should be in 15-minute intervals (e.g., 09:00, 09:15, 09:30, 09:45)');
    } else {
      setTimeError(null);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId || !reminderTime || timeError) return;

    setIsSaving(true);
    try {
      // Handle notifications subscription
      if (!isSubscribed) {
        const subscribeSuccess = await onSubscribe();
        if (!subscribeSuccess) {
          throw new Error('Failed to enable notifications');
        }
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const { error: updateError } = await supabase
        .from('users')
        .update({
          reminder_time: reminderTime,
          timezone,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update today's pending pill with the new scheduled time
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const now = DateTime.now().setZone(timezone);
      const scheduledTime = now.startOf('day').set({ hour: hours, minute: minutes });

      if (!scheduledTime.isValid) {
        throw new Error(`Invalid scheduled time: ${scheduledTime.invalidReason}`);
      }

      // Update today's pending pill if it exists
      await supabase
        .from('pill_tracking')
        .update({ scheduled_time: scheduledTime.toUTC().toISO() })
        .eq('user_id', userId)
        .eq('status', 'pending')
        .gte('scheduled_time', now.startOf('day').toUTC().toISO())
        .lte('scheduled_time', now.endOf('day').toUTC().toISO());

      await onSuccess();
    } catch (error) {
      console.error('Error saving reminder time:', error);
      showErrorNotification('Failed to save reminder time. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [userId, reminderTime, timeError, isSubscribed, onSubscribe, onSuccess]);

  return {
    reminderTime,
    timeError,
    isSaving,
    handleTimeChange,
    handleSave,
  };
}
