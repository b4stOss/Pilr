// src/pages/HomePage.tsx
import { Container, Flex, Button, Title, Collapse, Text, Stack, Tabs } from '@mantine/core';
import { useEffect, useState } from 'react';
import { TimePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { DateTime } from 'luxon';
import Header from '../components/HeaderComponent';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { usePillTracking } from '../hooks/usePillTracking';
import { usePartnerManagement } from '../hooks/usePartnerManagement';
import { PillList } from '../components/PillList';
import { PillHistory } from '../components/PillHistory';
import { PartnerManagement } from '../components/PartnerManagement';
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
  const [reminderTime, setReminderTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [opened, { toggle }] = useDisclosure(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  const {
    isSubscribed,
    subscribe,
  } = useNotifications({
    userId: user?.id || '',
    isInitiallySubscribed: hasPushSubscription,
  });

  const {
    todayPills,
    historyPills,
    error: pillError,
    markPillStatus,
    refreshPills,
  } = usePillTracking({
    userId: user?.id || '',
    daysToFetch: 7,
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

  // Generate time options every 30 minutes
  // const timeOptions = Array.from({ length: 48 }, (_, i) => {
  //   const hour = Math.floor(i / 2)
  //     .toString()
  //     .padStart(2, '0');
  //   const minute = i % 2 === 0 ? '00' : '30';
  //   return {
  //     value: `${hour}:${minute}`,
  //     label: `${hour}:${minute}`,
  //   };
  // });

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
    <Container style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Stack mt="xl" style={{ flex: 1 }}>
        {(pillError || partnerError) && <Text size="sm" c="red">{pillError || partnerError}</Text>}

        <PartnerManagement
          activePartner={activePartner}
          availablePartners={availablePartners}
          onAddPartner={handleAddPartner}
          onRemovePartner={handleRemovePartner}
        />

        <Tabs defaultValue="today" color="black">
          <Tabs.List grow>
            <Tabs.Tab value="today">Today</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="today" pt="md">
            <Stack>
              <Title order={2}>Today's Pills</Title>
              <PillList pills={todayPills} onStatusChange={markPillStatus} />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="md">
            <Stack>
              <Title order={2}>Past 7 Days</Title>
              <PillHistory pills={historyPills} />
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Flex justify="center" direction="column" gap="md" mt="auto" pb="md">
          <Button color="black" onClick={toggle} variant="outline" radius="xl">
            Edit reminder
          </Button>

          <Collapse in={opened}>
            <Stack align="center">
              <TimePicker
                value={reminderTime}
                onChange={handleTimeChange}
                format="24h"
                minutesStep={15}
                error={timeError}
              />
              <Button onClick={handleSaveReminderTime} color="black" loading={isSaving} disabled={!reminderTime || !!timeError}>
                Save
              </Button>
            </Stack>
          </Collapse>
        </Flex>
      </Stack>
    </Container>
  );
}
