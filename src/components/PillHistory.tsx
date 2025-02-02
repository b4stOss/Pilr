import { Stack, Flex, Text } from '@mantine/core';
import { PillTracking } from '../types';
import { StatusBadge } from './PillList';

export function PillHistory({ pills }: { pills: PillTracking[] }) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group pills by date
  const pillsByDate = pills.reduce(
    (acc, pill) => {
      const date = formatDate(pill.scheduled_time);
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(pill);
      return acc;
    },
    {} as Record<string, PillTracking[]>,
  );

  return (
    <Stack>
      {Object.entries(pillsByDate).map(([date, datePills]) => (
        <Stack key={date}>
          <Text size="sm">{date}</Text>
          {datePills.map((pill) => (
            <Flex
              key={pill.id}
              align="center"
              justify="space-between"
              gap="md"
              p="xs"
              style={{
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              }}
            >
              <StatusBadge status={pill.status} />
              <Text size="sm">Scheduled: {formatTime(pill.scheduled_time)}</Text>
              {pill.taken_at && <Text size="sm">Taken: {formatTime(pill.taken_at)}</Text>}
            </Flex>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
