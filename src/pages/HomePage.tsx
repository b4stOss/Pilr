// src/pages/HomePage.tsx
import { useState } from 'react';
import { Container, Button, Text, Stack, Modal, Paper, Group, Avatar, Box } from '@mantine/core';
import { TimePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconUserMinus } from '@tabler/icons-react';
import Header from '../components/HeaderComponent';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { usePillTracking } from '../hooks/usePillTracking';
import { usePartnerManagement } from '../hooks/usePartnerManagement';
import { useReminderTime } from '../hooks/useReminderTime';
import { TodayView } from '../components/TodayView';
import { CalendarHistory } from '../components/CalendarHistory';
import { ComplianceStats } from '../components/ComplianceStats';
import { InviteCodeCard } from '../components/InviteCodeCard';
import { BottomNav } from '../components/BottomNav';
import { getDisplayName } from '../utils';

export function HomePage() {
  const { user, profile, hasPushSubscription, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'partner'>('today');
  const [opened, { toggle }] = useDisclosure(false);

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
    markTodayAsTaken,
    refreshPills,
  } = usePillTracking({
    userId: user?.id || '',
  });

  const {
    activePartner,
    error: partnerError,
    removePartner,
  } = usePartnerManagement({
    userId: user?.id || '',
  });

  const {
    reminderTime,
    timeError,
    isSaving,
    handleTimeChange,
    handleSave: saveReminderTime,
  } = useReminderTime({
    userId: user?.id,
    initialTime: profile?.reminder_time ?? null,
    isSubscribed,
    onSubscribe: subscribe,
    onSuccess: async () => {
      await Promise.all([refreshProfile(), refreshPills()]);
      toggle();
    },
  });

  const handleRemovePartner = async () => {
    await removePartner();
    await refreshProfile();
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
            onMarkTaken={() => markTodayAsTaken(profile?.reminder_time ?? '')}
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
              onClick={saveReminderTime}
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
            <CalendarHistory pillsByDate={pillsByDate} />
            <ComplianceStats pills={allPills} />
          </Stack>
        )}

        {/* Partner Tab */}
        {activeTab === 'partner' && (
          <Stack gap="md">
            {activePartner ? (
              // Partner is linked - show info + unlink button
              <Paper p="lg" radius="lg" shadow="sm" bg="white">
                <Stack gap="md">
                  <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                    Connected Partner
                  </Text>

                  <Group>
                    <Avatar size={48} radius="xl" color="blue">
                      {getDisplayName(activePartner, 'Partner').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Text size="md" fw={600}>
                        {getDisplayName(activePartner, 'Partner')}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {activePartner.email}
                      </Text>
                    </Box>
                  </Group>

                  <Button
                    variant="light"
                    color="red"
                    leftSection={<IconUserMinus size={18} />}
                    onClick={handleRemovePartner}
                    fullWidth
                  >
                    Unlink Partner
                  </Button>
                </Stack>
              </Paper>
            ) : (
              // No partner - show invite code card
              <InviteCodeCard
                userId={user?.id || ''}
                firstName={profile?.first_name ?? null}
                onFirstNameSaved={refreshProfile}
              />
            )}
          </Stack>
        )}
      </Stack>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </Container>
  );
}
