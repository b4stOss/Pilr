import { Button, Center, Title, Text, Stack } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

export function NotificationPermissionPage() {
  const navigate = useNavigate();
  const { user, userPreferences } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const { error, subscribe } = useNotifications({
    userId: user?.id || '',
    userRole: userPreferences?.role || 'user',
  });

  // Handle auth check in useEffect
  useEffect(() => {
    if (!user || !userPreferences) {
      navigate('/');
    }
  }, [user, userPreferences, navigate]);

  const handleEnableNotifications = async () => {
    try {
      setIsProcessing(true);
      const success = await subscribe();

      if (success) {
        // Navigate to appropriate page based on role
        navigate(userPreferences?.role === 'partner' ? '/partner' : '/home');
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // If no user or preferences, render nothing while the effect handles navigation
  if (!user || !userPreferences) {
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
