// src/pages/RoleSelection.tsx
import { Box, Button, Center, Title, Text, Stack } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AppRole } from '../types';

export function RoleSelectionPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const setRoleAndNotifications = async (role: AppRole) => {
    if (!user) return;

    setIsProcessing(true);
    setError(null);
    setSelectedRole(role);

    try {
      if (role === 'pill_taker') {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const nowIso = new Date().toISOString();

        const { error: upsertError } = await supabase.from('pill_takers').upsert({
          user_id: user.id,
          reminder_time: '09:00',
          timezone,
          active: true,
          updated_at: nowIso,
        });

        if (upsertError) throw upsertError;
      } else {
        const { error: updateError } = await supabase
          .from('pill_takers')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (updateError && updateError.code !== 'PGRST116') throw updateError;
      }

      await refreshProfile();

      navigate('/notifications');
    } catch (error) {
      console.error('Failed to set role:', error);
      setError(error instanceof Error ? error.message : 'Failed to save role');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Center style={{ height: '100%' }}>
      <Stack>
        <Title order={2}>Choose Your Role</Title>

        {error && <Text size="sm" c="red">{error}</Text>}

        <Box>
          <Button
            color="black"
            onClick={() => setRoleAndNotifications('pill_taker')}
            loading={isProcessing && selectedRole === 'pill_taker'}
            disabled={isProcessing && selectedRole !== 'pill_taker'}
            fullWidth
            mb="md"
          >
            Super Girl
          </Button>

          <Button
            color="black"
            onClick={() => setRoleAndNotifications('partner')}
            loading={isProcessing && selectedRole === 'partner'}
            disabled={isProcessing && selectedRole !== 'partner'}
            fullWidth
          >
            Super Man
          </Button>
        </Box>
      </Stack>
    </Center>
  );
}
