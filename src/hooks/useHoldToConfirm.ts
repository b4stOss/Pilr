import { useState, useRef, useCallback, useEffect } from 'react';

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
  /** Bind these props to your button element */
  holdProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
  };
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
  const activePointerRef = useRef<number | null>(null);

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
    activePointerRef.current = null;
    setIsHolding(false);
    setProgress(0);
    clearTimers();
  }, [clearTimers]);

  const startHold = useCallback((pointerId: number) => {
    if (disabled || activePointerRef.current !== null) return;

    activePointerRef.current = pointerId;
    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    // Update progress every 16ms (~60fps)
    progressIntervalRef.current = setInterval(() => {
      if (activePointerRef.current === null) {
        clearTimers();
        return;
      }
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
    }, 16);

    // Trigger action after hold duration
    holdTimerRef.current = setTimeout(() => {
      if (activePointerRef.current === null) return;

      clearTimers();
      activePointerRef.current = null;
      setIsHolding(false);
      setProgress(0);
      onConfirm();
    }, duration);
  }, [disabled, duration, onConfirm, clearTimers]);

  // Global pointer up listener for reliability
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (activePointerRef.current !== null) {
        endHold();
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      clearTimers();
    };
  }, [endHold, clearTimers]);

  const holdProps = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      startHold(e.pointerId);
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerId === activePointerRef.current) {
        endHold();
      }
    },
    onPointerCancel: (e: React.PointerEvent) => {
      if (e.pointerId === activePointerRef.current) {
        endHold();
      }
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerId === activePointerRef.current) {
        endHold();
      }
    },
  };

  return {
    isHolding,
    progress,
    holdProps,
  };
}
