import { Button, Center, Title, Text, Stack } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';

export function NotificationPermissionPage() {
  const navigate = useNavigate();
  const { user, activeRole, hasPushSubscription, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useNotifications({
    userId: user?.id || '',
    isInitiallySubscribed: hasPushSubscription,
  });

  // Handle auth check in useEffect
  useEffect(() => {
    if (!user || !activeRole) {
      navigate('/');
    }
  }, [user, activeRole, navigate]);

  const handleEnableNotifications = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      const success = await subscribe();

      if (success) {
        // Navigate to appropriate page based on role
        await refreshProfile();
        navigate(activeRole === 'partner' ? '/partner' : '/home');
      } else {
        setError('Failed to enable notifications. Please try again.');
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
    } finally {
      setIsProcessing(false);
    }
  };

  // If no user or preferences, render nothing while the effect handles navigation
  if (!user || !activeRole) {
    return null;
  }

  return (
    <Center style={{ height: '100%' }}>
      <Stack align="center">
        <Title order={2}>Enable Notifications</Title>

        <Text size="lg" style={{ maxWidth: '400px' }} ta="center">
          To ensure you never miss a pill reminder, we need to send you notifications.
        </Text>

        {error && (
          <Text size="sm" color="red" ta="center">
            {error}
          </Text>
        )}

        <Button color="black" onClick={handleEnableNotifications} loading={isProcessing} size="lg">
          Enable Notifications
        </Button>
      </Stack>
    </Center>
  );
}
