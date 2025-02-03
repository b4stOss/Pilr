// src/hooks/usePartnerManagement.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserPreference } from '../types';

interface UsePartnerManagementProps {
  userId: string;
}

interface UsePartnerManagementReturn {
  availablePartners: UserPreference[];
  activePartner: UserPreference | null;
  isLoading: boolean;
  error: string | null;
  addPartner: (partnerId: string) => Promise<void>;
  removePartner: (partnerId: string) => Promise<void>;
}

export function usePartnerManagement({ userId }: UsePartnerManagementProps): UsePartnerManagementReturn {
  const [availablePartners, setAvailablePartners] = useState<UserPreference[]>([]);
  const [activePartner, setActivePartner] = useState<UserPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all available partners
      const { data: partners, error: partnersError } = await supabase.from('user_preferences').select('*').eq('role', 'partner');

      if (partnersError) throw partnersError;

      // Fetch current active partner
      const { data: activePartnerData, error: activePartnerError } = await supabase
        .from('user_partners')
        .select('partner_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (activePartnerError && activePartnerError.code !== 'PGRST116') {
        throw activePartnerError;
      }

      if (activePartnerData) {
        const activePartner = partners?.find((p) => p.user_id === activePartnerData.partner_id);
        setActivePartner(activePartner || null);
        // Filter out active partner from available partners
        setAvailablePartners(partners?.filter((p) => p.user_id !== activePartnerData.partner_id) || []);
      } else {
        setAvailablePartners(partners || []);
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

      const { error: insertError } = await supabase.from('user_partners').insert({
        user_id: userId,
        partner_id: partnerId,
        status: 'active',
        notification_enabled: true,
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

      const { error: deleteError } = await supabase.from('user_partners').delete().eq('user_id', userId).eq('partner_id', partnerId);

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
