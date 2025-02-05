// src/pages/HomePage.tsx
import { Container, Flex, Button, Title, Collapse, Text, Stack, Tabs } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/HeaderComponent';
import { useEffect, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useNotifications } from '../hooks/useNotifications';
import { usePillTracking } from '../hooks/usePillTracking';
import { PillList } from '../components/PillList';
import { PillHistory } from '../components/PillHistory';
import { localToUtcTime, utcToLocalTime } from '../lib/push';
import { supabase } from '../lib/supabase';
import { usePartnerManagement } from '../hooks/usePartnerManagement';
import { PartnerManagement } from '../components/PartnerManagement';
import { TimeInput } from '@mantine/dates';

function isValidTimeFormat(time: string): boolean {
  // First check if it's a valid time
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return false;
  }

  // Then check if minutes are divisible by 5
  const minutes = parseInt(time.split(':')[1]);
  return minutes % 5 === 0;
}

export function HomePage() {
  const { user } = useAuth();
  const [reminderTime, setReminderTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [opened, { toggle }] = useDisclosure(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  const {
    isSubscribed,
    subscribe,
    error: notificationError,
  } = useNotifications({
    userId: user?.id || '',
    userRole: 'user',
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

  // Fetch initial reminder time
  useEffect(() => {
    const fetchReminderTime = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase.from('user_preferences').select('reminder_time').eq('user_id', user.id).single();

        if (error) throw error;

        if (data?.reminder_time) {
          // Convert UTC time to local time for the input
          const localTime = utcToLocalTime(data.reminder_time);
          setReminderTime(localTime);
        }
      } catch (error) {
        console.error('Error fetching reminder time:', error);
      }
    };

    fetchReminderTime();
  }, [user]);

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value;
    setReminderTime(newTime);

    // Clear error if input is empty (allowing user to type)
    if (!newTime) {
      setTimeError(null);
      return;
    }

    // Show error if time isn't in 5-minute intervals
    if (!isValidTimeFormat(newTime)) {
      setTimeError('Please choose a time in 5-minute intervals (e.g., 09:00, 09:05, 09:10)');
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

      // Save reminder time preference
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({ reminder_time: localToUtcTime(reminderTime) })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Find any existing pending pills
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingPills } = await supabase
        .from('pill_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('scheduled_time', today.toISOString()) // Look from today onwards
        .order('scheduled_time') // Order by time
        .limit(1); // Get the next pending pill

      // Set up new scheduled time
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const scheduledTime = new Date(today);
      scheduledTime.setHours(hours, minutes, 0, 0);

      if (scheduledTime < new Date()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      if (existingPills && existingPills.length > 0) {
        // Update existing pill
        const { error: pillError } = await supabase
          .from('pill_tracking')
          .update({
            scheduled_time: scheduledTime.toISOString(),
            next_notification_time: scheduledTime.toISOString(),
            notification_count: 0, // Reset notification count
          })
          .eq('id', existingPills[0].id);

        if (pillError) throw pillError;
      } else {
        // Create new pill entry
        const { error: pillError } = await supabase.from('pill_tracking').insert({
          user_id: user.id,
          scheduled_time: scheduledTime.toISOString(),
          status: 'pending',
          notification_count: 0,
          next_notification_time: scheduledTime.toISOString(),
        });

        if (pillError) throw pillError;
      }

      await refreshPills();
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
        {(notificationError || pillError || partnerError) && <Text size="sm">{notificationError || pillError || partnerError}</Text>}

        <PartnerManagement
          activePartner={activePartner}
          availablePartners={availablePartners}
          onAddPartner={addPartner}
          onRemovePartner={removePartner}
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
              <TimeInput
                value={reminderTime}
                step={1800}
                onChange={(event) => setReminderTime(event.target.value)}
                withSeconds={false}
                error={timeError}
              />
              {/* <NativeSelect
                value={reminderTime}
                size="md"
                color="black"
                onChange={(event) => setReminderTime(event.currentTarget.value || '')}
                data={timeOptions}
              /> */}
              {/* <Select
                value={reminderTime}
                onChange={(value) => setReminderTime(value || '')}
                data={timeOptions}
                searchable
                placeholder="Select time"
              /> */}
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
