import { useState } from 'react';
import { DatePicker } from '@mantine/dates';
import { Stack, Text, Group, Box, Paper } from '@mantine/core';
import { DateTime } from 'luxon';
import { PillTrackingRow, PillStatus } from '../types';

interface CalendarHistoryProps {
  pillsByDate: Map<string, PillTrackingRow[]>;
}

const STATUS_COLORS: Record<PillStatus, string> = {
  taken: '#34D399',
  missed: '#F87171',
  late_taken: '#FB923C',
  pending: '#9CA3AF',
};

export function CalendarHistory({ pillsByDate }: CalendarHistoryProps) {
  const [date, setDate] = useState<Date>(new Date());
  const today = DateTime.now().startOf('day');

  const handleDateChange = (newDate: string) => {
    setDate(new Date(newDate));
  };

  const getDayStatus = (date: Date): PillStatus | null => {
    const dateKey = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
    const pills = pillsByDate.get(dateKey);
    if (!pills || pills.length === 0) return null;

    // Return the most significant status for that day
    // Priority: missed > late_taken > pending > taken
    if (pills.some((p) => p.status === 'missed')) return 'missed';
    if (pills.some((p) => p.status === 'late_taken')) return 'late_taken';
    if (pills.some((p) => p.status === 'pending')) return 'pending';
    if (pills.some((p) => p.status === 'taken')) return 'taken';
    return null;
  };

  return (
    <Paper p="lg" radius="lg" shadow="md" style={{ backgroundColor: '#fff' }}>
      <Stack gap="md">
        <DatePicker
          value={null}
          date={date}
          onDateChange={handleDateChange}
          size="md"
          hideOutsideDates
          withCellSpacing={false}
          getDayProps={(dateStr) => {
            const dateObj = new Date(dateStr);
            const status = getDayStatus(dateObj);
            const isToday = DateTime.fromJSDate(dateObj).hasSame(today, 'day');
            const isFuture = DateTime.fromJSDate(dateObj) > today;

            // Today gets filled background like other days
            if (isToday && status) {
              return {
                style: {
                  backgroundColor: STATUS_COLORS[status],
                  color: '#fff',
                  borderRadius: '50%',
                  fontWeight: 600,
                },
              };
            }

            // Past days with status get filled background
            if (status && !isFuture) {
              return {
                style: {
                  backgroundColor: STATUS_COLORS[status],
                  color: '#fff',
                  borderRadius: '50%',
                },
              };
            }

            // Future pending days get lighter styling
            if (status === 'pending' && isFuture) {
              return {
                style: {
                  backgroundColor: 'rgba(156, 163, 175, 0.2)',
                  borderRadius: '50%',
                  color: '#9CA3AF',
                },
              };
            }

            return {};
          }}
          styles={{
            calendarHeader: {
              maxWidth: '100%',
            },
            calendarHeaderLevel: {
              fontWeight: 600,
              fontSize: 'var(--mantine-font-size-lg)',
            },
            calendarHeaderControl: {
              display: 'none',
            },
            month: {
              width: '100%',
            },
            day: {
              borderRadius: '50%',
            },
          }}
        />

        {/* Legend */}
        <Group justify="center" gap="lg" mt="xs">
          {[
            { label: 'Taken', color: STATUS_COLORS.taken },
            { label: 'Missed', color: STATUS_COLORS.missed },
            { label: 'Late', color: STATUS_COLORS.late_taken },
          ].map(({ label, color }) => (
            <Group key={label} gap={6}>
              <Box
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: color,
                }}
              />
              <Text size="xs" c="dimmed">
                {label}
              </Text>
            </Group>
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}
