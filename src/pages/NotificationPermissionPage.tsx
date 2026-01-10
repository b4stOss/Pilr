import { Button, Center, Title, Text, Stack, Paper, Group, ThemeIcon, Box, ActionIcon } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell, IconShieldCheck, IconDeviceMobile, IconArrowLeft } from '@tabler/icons-react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';

export function NotificationPermissionPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { data: onboardingData, completeOnboarding } = useOnboarding();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getSubscription } = useNotifications({
    userId: user?.id || '',
    isInitiallySubscribed: false,
  });

  useEffect(() => {
    // Flow validation: ensure previous onboarding steps are completed
    // Auth is already handled by RouterGuard
    if (!onboardingData.role) {
      navigate('/role', { replace: true });
      return;
    }
    if (onboardingData.role === 'pill_taker' && !onboardingData.reminderTime) {
      navigate('/setup-reminder', { replace: true });
    }
  }, [onboardingData.role, onboardingData.reminderTime, navigate]);

  const handleEnableNotifications = async () => {
    if (!user) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Get the push subscription
      const subscription = await getSubscription();
      if (!subscription) {
        setError('Failed to enable notifications. Please try again.');
        return;
      }

      // Complete onboarding with all data
      const success = await completeOnboarding(user.id, subscription);
      if (success) {
        await refreshProfile();
        navigate(onboardingData.role === 'partner' ? '/partner' : '/home');
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show nothing while redirecting (flow validation)
  if (!onboardingData.role) {
    return null;
  }

  const isPillTaker = onboardingData.role === 'pill_taker';

  // Back destination depends on role
  const backPath = isPillTaker ? '/setup-reminder' : '/role';

  return (
    <Center style={{ height: '100%', padding: '24px' }}>
      <Stack align="center" gap="xl" style={{ maxWidth: 400, width: '100%' }}>
        {/* Back button */}
        <Box style={{ alignSelf: 'flex-start' }}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={() => navigate(backPath)}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
        </Box>

        {/* Icon */}
        <Box
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconBell size={40} stroke={1.5} />
        </Box>

        {/* Header */}
        <Stack align="center" gap="xs">
          <Title order={2} ta="center">Enable Notifications</Title>
          <Text size="md" c="dimmed" ta="center">
            {isPillTaker
              ? "Stay on track with timely reminders. We'll only notify you when it matters."
              : "Get notified when your partner needs support."}
          </Text>
        </Stack>

        {/* Benefits */}
        <Paper p="lg" radius="lg" bg="gray.0" w="100%">
          <Stack gap="md">
            <Text size="sm" fw={700} c="dark">
              Why notifications?
            </Text>

            {isPillTaker ? (
              <>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <ThemeIcon size="md" radius="xl" color="dark" variant="light">
                    <IconBell size={14} />
                  </ThemeIcon>
                  <Box>
                    <Text size="sm" fw={500}>Never miss a dose</Text>
                    <Text size="xs" c="dimmed">
                      Receive your daily reminder right on time.
                    </Text>
                  </Box>
                </Group>

                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <ThemeIcon size="md" radius="xl" color="dark" variant="light">
                    <IconDeviceMobile size={14} />
                  </ThemeIcon>
                  <Box>
                    <Text size="sm" fw={500}>Works everywhere</Text>
                    <Text size="xs" c="dimmed">
                      Get notified even when the app is closed.
                    </Text>
                  </Box>
                </Group>
              </>
            ) : (
              <>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <ThemeIcon size="md" radius="xl" color="red" variant="light">
                    <IconBell size={14} />
                  </ThemeIcon>
                  <Box>
                    <Text size="sm" fw={500}>Late alerts</Text>
                    <Text size="xs" c="dimmed">
                      Get notified if your partner hasn't confirmed their pill after 90 minutes.
                    </Text>
                  </Box>
                </Group>

                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <ThemeIcon size="md" radius="xl" color="dark" variant="light">
                    <IconDeviceMobile size={14} />
                  </ThemeIcon>
                  <Box>
                    <Text size="sm" fw={500}>Works everywhere</Text>
                    <Text size="xs" c="dimmed">
                      Get notified even when the app is closed.
                    </Text>
                  </Box>
                </Group>
              </>
            )}

            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon size="md" radius="xl" color="green" variant="light">
                <IconShieldCheck size={14} />
              </ThemeIcon>
              <Box>
                <Text size="sm" fw={500}>Private & secure</Text>
                <Text size="xs" c="dimmed">
                  Notifications are sent directly to your device. No data shared.
                </Text>
              </Box>
            </Group>
          </Stack>
        </Paper>

        {error && (
          <Text size="sm" c="red" ta="center">
            {error}
          </Text>
        )}

        {/* CTA */}
        <Button
          color="dark"
          size="lg"
          onClick={handleEnableNotifications}
          loading={isProcessing}
          fullWidth
          leftSection={<IconBell size={20} />}
        >
          Enable Notifications
        </Button>

        <Text size="xs" c="dimmed" ta="center">
          You can change this later in your device settings.
        </Text>
      </Stack>
    </Center>
  );
}
