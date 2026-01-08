import { Paper, Text, Group, Box, ThemeIcon } from '@mantine/core';
import { IconCheck, IconClock, IconX, IconAlertTriangle } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { PillTrackingRow } from '../types';

interface TodayStatusCardProps {
  pills: PillTrackingRow[];
  name: string;
}

type AggregatedStatus = 'taken' | 'pending' | 'missed' | 'late_taken' | 'no_pills';

interface StatusConfig {
  icon: typeof IconCheck;
  color: string;
  bgColor: string;
  label: string;
}

const STATUS_CONFIG: Record<AggregatedStatus, StatusConfig> = {
  taken: {
    icon: IconCheck,
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    label: 'Pill taken',
  },
  late_taken: {
    icon: IconAlertTriangle,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    label: 'Taken late',
  },
  pending: {
    icon: IconClock,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    label: 'Pending',
  },
  missed: {
    icon: IconX,
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    label: 'Missed',
  },
  no_pills: {
    icon: IconClock,
    color: '#9CA3AF',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    label: 'No pills scheduled',
  },
};

function getAggregatedStatus(pills: PillTrackingRow[]): AggregatedStatus {
  if (pills.length === 0) return 'no_pills';

  const statuses = pills.map((p) => p.status);

  // Priority: missed > pending > late_taken > taken
  if (statuses.some((s) => s === 'missed')) return 'missed';
  if (statuses.some((s) => s === 'pending')) return 'pending';
  if (statuses.some((s) => s === 'late_taken')) return 'late_taken';
  if (statuses.every((s) => s === 'taken')) return 'taken';

  return 'pending';
}

function getTimeLabel(pills: PillTrackingRow[], status: AggregatedStatus): string {
  if (pills.length === 0) return '';

  if (status === 'taken' || status === 'late_taken') {
    // Find the taken pill and show taken_at time
    const takenPill = pills.find((p) => p.status === 'taken' || p.status === 'late_taken');
    if (takenPill?.taken_at) {
      return `Today at ${DateTime.fromISO(takenPill.taken_at).toFormat('HH:mm')}`;
    }
  }

  if (status === 'pending') {
    // Find the pending pill and show scheduled time
    const pendingPill = pills.find((p) => p.status === 'pending');
    if (pendingPill) {
      return `Scheduled for ${DateTime.fromISO(pendingPill.scheduled_time).toFormat('HH:mm')}`;
    }
  }

  if (status === 'missed') {
    const missedPill = pills.find((p) => p.status === 'missed');
    if (missedPill) {
      return `Was scheduled for ${DateTime.fromISO(missedPill.scheduled_time).toFormat('HH:mm')}`;
    }
  }

  return '';
}

export function TodayStatusCard({ pills, name }: TodayStatusCardProps) {
  const status = getAggregatedStatus(pills);
  const config = STATUS_CONFIG[status];
  const timeLabel = getTimeLabel(pills, status);
  const Icon = config.icon;

  return (
    <Paper
      p="lg"
      radius="lg"
      shadow="sm"
      style={{
        backgroundColor: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box style={{ position: 'relative', zIndex: 1 }}>
        <Text size="lg" fw={600} mb={8} c="dark">
          {name}'s Pill Today
        </Text>

        <Group gap="md" align="center">
          <ThemeIcon
            size={48}
            radius="xl"
            style={{
              backgroundColor: config.bgColor,
              color: config.color,
            }}
          >
            <Icon size={24} stroke={2.5} />
          </ThemeIcon>

          <Box>
            <Text size="md" fw={500} lh={1.2}>
              {config.label}
            </Text>
            {timeLabel && (
              <Text size="sm" c="dimmed" mt={2}>
                {timeLabel}
              </Text>
            )}
          </Box>
        </Group>
      </Box>
    </Paper>
  );
}
