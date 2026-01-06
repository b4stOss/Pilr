// src/pages/HomePage.tsx
import { Container, Button, Title, Text, Stack, Modal } from '@mantine/core';
import { useEffect, useState } from 'react';
import { TimePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { DateTime } from 'luxon';
import Header from '../components/HeaderComponent';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { usePillTracking } from '../hooks/usePillTracking';
import { usePartnerManagement } from '../hooks/usePartnerManagement';
import { TodayView } from '../components/TodayView';
import { CalendarHistory } from '../components/CalendarHistory';
import { ComplianceStats } from '../components/ComplianceStats';
import { PartnerManagement } from '../components/PartnerManagement';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../lib/supabase';

function isValidTimeFormat(time: string): boolean {
  // First check if it's a valid time
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return false;
  }

  // Check if minutes are divisible by 15 (aligned with cron schedule)
  const minutes = parseInt(time.split(':')[1]);
  return minutes % 15 === 0;
}

export function HomePage() {
  const { user, profile, hasPushSubscription, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'partner'>('today');
  const [reminderTime, setReminderTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [opened, { toggle }] = useDisclosure(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  const { isSubscribed, subscribe } = useNotifications({
    userId: user?.id || '',
    isInitiallySubscribed: hasPushSubscription,
  });

  const {
    todayPills,
    allPills,
    pillsByDate,
    streak,
    error: pillError,
    markPillStatus,
    refreshPills,
  } = usePillTracking({
    userId: user?.id || '',
  });

  const {
    availablePartners,
    activePartner,
    error: partnerError,
    addPartner,
    removePartner,
  } = usePartnerManagement({
    userId: user?.id || '',
  });

  const handleAddPartner = async (partnerId: string) => {
    await addPartner(partnerId);
    await refreshProfile();
  };

  const handleRemovePartner = async (partnerId: string) => {
    await removePartner(partnerId);
    await refreshProfile();
  };

  // Sync reminder time from profile
  useEffect(() => {
    if (profile?.reminder_time) {
      const [hours = '00', minutes = '00'] = profile.reminder_time.split(':');
      setReminderTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }
  }, [profile]);

  const handleTimeChange = (value: string) => {
    setReminderTime(value);

    // Clear error if input is empty
    if (!value) {
      setTimeError(null);
      return;
    }

    // Show error if time isn't in 15-minute intervals
    if (!isValidTimeFormat(value)) {
      setTimeError('Time should be in 15-minute intervals (e.g., 09:00, 09:15, 09:30, 09:45)');
    } else {
      setTimeError(null);
    }
  };

  const handleSaveReminderTime = async () => {
    if (!user?.id || !reminderTime || timeError) return;

    setIsSaving(true);
    try {
      // Handle notifications subscription
      if (!isSubscribed) {
        const subscribeSuccess = await subscribe();
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
        .eq('id', user.id);

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
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('scheduled_time', now.startOf('day').toUTC().toISO())
        .lte('scheduled_time', now.endOf('day').toUTC().toISO());

      await Promise.all([refreshProfile(), refreshPills()]);
      toggle();
    } catch (error) {
      console.error('Error saving reminder time:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 100,
      }}
    >
      <Header />

      <Stack mt="xl" style={{ flex: 1 }}>
        {(pillError || partnerError) && (
          <Text size="sm" c="red">
            {pillError || partnerError}
          </Text>
        )}

        {/* Today Tab */}
        {activeTab === 'today' && (
          <TodayView
            pill={todayPills[0] || null}
            reminderTime={profile?.reminder_time ?? null}
            streak={streak}
            onMarkTaken={(pillId) => markPillStatus(pillId, 'taken')}
            onEditReminder={toggle}
          />
        )}

        {/* Edit Reminder Modal */}
        <Modal opened={opened} onClose={toggle} title="Edit Reminder Time" centered radius="lg">
          <Stack align="center" gap="lg">
            <TimePicker
              value={reminderTime}
              onChange={handleTimeChange}
              format="24h"
              minutesStep={15}
              error={timeError}
            />
            <Button
              onClick={handleSaveReminderTime}
              color="black"
              loading={isSaving}
              disabled={!reminderTime || !!timeError}
              fullWidth
            >
              Save
            </Button>
          </Stack>
        </Modal>

        {/* History Tab */}
        {activeTab === 'history' && (
          <Stack gap="lg">
            <ComplianceStats pills={allPills} />
            <CalendarHistory pillsByDate={pillsByDate} />
          </Stack>
        )}

        {/* Partner Tab */}
        {activeTab === 'partner' && (
          <Stack>
            <Title order={2}>Partner</Title>
            <PartnerManagement
              activePartner={activePartner}
              availablePartners={availablePartners}
              onAddPartner={handleAddPartner}
              onRemovePartner={handleRemovePartner}
            />
          </Stack>
        )}
      </Stack>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </Container>
  );
}
