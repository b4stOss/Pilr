// src/hooks/usePartnerManagement.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Partnership, UserProfile } from '../types';

interface UsePartnerManagementProps {
  userId: string;
}

interface UsePartnerManagementReturn {
  availablePartners: UserProfile[];
  activePartner: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  addPartner: (partnerId: string) => Promise<void>;
  removePartner: (partnerId: string) => Promise<void>;
}

export function usePartnerManagement({ userId }: UsePartnerManagementProps): UsePartnerManagementReturn {
  const [availablePartners, setAvailablePartners] = useState<UserProfile[]>([]);
  const [activePartner, setActivePartner] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch partnerships for this pill taker
      const { data: partnershipRows, error: partnershipsError } = await supabase
        .from('partnerships')
        .select('*')
        .eq('pill_taker_id', userId);

      if (partnershipsError) throw partnershipsError;

      const activeLink = (partnershipRows as Partnership[] | null)?.find((p) => p.status === 'active') ?? null;

      // Fetch all users except the current pill taker
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('id', userId);

      if (usersError) throw usersError;

      const typedUsers = (usersData as UserProfile[] | null) ?? [];

      if (activeLink) {
        const partnerProfile = typedUsers.find((user) => user.id === activeLink.partner_id) || null;
        setActivePartner(partnerProfile);
        setAvailablePartners(
          typedUsers.filter((user) => user.push_subscription && user.id !== activeLink.partner_id),
        );
      } else {
        setActivePartner(null);
        setAvailablePartners(typedUsers.filter((user) => Boolean(user.push_subscription)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch partners');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addPartner = async (partnerId: string) => {
    try {
      setError(null);

      const nowIso = new Date().toISOString();

      await supabase
        .from('partnerships')
        .update({ status: 'inactive', updated_at: nowIso })
        .eq('pill_taker_id', userId)
        .eq('status', 'active');

      const { error: insertError } = await supabase.from('partnerships').insert({
        pill_taker_id: userId,
        partner_id: partnerId,
        status: 'active',
        notification_enabled: true,
        created_at: nowIso,
        updated_at: nowIso,
      });

      if (insertError) throw insertError;

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add partner');
    }
  };

  const removePartner = async (partnerId: string) => {
    try {
      setError(null);

      const nowIso = new Date().toISOString();

      const { error: deleteError } = await supabase
        .from('partnerships')
        .update({
          status: 'inactive',
          notification_enabled: false,
          updated_at: nowIso,
        })
        .eq('pill_taker_id', userId)
        .eq('partner_id', partnerId)
        .eq('status', 'active');

      if (deleteError) throw deleteError;

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove partner');
    }
  };

  return {
    availablePartners,
    activePartner,
    isLoading,
    error,
    addPartner,
    removePartner,
  };
}
