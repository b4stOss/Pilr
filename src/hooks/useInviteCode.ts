import { useState, useEffect, useCallback } from 'react';
import { DateTime } from 'luxon';
import { supabase } from '../lib/supabase';
import { InviteCodeRow } from '../types';

interface UseInviteCodeProps {
  userId: string;
}

interface UseInviteCodeReturn {
  activeCode: InviteCodeRow | null;
  isLoading: boolean;
  error: string | null;
  generateCode: () => Promise<void>;
  validateAndUseCode: (code: string) => Promise<{ success: boolean; error?: string }>;
}

// Generate a random 6-character alphanumeric code
function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useInviteCode({ userId }: UseInviteCodeProps): UseInviteCodeReturn {
  const [activeCode, setActiveCode] = useState<InviteCodeRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active code for pill_taker
  const fetchActiveCode = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const now = DateTime.now().toUTC().toISO();

      const { data, error: fetchError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('pill_taker_id', userId)
        .gt('expires_at', now!)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setActiveCode(data);
    } catch (err) {
      console.error('Error fetching invite code:', err);
      setError('Failed to fetch invite code');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchActiveCode();
  }, [fetchActiveCode]);

  // Generate a new code (pill_taker only)
  const generateCode = useCallback(async () => {
    if (!userId) return;

    try {
      setError(null);

      // Delete any existing unused codes for this user
      await supabase
        .from('invite_codes')
        .delete()
        .eq('pill_taker_id', userId)
        .is('used_at', null);

      // Generate new code with 24h expiration
      const code = generateRandomCode();
      const expiresAt = DateTime.now().plus({ hours: 24 }).toUTC().toISO()!;

      const { data, error: insertError } = await supabase
        .from('invite_codes')
        .insert({
          code,
          pill_taker_id: userId,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (insertError) {
        // If code collision (unlikely), retry once
        if (insertError.code === '23505') {
          const retryCode = generateRandomCode();
          const { data: retryData, error: retryError } = await supabase
            .from('invite_codes')
            .insert({
              code: retryCode,
              pill_taker_id: userId,
              expires_at: expiresAt,
            })
            .select()
            .single();

          if (retryError) throw retryError;
          setActiveCode(retryData);
          return;
        }
        throw insertError;
      }

      setActiveCode(data);
    } catch (err) {
      console.error('Error generating invite code:', err);
      setError('Failed to generate invite code');
    }
  }, [userId]);

  // Validate and use a code (partner only)
  const validateAndUseCode = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      if (!userId) {
        return { success: false, error: 'Not authenticated' };
      }

      // Normalize code (uppercase, remove dashes/spaces)
      const normalizedCode = code.toUpperCase().replace(/[-\s]/g, '');

      if (normalizedCode.length !== 6) {
        return { success: false, error: 'Invalid code format' };
      }

      try {
        // Find the valid code
        const { data: codeData, error: findError } = await supabase
          .from('invite_codes')
          .select('*')
          .eq('code', normalizedCode)
          .maybeSingle();

        if (findError) throw findError;

        if (!codeData) {
          return { success: false, error: 'Invalid code' };
        }

        if (codeData.used_at) {
          return { success: false, error: 'Code already used' };
        }

        const now = DateTime.now();
        const expiresAt = DateTime.fromISO(codeData.expires_at);
        if (now > expiresAt) {
          return { success: false, error: 'Code expired' };
        }

        // Check if partner already has an active partnership
        const { data: existingPartnership } = await supabase
          .from('partnerships')
          .select('id')
          .eq('partner_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (existingPartnership) {
          return { success: false, error: 'You already have an active partnership' };
        }

        // Check if pill_taker already has an active partnership
        const { data: pillTakerPartnership } = await supabase
          .from('partnerships')
          .select('id')
          .eq('pill_taker_id', codeData.pill_taker_id)
          .eq('status', 'active')
          .maybeSingle();

        if (pillTakerPartnership) {
          return { success: false, error: 'This user already has a partner' };
        }

        // Mark code as used
        const { error: updateError } = await supabase
          .from('invite_codes')
          .update({
            used_by: userId,
            used_at: DateTime.now().toUTC().toISO(),
          })
          .eq('id', codeData.id);

        if (updateError) throw updateError;

        // Create partnership
        const { error: partnershipError } = await supabase.from('partnerships').insert({
          pill_taker_id: codeData.pill_taker_id,
          partner_id: userId,
          status: 'active',
        });

        if (partnershipError) throw partnershipError;

        return { success: true };
      } catch (err) {
        console.error('Error using invite code:', err);
        return { success: false, error: 'Failed to link accounts' };
      }
    },
    [userId]
  );

  return {
    activeCode,
    isLoading,
    error,
    generateCode,
    validateAndUseCode,
  };
}
