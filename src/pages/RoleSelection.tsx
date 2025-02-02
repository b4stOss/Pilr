// src/pages/RoleSelection.tsx
import { Box, Button, Center, Title, Text, Stack } from '@mantine/core';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { UserRole } from '../types';
import { useNotifications } from '../hooks/useNotifications';

export function RoleSelectionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // We'll initialize the hook with empty values and update them after role selection
  const { subscribe, error: notificationError } = useNotifications({
    userId: user?.id || '',
    userRole: selectedRole || 'user',
  });

  const setRoleAndNotifications = async (role: UserRole) => {
    if (!user) return;

    setIsProcessing(true);
    setSelectedRole(role);

    try {
      // 1. Save role to DB
      const { error: roleError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          email: user.email,
          role,
        })
        .select();

      if (roleError) throw roleError;

      // 2. Set up notifications
      const notificationSuccess = await subscribe();

      if (!notificationSuccess) {
        console.warn('Notification setup failed, but continuing with role setup');
      }

      // 3. Navigate based on role
      navigate(role === 'partner' ? '/partner' : '/home');
    } catch (error) {
      console.error('Failed to set role:', error);
      // You might want to add error handling UI here
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Center style={{ height: '100%' }}>
      <Stack>
        <Title order={2}>Choose Your Role</Title>

        {notificationError && <Text size="sm">{notificationError}</Text>}

        <Box>
          <Button
            color="black"
            onClick={() => setRoleAndNotifications('user')}
            loading={isProcessing && selectedRole === 'user'}
            disabled={isProcessing && selectedRole !== 'user'}
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
