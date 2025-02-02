// src/lib/push.ts
import { PushSubscriptionData } from '../types';

/**
 * Core configuration and utility functions for push notifications
 */

// Constants
const SW_PATH = import.meta.env.VITE_MODE === 'production' ? '/sw.js' : '/dev-sw.js?dev-sw';

/**
 * Registers the service worker
 * @returns The ServiceWorkerRegistration if successful, null otherwise
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      type: 'module',
      scope: '/',
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          window.location.reload();
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Converts UTC time string to local time
 */
export function utcToLocalTime(utcTime: string): string {
  const [hours, minutes] = utcTime.split(':').map(Number);
  const date = new Date();
  date.setUTCHours(hours, minutes, 0, 0);
  return date.toTimeString().slice(0, 5);
}

/**
 * Converts local time to UTC time string
 */
export function localToUtcTime(localTime: string): string {
  const [hours, minutes] = localTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString().slice(11, 16);
}

/**
 * Formats a browser PushSubscription object to our internal format
 */
export function formatPushSubscription(subscription: PushSubscription): PushSubscriptionData {
  const subscriptionJson = subscription.toJSON();
  return {
    endpoint: subscriptionJson.endpoint || '',
    keys: {
      p256dh: subscriptionJson.keys?.p256dh || '',
      auth: subscriptionJson.keys?.auth || ''
    }
  };
}

/**
 * Checks if push notifications are supported in the current environment
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Gets the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  return Notification.permission;
}