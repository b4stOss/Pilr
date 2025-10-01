// src/pages/HomePage.tsx
import { Container, Flex, Button, Title, Collapse, Text, Stack, Tabs } from '@mantine/core';
import { useEffect, useState } from 'react';
import { TimeInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
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

  // Then check if minutes are divisible by 5
  const minutes = parseInt(time.split(':')[1]);
  return minutes % 5 === 0;
}

export function HomePage() {
  const { user, pillTakerProfile, hasPushSubscription, refreshProfile } = useAuth();
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
    if (pillTakerProfile?.reminder_time) {
      const [hours = '00', minutes = '00'] = pillTakerProfile.reminder_time.split(':');
      setReminderTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }
  }, [pillTakerProfile]);

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
      setTimeError('Time should be in 5-minute intervals (e.g., 09:00, 09:05, 09:10)');
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
      const nowIso = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('pill_takers')
        .upsert({
          user_id: user.id,
          reminder_time: reminderTime,
          timezone,
          active: true,
          updated_at: nowIso,
        });

      if (updateError) throw updateError;

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
        {(notificationError || pillError || partnerError) && <Text size="sm">{notificationError || pillError || partnerError}</Text>}

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
              <TimeInput value={reminderTime} step={300} onChange={handleTimeChange} withSeconds={false} error={timeError} />
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
