// src/pages/RoleSelectionPage.tsx
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
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      if (role === 'pill_taker') {
        // Update user with pill_taker role and default settings
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'pill_taker',
            reminder_time: '09:00',
            timezone,
            active: true,
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // Update user with partner role
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'partner',
            active: true,
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      await refreshProfile();
      navigate('/notifications');
    } catch (err) {
      console.error('Failed to set role:', err);
      setError(err instanceof Error ? err.message : 'Failed to save role');
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
