import { useState, useRef, useCallback } from 'react';

interface UseHoldToConfirmOptions {
  /** Duration in ms to hold before confirming (default: 1200) */
  duration?: number;
  /** Callback when hold completes */
  onConfirm: () => void;
  /** Whether the hold action is disabled */
  disabled?: boolean;
}

interface UseHoldToConfirmReturn {
  /** Whether currently holding */
  isHolding: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Call on mouse/touch down */
  startHold: () => void;
  /** Call on mouse/touch up or leave */
  endHold: () => void;
}

export function useHoldToConfirm({
  duration = 1200,
  onConfirm,
  disabled = false,
}: UseHoldToConfirmOptions): UseHoldToConfirmReturn {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isHoldingRef = useRef(false);

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
    isHoldingRef.current = false;
    setIsHolding(false);
    setProgress(0);
    clearTimers();
  }, [clearTimers]);

  const startHold = useCallback(() => {
    if (disabled) return;

    isHoldingRef.current = true;
    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    // Update progress every 16ms (~60fps)
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
    }, 16);

    // Trigger action after hold duration
    holdTimerRef.current = setTimeout(() => {
      if (!isHoldingRef.current) return;

      onConfirm();
      isHoldingRef.current = false;
      setIsHolding(false);
      setProgress(0);
      clearTimers();
    }, duration);
  }, [disabled, duration, onConfirm, clearTimers]);

  return {
    isHolding,
    progress,
    startHold,
    endHold,
  };
}
