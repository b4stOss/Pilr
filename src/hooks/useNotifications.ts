// src/hooks/useNotifications.ts
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';
import { registerServiceWorker, isPushSupported, getNotificationPermission, formatPushSubscription } from '../lib/push';

interface UseNotificationsProps {
  userId: string;
  userRole: UserRole;
}

interface UseNotificationsReturn {
  isSubscribed: boolean;
  isSubscribing: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkSubscription: () => Promise<boolean>;
}

const PUBLIC_VAPID_KEY = import.meta.env.VITE_PUBLIC_VAPID_KEY;

export const useNotifications = ({ userId }: UseNotificationsProps): UseNotificationsReturn => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check subscription status on mount
    checkSubscription();
  }, [userId]);

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  };

  const checkSubscription = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported()) {
      setError('Push notifications are not supported by your browser');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const isSubbed = !!subscription;
      setIsSubscribed(isSubbed);
      return isSubbed;
    } catch (err) {
      console.error('Error checking subscription:', err);
      return false;
    }
  }, []);

  const subscribe = async (): Promise<boolean> => {
    if (!isPushSupported()) {
      setError('Push notifications are not supported by your browser');
      return false;
    }

    try {
      setIsSubscribing(true);
      setError(null);

      // Request permission if needed
      if (getNotificationPermission() !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError('Notification permission denied');
          return false;
        }
      }

      // Register service worker if needed
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('Failed to register service worker');
      }

      // Get or create push subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
        });
      }

      // Save subscription to Supabase
      const { error: dbError } = await supabase
        .from('user_preferences')
        .update({
          subscription: formatPushSubscription(subscription),
        })
        .eq('user_id', userId);

      if (dbError) throw dbError;

      setIsSubscribed(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to notifications');
      return false;
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove subscription from database
        await supabase.from('user_preferences').update({ subscription: null }).eq('user_id', userId);
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe from notifications');
      return false;
    }
  };

  return {
    isSubscribed,
    isSubscribing,
    error,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
};
