// src/sw.js
import { precacheAndRoute } from 'workbox-precaching';

// Precache assets generated by Vite
precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = 'app-cache-v1';
const ASSETS = ['/', '/index.html'];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// Push notification handling
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  if (!data) return;

  const options = {
    body: data.body,
    icon: '/192.png',
    badge: '/192.png',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Try to focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const url = event.notification.data?.url || '/';

      // If we have a matching window, focus it
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise open new window
      return clients.openWindow(url);
    }),
  );
});

// Network-first strategy for API requests, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests - Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // Static assets - Cache first
  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});
