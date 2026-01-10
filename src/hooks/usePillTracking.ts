// src/hooks/usePillTracking.ts
import { useState, useEffect, useCallback } from 'react';
import { DateTime } from 'luxon';
import { supabase } from '../lib/supabase';
import { PillTrackingRow } from '../types';

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
  markTodayAsTaken: (reminderTime: string) => Promise<void>;
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

  // Mark today's pill as taken - creates entry if needed, updates if exists
  const markTodayAsTaken = async (reminderTime: string) => {
    if (!userId || !reminderTime) return;

    try {
      setError(null);
      const now = DateTime.now();
      const nowIso = now.toUTC().toISO();
      const dateKey = now.toFormat('yyyy-MM-dd');

      // Check if we have an existing pill for today
      const existingPill = todayPills[0];

      if (existingPill) {
        // Update existing entry
        const finalStatus = existingPill.partner_alerted ? 'late_taken' : 'taken';
        const updates: Partial<PillTrackingRow> = {
          status: finalStatus,
          taken_at: nowIso,
          updated_at: nowIso,
        };

        const { error: updateError } = await supabase
          .from('pill_tracking')
          .update(updates)
          .eq('id', existingPill.id);

        if (updateError) throw updateError;

        // Update local state
        const updatedPill = { ...existingPill, ...updates };
        setTodayPills([updatedPill as PillTrackingRow]);
        setAllPills((prev) =>
          prev.map((p) => (p.id === existingPill.id ? (updatedPill as PillTrackingRow) : p))
        );
        setPillsByDate((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(dateKey, [updatedPill as PillTrackingRow]);
          setStreak(calculateStreak(newMap));
          return newMap;
        });
      } else {
        // Create new entry
        const [hours, minutes] = reminderTime.split(':').map(Number);
        const scheduledTime = now.startOf('day').set({ hour: hours, minute: minutes }).toUTC().toISO();

        const { data, error: insertError } = await supabase
          .from('pill_tracking')
          .insert({
            user_id: userId,
            scheduled_time: scheduledTime,
            status: 'taken',
            taken_at: nowIso,
            reminder_count: 0,
            partner_alerted: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const newPill = data as PillTrackingRow;
        setTodayPills([newPill]);
        setAllPills((prev) => [newPill, ...prev]);
        setPillsByDate((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(dateKey, [newPill]);
          setStreak(calculateStreak(newMap));
          return newMap;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark pill as taken');
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
    markTodayAsTaken,
    refreshPills: fetchPills,
  };
}
