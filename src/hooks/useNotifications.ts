import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UseNotificationsProps {
  userId: string;
  isInitiallySubscribed?: boolean;
}

interface UseNotificationsReturn {
  isSubscribed: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
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

  return {
    isSubscribed,
    subscribe,
    unsubscribe,
  };
};
