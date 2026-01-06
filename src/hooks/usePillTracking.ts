// src/hooks/usePillTracking.ts
import { useState, useEffect, useCallback } from 'react';
import { DateTime } from 'luxon';
import { supabase } from '../lib/supabase';
import { PillTrackingRow, PillStatus } from '../types';

interface UsePillTrackingProps {
  userId: string;
  daysToFetch?: number;
}

interface UsePillTrackingReturn {
  todayPills: PillTrackingRow[];
  historyPills: PillTrackingRow[];
  isLoading: boolean;
  error: string | null;
  markPillStatus: (pillId: string, status: PillStatus) => Promise<void>;
  refreshPills: () => Promise<void>;
}

export function usePillTracking({ userId, daysToFetch = 7 }: UsePillTrackingProps): UsePillTrackingReturn {
  const [todayPills, setTodayPills] = useState<PillTrackingRow[]>([]);
  const [historyPills, setHistoryPills] = useState<PillTrackingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPills = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Set up date ranges using luxon for consistent timezone handling
      const now = DateTime.now();
      const todayStart = now.startOf('day');
      const todayEnd = now.endOf('day');
      const historyStart = now.minus({ days: daysToFetch }).startOf('day');

      // Fetch all pills within range
      const { data, error: fetchError } = await supabase
        .from('pill_tracking')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_time', historyStart.toUTC().toISO())
        .order('scheduled_time', { ascending: false });

      if (fetchError) throw fetchError;

      const typedData = data as PillTrackingRow[];

      // Split into today and history
      setTodayPills(
        typedData.filter((pill) => {
          const pillDate = DateTime.fromISO(pill.scheduled_time);
          return pillDate >= todayStart && pillDate <= todayEnd;
        }),
      );

      setHistoryPills(
        typedData.filter((pill) => {
          const pillDate = DateTime.fromISO(pill.scheduled_time);
          return pillDate < todayStart && pillDate >= historyStart;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pills');
    } finally {
      setIsLoading(false);
    }
  }, [userId, daysToFetch]);

  useEffect(() => {
    fetchPills();
  }, [fetchPills]);

  const markPillStatus = async (pillId: string, status: PillStatus) => {
    try {
      setError(null);
      const nowIso = DateTime.now().toUTC().toISO();
      const updates: Partial<PillTrackingRow> = {
        status,
        updated_at: nowIso,
      };

      if (status === 'taken') {
        updates.taken_at = nowIso;
      }

      const { error: updateError } = await supabase
        .from('pill_tracking')
        .update(updates)
        .eq('id', pillId);

      if (updateError) throw updateError;

      // Update local state for both today and history
      const updatePills = (pills: PillTrackingRow[]) =>
        pills.map((pill) => (pill.id === pillId ? { ...pill, ...updates } : pill));

      setTodayPills(updatePills);
      setHistoryPills(updatePills);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pill status');
    }
  };

  return {
    todayPills,
    historyPills,
    isLoading,
    error,
    markPillStatus,
    refreshPills: fetchPills,
  };
}
