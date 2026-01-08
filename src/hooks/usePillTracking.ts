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
  allPills: PillTrackingRow[];
  pillsByDate: Map<string, PillTrackingRow[]>;
  streak: number;
  isLoading: boolean;
  error: string | null;
  markPillStatus: (pillId: string, status: PillStatus) => Promise<void>;
  refreshPills: () => Promise<void>;
}

// Calculate streak: consecutive days with taken/late_taken status going back from yesterday
function calculateStreak(pillsByDate: Map<string, PillTrackingRow[]>): number {
  let streak = 0;
  let currentDate = DateTime.now().startOf('day');

  while (true) {
    const dateKey = currentDate.toFormat('yyyy-MM-dd');
    const pills = pillsByDate.get(dateKey);

    if (!pills || pills.length === 0) break;

    // Check if all pills for this day were taken
    const allTaken = pills.every((p) => p.status === 'taken' || p.status === 'late_taken');
    if (!allTaken) break;

    streak++;
    currentDate = currentDate.minus({ days: 1 });
  }

  return streak;
}

export function usePillTracking({ userId, daysToFetch = 60 }: UsePillTrackingProps): UsePillTrackingReturn {
  const [todayPills, setTodayPills] = useState<PillTrackingRow[]>([]);
  const [historyPills, setHistoryPills] = useState<PillTrackingRow[]>([]);
  const [allPills, setAllPills] = useState<PillTrackingRow[]>([]);
  const [pillsByDate, setPillsByDate] = useState<Map<string, PillTrackingRow[]>>(new Map());
  const [streak, setStreak] = useState(0);
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

      // Store all pills
      setAllPills(typedData);

      // Build pillsByDate map for calendar view
      const pillsMap = new Map<string, PillTrackingRow[]>();
      typedData.forEach((pill) => {
        const dateKey = DateTime.fromISO(pill.scheduled_time).toFormat('yyyy-MM-dd');
        if (!pillsMap.has(dateKey)) {
          pillsMap.set(dateKey, []);
        }
        pillsMap.get(dateKey)!.push(pill);
      });
      setPillsByDate(pillsMap);

      // Calculate streak
      setStreak(calculateStreak(pillsMap));

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

      // Find current pill to check its state
      const currentPill = allPills.find((p) => p.id === pillId);

      // If marking as taken but partner was already alerted, use late_taken instead
      let finalStatus = status;
      if (status === 'taken' && currentPill?.partner_alerted) {
        finalStatus = 'late_taken';
      }

      const updates: Partial<PillTrackingRow> = {
        status: finalStatus,
        updated_at: nowIso,
      };

      if (finalStatus === 'taken' || finalStatus === 'late_taken') {
        updates.taken_at = nowIso;
      }

      const { error: updateError } = await supabase
        .from('pill_tracking')
        .update(updates)
        .eq('id', pillId);

      if (updateError) throw updateError;

      // Update local state for today, history, all pills, and pillsByDate
      const updatePills = (pills: PillTrackingRow[]) =>
        pills.map((pill) => (pill.id === pillId ? { ...pill, ...updates } : pill));

      setTodayPills(updatePills);
      setHistoryPills(updatePills);
      setAllPills(updatePills);

      // Update pillsByDate map
      setPillsByDate((prevMap) => {
        const newMap = new Map(prevMap);
        for (const [dateKey, pills] of newMap) {
          const updatedPills = pills.map((pill) =>
            pill.id === pillId ? { ...pill, ...updates } : pill
          );
          newMap.set(dateKey, updatedPills);
        }
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pill status');
    }
  };

  return {
    todayPills,
    historyPills,
    allPills,
    pillsByDate,
    streak,
    isLoading,
    error,
    markPillStatus,
    refreshPills: fetchPills,
  };
}
