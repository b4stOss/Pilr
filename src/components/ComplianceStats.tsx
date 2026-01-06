import { Paper, Text, Group, Progress, SimpleGrid, Stack, Box } from '@mantine/core';
import { PillTrackingRow } from '../types';
import { DateTime } from 'luxon';

interface ComplianceStatsProps {
  pills: PillTrackingRow[];
}

export function ComplianceStats({ pills }: ComplianceStatsProps) {
  const todayEnd = DateTime.now().endOf('day');

  // Calculate stats from pills
  const stats = pills.reduce(
    (acc, pill) => {
      const pillDate = DateTime.fromISO(pill.scheduled_time);
      const isFuture = pillDate > todayEnd;

      if (isFuture || pill.status === 'pending') {
        acc.future++;
      } else if (pill.status === 'taken' || pill.status === 'late_taken') {
        acc.taken++;
      } else if (pill.status === 'missed') {
        acc.missed++;
      }
      return acc;
    },
    { taken: 0, missed: 0, future: 0 },
  );

  const totalPast = stats.taken + stats.missed;
  const compliancePercentage = totalPast > 0 ? Math.round((stats.taken / totalPast) * 100) : 100;

  return (
    <Paper p="lg" radius="lg" shadow="md" style={{ backgroundColor: '#fff' }}>
      <Stack gap="md">
        {/* Percentage Header */}
        <Group justify="space-between" align="center">
          <Text size="lg" fw={600}>
            Compliance
          </Text>
          <Text size="xl" fw={700} c="pill-green.4">
            {compliancePercentage}%
          </Text>
        </Group>

        {/* Progress Bar */}
        <Progress value={compliancePercentage} size="lg" radius="xl" color="pill-green.4" />

        {/* Stats Grid */}
        <SimpleGrid cols={3} spacing="xs">
          <StatBox label="Taken" value={stats.taken} color="#34D399" />
          <StatBox label="Missed" value={stats.missed} color="#F87171" />
          <StatBox label="Scheduled" value={stats.future} color="#9CA3AF" />
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
