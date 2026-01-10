import { Button, Center, Title, Text, Stack, Paper, Group, ThemeIcon, Box, ActionIcon } from '@mantine/core';
import { TimePicker } from '@mantine/dates';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBellRinging, IconHeart, IconClock, IconArrowLeft } from '@tabler/icons-react';
import { useOnboarding } from '../contexts/OnboardingContext';

/**
 * Validates time format: HH:mm with 15-minute intervals (for cron sync)
 */
function isValidReminderTime(time: string | null): boolean {
  if (!time) return false;
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return false;
  }
  const minutes = parseInt(time.split(':')[1]);
  return minutes % 15 === 0;
}

export function ReminderSetupPage() {
  const navigate = useNavigate();
  const { data: onboardingData, setReminderTime } = useOnboarding();

  const timeError = useMemo(() => {
    if (!onboardingData.reminderTime) return null;
    if (!isValidReminderTime(onboardingData.reminderTime)) {
      return 'Time must be in 15-minute intervals (e.g., 09:00, 09:15, 09:30, 09:45)';
    }
    return null;
  }, [onboardingData.reminderTime]);

  const canContinue = onboardingData.reminderTime && !timeError;

  useEffect(() => {
    // Flow validation: ensure previous onboarding steps are completed
    // Auth is already handled by RouterGuard
    if (!onboardingData.role) {
      navigate('/role', { replace: true });
      return;
    }
    // Partners don't need this step
    if (onboardingData.role !== 'pill_taker') {
      navigate('/notifications', { replace: true });
    }
  }, [onboardingData.role, navigate]);

  const handleContinue = () => {
    if (!canContinue) return;
    navigate('/notifications');
  };

  // Show nothing while redirecting (flow validation)
  if (onboardingData.role !== 'pill_taker') {
    return null;
  }

  return (
    <Center style={{ height: '100%', padding: '24px' }}>
      <Stack align="center" gap="xl" style={{ maxWidth: 400, width: '100%' }}>
        {/* Back button */}
        <Box style={{ alignSelf: 'flex-start' }}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={() => navigate('/role')}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
        </Box>

        {/* Header */}
        <Stack align="center" gap="xs">
          <Title order={2} ta="center">Set Your Daily Reminder</Title>
          <Text size="md" c="dimmed" ta="center">
            Choose when you usually take your pill. We'll help you stay on track.
          </Text>
        </Stack>

        {/* Time Picker */}
        <Paper p="xl" radius="lg" shadow="sm" bg="white" w="100%">
          <Stack align="center" gap="md">
            <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
              Reminder Time
            </Text>
            <TimePicker
              value={onboardingData.reminderTime ?? undefined}
              onChange={(value) => setReminderTime(value ?? '')}
              format="24h"
              minutesStep={15}
              size="lg"
              error={timeError}
            />
          </Stack>
        </Paper>

        {/* How it works */}
        <Paper p="lg" radius="lg" bg="gray.0" w="100%">
          <Stack gap="md">
            <Text size="sm" fw={700} c="dark">
              How it works
            </Text>

            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon size="md" radius="xl" color="dark" variant="light">
                <IconClock size={14} />
              </ThemeIcon>
              <Box>
                <Text size="sm" fw={500}>Daily notification</Text>
                <Text size="xs" c="dimmed">
                  You'll receive a reminder at your chosen time every day.
                </Text>
              </Box>
            </Group>

            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon size="md" radius="xl" color="orange" variant="light">
                <IconBellRinging size={14} />
              </ThemeIcon>
              <Box>
                <Text size="sm" fw={500}>Gentle follow-ups</Text>
                <Text size="xs" c="dimmed">
                  If you haven't confirmed, we'll send gentle reminders at +15, +30, and +60 minutes.
                </Text>
              </Box>
            </Group>

            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon size="md" radius="xl" color="red" variant="light">
                <IconHeart size={14} />
              </ThemeIcon>
              <Box>
                <Text size="sm" fw={500}>Partner alert</Text>
                <Text size="xs" c="dimmed">
                  After 90 minutes without confirmation, your partner will be notified (if linked).
                </Text>
              </Box>
            </Group>
          </Stack>
        </Paper>

        {/* CTA */}
        <Button
          color="dark"
          size="lg"
          onClick={handleContinue}
          disabled={!canContinue}
          fullWidth
        >
          Continue
        </Button>
      </Stack>
    </Center>
  );
}
