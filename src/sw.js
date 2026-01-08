// src/sw.js - Service Worker avec Workbox + Push Notifications
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

// Prend le contrôle immédiatement sans attendre le reload
clientsClaim();

// Permet la mise à jour immédiate du SW quand une nouvelle version est disponible
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Précache les assets buildés par Vite (injecté automatiquement par vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// SPA fallback: toutes les navigations retournent index.html
const navigationRoute = new NavigationRoute(createHandlerBoundToURL('index.html'), {
  // Exclure les chemins d'API ou autres si nécessaire
  denylist: [/^\/api\//],
});
registerRoute(navigationRoute);

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Notification', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/192.png',
    badge: '/192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pilr', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      return clients.openWindow(targetUrl);
    })
  );
});
