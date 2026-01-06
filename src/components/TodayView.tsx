import { Stack, Text, Paper, Group, Box, UnstyledButton, ActionIcon, Title } from '@mantine/core';
import { IconCheck, IconFlame, IconEdit } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { PillTrackingRow } from '../types';

interface TodayViewProps {
  pill: PillTrackingRow | null;
  streak: number;
  onMarkTaken: (pillId: string) => Promise<void>;
  onEditReminder: () => void;
}

export function TodayView({ pill, streak, onMarkTaken, onEditReminder }: TodayViewProps) {
  const today = DateTime.now();
  const dateString = today.toFormat('EEEE, MMM d');

  const status = pill?.status ?? 'pending';
  const isTaken = status === 'taken' || status === 'late_taken';
  const canMarkTaken = !isTaken;

  const scheduledTime = pill ? DateTime.fromISO(pill.scheduled_time).toFormat('HH:mm') : '--:--';
  const takenTime = pill?.taken_at ? DateTime.fromISO(pill.taken_at).toFormat('HH:mm') : null;

  const handleMarkTaken = () => {
    if (pill && canMarkTaken) {
      onMarkTaken(pill.id);
    }
  };

  return (
    <Stack gap="lg" align="center" style={{ flex: 1 }} justify="center">
      {/* Date */}
      <Title order={1} ta="center">
        {dateString}
      </Title>

      {/* Streak Badge */}
      {streak  > 0 && (
        <Paper
          px="md"
          py="xs"
          radius="xl"
          shadow="xs"
          style={{ backgroundColor: '#fff', border: '1px solid #f0f0f0' }}
        >
          <Group gap="xs">
            <IconFlame size={18} color="#f97316" fill="#f97316" />
            <Text size="sm" fw={500}>
              {streak} Day Streak
            </Text>
          </Group>
        </Paper>
      )}

      {/* Main Button */}
      <Box py="xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <UnstyledButton
          onClick={handleMarkTaken}
          disabled={!canMarkTaken}
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            backgroundColor: isTaken ? '#34D399' : '#fff',
            border: isTaken ? 'none' : '4px solid #f0f0f0',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: canMarkTaken ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
          }}
        >
          <IconCheck size={40} stroke={2} color={isTaken ? '#fff' : '#000'} />
          <Text size="xl" fw={700} c={isTaken ? 'white' : 'black'}>
            {isTaken ? 'Taken!' : 'Mark'}
          </Text>
          {!isTaken && (
            <Text size="xl" fw={700} c="black">
              Taken
            </Text>
          )}
          {isTaken && takenTime && (
            <Text size="sm" c="white" style={{ opacity: 0.9 }}>
              at {takenTime}
            </Text>
          )}
        </UnstyledButton>
      </Box>

      {/* Scheduled Time Card */}
      <Paper
        p="md"
        radius="lg"
        shadow="sm"
        style={{
          backgroundColor: '#fff',
          border: '1px solid #f0f0f0',
          width: '100%',
          maxWidth: 250,
        }}
      >
        <Group justify="space-evenly" align="center">
          <Stack gap={2}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
              Scheduled
            </Text>
            <Text size="xl" fw={700}>
              {scheduledTime}
            </Text>
          </Stack>

          <Box style={{ width: 1, height: 40, backgroundColor: '#f0f0f0' }} />

          <Stack gap={4} align="center">
            <ActionIcon variant="light" color="dark" radius="xl" size="lg" onClick={onEditReminder}>
              <IconEdit size={18} />
            </ActionIcon>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Edit
            </Text>
          </Stack>
        </Group>
      </Paper>
    </Stack>
  );
}
