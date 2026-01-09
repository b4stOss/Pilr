// src/hooks/usePartnerManagement.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PartnerUserSelect, PartnershipWithPartner } from '../types';

interface UsePartnerManagementProps {
  userId: string;
}

interface UsePartnerManagementReturn {
  activePartner: PartnerUserSelect | null;
  isLoading: boolean;
  error: string | null;
  removePartner: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePartnerManagement({ userId }: UsePartnerManagementProps): UsePartnerManagementReturn {
  const [activePartner, setActivePartner] = useState<PartnerUserSelect | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch active partnership with partner profile
      const { data, error: fetchError } = await supabase
        .from('partnerships')
        .select('partner_id, status, users!partnerships_partner_id_fkey(id, email, push_subscription)')
        .eq('pill_taker_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Type assertion for Supabase relation query result
      const partnership = data as PartnershipWithPartner | null;
      setActivePartner(partnership?.users ?? null);
    } catch (err) {
      console.error('Error fetching partner:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch partner');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const removePartner = useCallback(async () => {
    if (!userId || !activePartner) return;

    try {
      setError(null);

      // Delete the partnership
      const { error: deleteError } = await supabase
        .from('partnerships')
        .delete()
        .eq('pill_taker_id', userId)
        .eq('partner_id', activePartner.id);

      if (deleteError) throw deleteError;

      // Clear local state
      setActivePartner(null);
    } catch (err) {
      console.error('Error removing partner:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove partner');
    }
  }, [userId, activePartner]);

  return {
    activePartner,
    isLoading,
    error,
    removePartner,
    refresh: fetchData,
  };
}
