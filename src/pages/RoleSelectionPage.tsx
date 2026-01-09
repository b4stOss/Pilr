// src/pages/RoleSelectionPage.tsx
import { Box, Center, Title, Text, Stack, Paper, Group, ThemeIcon, UnstyledButton } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPill, IconHeart, IconChevronRight } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { AppRole } from '../types';

export function RoleSelectionPage() {
  const { user } = useAuth();
  const { setRole, data: onboardingData } = useOnboarding();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(onboardingData.role);

  const handleRoleSelection = (role: AppRole) => {
    if (!user) return;

    setSelectedRole(role);
    setRole(role);

    // Navigate to next step based on role
    navigate(role === 'pill_taker' ? '/setup-reminder' : '/notifications');
  };

  return (
    <Center style={{ height: '100%', padding: '24px' }}>
      <Stack align="center" gap="xl" style={{ maxWidth: 400, width: '100%' }}>
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
          <IconHeart size={40} stroke={1.5} />
        </Box>

        {/* Header */}
        <Stack align="center" gap="xs">
          <Title order={2} ta="center">Welcome to Pilr</Title>
          <Text size="md" c="dimmed" ta="center">
            Choose how you'll use the app. You can always change this later.
          </Text>
        </Stack>

        {/* Role Cards */}
        <Stack gap="md" w="100%">
          {/* Pill Taker Card */}
          <UnstyledButton
            onClick={() => handleRoleSelection('pill_taker')}
            style={{ width: '100%' }}
          >
            <Paper
              p="lg"
              radius="lg"
              shadow="sm"
              style={{
                backgroundColor: '#fff',
                border: selectedRole === 'pill_taker' ? '2px solid #000' : '1px solid #f0f0f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="md" wrap="nowrap">
                  <ThemeIcon size={48} radius="xl" color="dark" variant="light">
                    <IconPill size={24} />
                  </ThemeIcon>
                  <Box>
                    <Text size="md" fw={600}>I take the pill</Text>
                    <Text size="sm" c="dimmed">
                      Get daily reminders and track your doses
                    </Text>
                  </Box>
                </Group>
                <IconChevronRight size={20} color="#aaa" />
              </Group>
            </Paper>
          </UnstyledButton>

          {/* Partner Card */}
          <UnstyledButton
            onClick={() => handleRoleSelection('partner')}
            style={{ width: '100%' }}
          >
            <Paper
              p="lg"
              radius="lg"
              shadow="sm"
              style={{
                backgroundColor: '#fff',
                border: selectedRole === 'partner' ? '2px solid #000' : '1px solid #f0f0f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="md" wrap="nowrap">
                  <ThemeIcon size={48} radius="xl" color="red" variant="light">
                    <IconHeart size={24} />
                  </ThemeIcon>
                  <Box>
                    <Text size="md" fw={600}>I'm a supportive partner</Text>
                    <Text size="sm" c="dimmed">
                      Get notified if your partner forgets
                    </Text>
                  </Box>
                </Group>
                <IconChevronRight size={20} color="#aaa" />
              </Group>
            </Paper>
          </UnstyledButton>
        </Stack>

        <Text size="xs" c="dimmed" ta="center">
          Your choice helps us personalize your experience.
        </Text>
      </Stack>
    </Center>
  );
}
