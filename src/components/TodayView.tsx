import { useState, useRef, useCallback } from 'react';
import { Stack, Text, Paper, Group, Box, UnstyledButton, ActionIcon, Title } from '@mantine/core';
import { IconCheck, IconFlame, IconEdit } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { PillTrackingRow } from '../types';
import styles from './TodayView.module.css';

const HOLD_DURATION = 1200; // 1.2 seconds to confirm

interface TodayViewProps {
  pill: PillTrackingRow | null;
  reminderTime: string | null;
  streak: number;
  onMarkTaken: (pillId: string) => Promise<void>;
  onEditReminder: () => void;
}

export function TodayView({ pill, reminderTime, streak, onMarkTaken, onEditReminder }: TodayViewProps) {
  const today = DateTime.now();
  const dateString = today.toFormat('EEEE, MMM d');

  const status = pill?.status ?? 'pending';
  const isTaken = status === 'taken' || status === 'late_taken';
  const canMarkTaken = !isTaken;

  const displayTime = reminderTime
    ? DateTime.fromSQL(reminderTime).toFormat('HH:mm')
    : '--:--';
  const takenTime = pill?.taken_at ? DateTime.fromISO(pill.taken_at).toFormat('HH:mm') : null;

  const handleMarkTaken = useCallback(() => {
    if (pill && canMarkTaken) {
      onMarkTaken(pill.id);
    }
  }, [pill, canMarkTaken, onMarkTaken]);

  // Hold to confirm state
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isHoldingRef = useRef(false); // Ref to track holding state for async callbacks

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const endHold = useCallback(() => {
    isHoldingRef.current = false; // Mark as not holding FIRST
    setIsHolding(false);
    setProgress(0);
    clearTimers();
  }, [clearTimers]);

  const startHold = useCallback(() => {
    if (!canMarkTaken) return;

    isHoldingRef.current = true; // Mark as holding
    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    // Update progress every 16ms (~60fps)
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(newProgress);
    }, 16);

    // Trigger action after hold duration
    holdTimerRef.current = setTimeout(() => {
      // Only trigger if still holding (not cancelled)
      if (!isHoldingRef.current) return;

      handleMarkTaken();
      isHoldingRef.current = false;
      setIsHolding(false);
      setProgress(0);
      clearTimers();
    }, HOLD_DURATION);
  }, [canMarkTaken, handleMarkTaken, clearTimers]);

  // SVG circle properties
  const circleRadius = 96;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

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

      {/* Main Button with Ripple Effect */}
      <Box
        className={`${styles.rippleContainer} ${isTaken ? styles.rippleContainerTaken : ''}`}
      >
        {/* Outer glow */}
        <Box className={styles.rippleGlow} />

        {/* Concentric rings */}
        <Box className={`${styles.rippleRing} ${styles.rippleRing1}`} />
        <Box className={`${styles.rippleRing} ${styles.rippleRing2}`} />
        <Box className={`${styles.rippleRing} ${styles.rippleRing3}`} />

        {/* Progress ring SVG */}
        {!isTaken && (
          <svg
            className={styles.progressRing}
            width="200"
            height="200"
            viewBox="0 0 200 200"
          >
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={circleRadius}
              fill="none"
              stroke="rgba(0, 0, 0, 0.05)"
              strokeWidth="4"
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
          disabled={!canMarkTaken}
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
