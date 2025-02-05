import { Flex, Text, Button, Badge, Stack, Group } from '@mantine/core';
import { PillTracking, PillStatus } from '../types';

interface PillListProps {
  pills: PillTracking[];
  onStatusChange: (pillId: string, status: PillStatus) => Promise<void>;
}

export const StatusBadge = ({ status }: { status: PillStatus }) => {
  const colorMap: Record<PillStatus, string> = {
    pending: 'yellow',
    taken: 'green',
    late: 'orange',
    missed: 'red',
  };

  return (
    <Badge color={colorMap[status]} variant="light">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export function PillList({ pills, onStatusChange }: PillListProps) {
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Stack>
      {pills.length === 0 ? (
        <Text>No pills scheduled</Text>
      ) : (
        pills.map((pill) => (
          <Flex
            key={pill.id}
            justify="space-between"
            align="center"
            p="sm"
            style={{
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
            }}
          >
            <Group>
              <StatusBadge status={pill.status} />
              <Text fw={700}>{formatTime(pill.scheduled_time)}</Text>
            </Group>

            {(pill.status === 'pending' || pill.status === 'late') && (
              <Button variant="light" color="green" size="sm" onClick={() => onStatusChange(pill.id, 'taken')}>
                Mark Taken
              </Button>
            )}

            {pill.status !== 'pending' && pill.status !== 'late' && pill.taken_at && (
              <Text size="sm">Taken at {formatTime(pill.taken_at)}</Text>
            )}
          </Flex>
        ))
      )}
    </Stack>
  );
}
