import { Paper, Text, Group, Progress, SimpleGrid, Stack, Box } from '@mantine/core';
import { PillTrackingRow } from '../types';
import { DateTime } from 'luxon';

interface ComplianceStatsProps {
  pills: PillTrackingRow[];
}

export function ComplianceStats({ pills }: ComplianceStatsProps) {
  const now = DateTime.now();
  const monthStart = now.startOf('month');
  const todayEnd = now.endOf('day');

  // Filter pills for current month only
  const currentMonthPills = pills.filter((pill) => {
    const pillDate = DateTime.fromISO(pill.scheduled_time);
    return pillDate >= monthStart && pillDate <= todayEnd;
  });

  // Calculate stats from pills
  const stats = currentMonthPills.reduce(
    (acc, pill) => {
      const pillDate = DateTime.fromISO(pill.scheduled_time);
      const isFuture = pillDate > todayEnd;

      if (isFuture || pill.status === 'pending') {
        // Don't count future/pending pills
      } else if (pill.status === 'taken') {
        acc.taken++;
      } else if (pill.status === 'late_taken') {
        acc.late++;
      } else if (pill.status === 'missed') {
        acc.missed++;
      }
      return acc;
    },
    { taken: 0, late: 0, missed: 0 },
  );

  const totalPast = stats.taken + stats.late + stats.missed;
  const compliancePercentage = totalPast > 0 ? Math.round(((stats.taken + stats.late) / totalPast) * 100) : 100;

  return (
    <Paper p="lg" radius="lg" shadow="md" style={{ backgroundColor: '#fff' }}>
      <Stack gap="md">
        {/* Percentage Header */}
        <Group justify="space-between" align="center">
          <Stack gap={0}>
            <Text size="lg" fw={600}>
              Compliance
            </Text>
            <Text size="xs" c="dimmed">
              This month
            </Text>
          </Stack>
          <Text size="xl" fw={700} c="pill-green.4">
            {compliancePercentage}%
          </Text>
        </Group>

        {/* Progress Bar */}
        <Progress value={compliancePercentage} size="lg" radius="xl" color="pill-green.4" />

        {/* Stats Grid */}
        <SimpleGrid cols={3} spacing="xs">
          <StatBox label="On Time" value={stats.taken} color="#34D399" />
          <StatBox label="Late" value={stats.late} color="#FBBF24" />
          <StatBox label="Missed" value={stats.missed} color="#F87171" />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box
      p="sm"
      style={{
        backgroundColor: `${color}15`,
        borderRadius: 'var(--mantine-radius-md)',
        textAlign: 'center',
      }}
    >
      <Box
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
          margin: '0 auto 8px',
        }}
      />
      <Text size="xs" fw={600} c="dark">
        {label}
      </Text>
      <Text size="xs" c="dimmed">
        {value} Days
      </Text>
    </Box>
  );
}
