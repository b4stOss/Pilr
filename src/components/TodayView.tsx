import { Stack, Text, Paper, Group, Box, UnstyledButton, ActionIcon, Title } from '@mantine/core';
import { IconCheck, IconFlame, IconEdit } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { PillTrackingRow } from '../types';
import { useHoldToConfirm } from '../hooks/useHoldToConfirm';
import styles from './TodayView.module.css';

interface TodayViewProps {
  pill: PillTrackingRow | null;
  reminderTime: string | null;
  streak: number;
  onMarkTaken: () => Promise<void>;
  onEditReminder: () => void;
}

export function TodayView({ pill, reminderTime, streak, onMarkTaken, onEditReminder }: TodayViewProps) {
  const today = DateTime.now();
  const dateString = today.toFormat('EEEE, MMM d');

  const status = pill?.status ?? 'pending';
  const isTaken = status === 'taken' || status === 'late_taken';

  const displayTime = reminderTime
    ? DateTime.fromSQL(reminderTime).toFormat('HH:mm')
    : '--:--';
  const takenTime = pill?.taken_at ? DateTime.fromISO(pill.taken_at).toFormat('HH:mm') : null;

  const { isHolding, progress, startHold, endHold } = useHoldToConfirm({
    duration: 1200,
    onConfirm: onMarkTaken,
    disabled: isTaken,
  });

  // SVG circle properties
  const circleRadius = 96;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Stack gap="xl" align="center" style={{ flex: 1 }} justify="center">
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

      {/* Status Badge - Not taken yet */}
      {!isTaken && (
        <Box className={styles.statusBadge}>
          <Box className={styles.statusDot} />
          <span className={styles.statusText}>Not taken yet</span>
        </Box>
      )}

      {/* Main Button */}
      <Box
        className={`${styles.buttonContainer} ${isTaken ? styles.buttonContainerTaken : ''}`}
      >
        {/* Soft glow */}
        <Box className={styles.buttonGlow} />

        {/* Progress ring SVG */}
        {!isTaken && (
          <svg
            className={styles.progressRing}
            width="200"
            height="200"
            viewBox="0 0 200 200"
          >
            {/* Background circle - only visible when holding */}
            <circle
              cx="100"
              cy="100"
              r={circleRadius}
              fill="none"
              stroke={isHolding ? 'rgba(0, 0, 0, 0.08)' : 'transparent'}
              strokeWidth="4"
              style={{ transition: 'stroke 0.2s ease' }}
            />
            {/* Progress circle */}
            <circle
              cx="100"
              cy="100"
              r={circleRadius}
              fill="none"
              stroke={isHolding ? '#34D399' : 'transparent'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 100 100)"
              className={styles.progressCircle}
            />
          </svg>
        )}

        {/* Main button */}
        <UnstyledButton
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          disabled={isTaken || !pill}
          className={`${styles.mainButton} ${isTaken ? styles.mainButtonTaken : ''} ${isHolding ? styles.mainButtonHolding : ''}`}
        >
          <Box className={styles.buttonContent}>
            <IconCheck size={48} stroke={2.5} color={isTaken ? '#fff' : '#000'} />
            <Text size="xl" fw={700} c={isTaken ? 'white' : 'black'} lh={1.1}>
              {isTaken ? 'Taken!' : isHolding ? 'Hold...' : 'Mark'}
            </Text>
            {!isTaken && !isHolding && (
              <Text size="xl" fw={700} c="black" lh={1.1}>
                Taken
              </Text>
            )}
            {isTaken && takenTime && (
              <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                at {takenTime}
              </Text>
            )}
          </Box>
          {!isTaken && !isHolding && <span className={styles.hintText}>Hold to confirm</span>}
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
              {displayTime}
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
