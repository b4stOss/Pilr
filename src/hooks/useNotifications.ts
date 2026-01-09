import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UseNotificationsProps {
  userId: string;
  isInitiallySubscribed?: boolean;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UseNotificationsReturn {
  isSubscribed: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  getSubscription: () => Promise<PushSubscriptionData | null>;
}

const PUBLIC_VAPID_KEY = import.meta.env.VITE_PUBLIC_VAPID_KEY;

// Fonction de conversion VAPID (corrigée pour éviter l'erreur TypeScript)
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Format de la subscription pour la DB
const formatPushSubscription = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint || '',
    keys: {
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
    },
  };
};

export const useNotifications = ({ userId, isInitiallySubscribed = false }: UseNotificationsProps): UseNotificationsReturn => {
  const [isSubscribed, setIsSubscribed] = useState(Boolean(isInitiallySubscribed));

  const subscribe = async (): Promise<boolean> => {
    // Vérifier le support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('Push notifications not supported');
      return false;
    }

    try {
      // Demander la permission
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.error('Notification permission denied');
          return false;
        }
      }

      // Attendre que le SW soit prêt
      const registration = await navigator.serviceWorker.ready;

      // Créer ou récupérer la subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) as BufferSource,
        });
      }

      // Sauvegarder dans Supabase
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          push_subscription: formatPushSubscription(subscription),
        });

      if (error) {
        console.error('Failed to save subscription:', error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Failed to subscribe:', err);
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Supprimer de la DB
      const { error } = await supabase
        .from('users')
        .update({ push_subscription: null })
        .eq('id', userId);

      if (error) {
        console.error('Failed to remove subscription:', error);
        return false;
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
      return false;
    }
  };

  // Get or create subscription without saving to DB (for transactional onboarding)
  const getSubscription = async (): Promise<PushSubscriptionData | null> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('Push notifications not supported');
      return null;
    }

    try {
      // Request permission
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.error('Notification permission denied');
          return null;
        }
      }

      // Wait for SW to be ready
      const registration = await navigator.serviceWorker.ready;

      // Create or get subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) as BufferSource,
        });
      }

      return formatPushSubscription(subscription);
    } catch (err) {
      console.error('Failed to get subscription:', err);
      return null;
    }
  };

  return {
    isSubscribed,
    subscribe,
    unsubscribe,
    getSubscription,
  };
};
