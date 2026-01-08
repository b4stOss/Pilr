import { Group, UnstyledButton, Text, Box, Stack } from '@mantine/core';
import { IconCalendarEvent, IconHistory, IconHeart } from '@tabler/icons-react';

interface BottomNavProps {
  activeTab: 'today' | 'history' | 'partner';
  onTabChange: (tab: 'today' | 'history' | 'partner') => void;
}

const tabs = [
  { id: 'today', label: 'Today', icon: IconCalendarEvent },
  { id: 'history', label: 'History', icon: IconHistory },
  { id: 'partner', label: 'Partner', icon: IconHeart },
] as const;

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
      }}
    >
      <Group
        gap={4}
        p={6}
        wrap="nowrap"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 'var(--mantine-radius-xl)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <UnstyledButton
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              px="md"
              py="xs"
              style={{
                borderRadius: 'var(--mantine-radius-lg)',
                backgroundColor: isActive ? '#000' : 'transparent',
                color: isActive ? '#fff' : '#666',
                transition: 'all 0.2s ease',
              }}
            >
              <Stack gap={5} align="center">
                <Icon size={20} stroke={2} />
                <Text size="xs" fw={500}>
                  {tab.label}
                </Text>
              </Stack>
            </UnstyledButton>
          );
        })}
      </Group>
    </Box>
  );
}
