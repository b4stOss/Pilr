// src/hooks/usePillTracking.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PillTracking, PillStatus } from '../types';

interface UsePillTrackingProps {
  userId: string;
  daysToFetch?: number;
}

interface UsePillTrackingReturn {
  todayPills: PillTracking[];
  historyPills: PillTracking[];
  isLoading: boolean;
  error: string | null;
  markPillStatus: (pillId: string, status: PillStatus) => Promise<void>;
  refreshPills: () => Promise<void>;
}

export function usePillTracking({ userId, daysToFetch = 7 }: UsePillTrackingProps): UsePillTrackingReturn {
  const [todayPills, setTodayPills] = useState<PillTracking[]>([]);
  const [historyPills, setHistoryPills] = useState<PillTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPills = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Set up date ranges
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const historyStart = new Date();
      historyStart.setDate(historyStart.getDate() - daysToFetch);
      historyStart.setHours(0, 0, 0, 0);

      // Fetch all pills within range
      const { data, error: fetchError } = await supabase
        .from('pill_tracking')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_time', historyStart.toISOString())
        .order('scheduled_time', { ascending: false });

      if (fetchError) throw fetchError;

      const typedData = data as PillTracking[];

      // Split into today and history
      setTodayPills(
        typedData.filter((pill) => {
          const pillDate = new Date(pill.scheduled_time);
          return pillDate >= todayStart && pillDate <= todayEnd;
        }),
      );

      setHistoryPills(
        typedData.filter((pill) => {
          const pillDate = new Date(pill.scheduled_time);
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
      const nowIso = new Date().toISOString();
      const updates: Partial<PillTracking> = {
        status,
        updated_at: nowIso,
      };

      if (status === 'taken') {
        updates.taken_at = nowIso;
      }

      const { error: updateError } = await supabase.from('pill_tracking').update(updates).eq('id', pillId);

      if (updateError) throw updateError;

      if (status === 'taken') {
        const { error: queueError } = await supabase
          .from('notification_queue')
          .update({
            processed_at: nowIso,
            success: true,
            error_message: 'Cancelled after pill marked as taken',
          })
          .eq('pill_id', pillId)
          .is('processed_at', null);

        if (queueError) throw queueError;
      }

      // Update local state for both today and history
      const updatePills = (pills: PillTracking[]) => pills.map((pill) => (pill.id === pillId ? { ...pill, ...updates } : pill));

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
