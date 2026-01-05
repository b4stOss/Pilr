// src/sw.js - Version minimaliste pour notifications push
// Pas de cache, pas de Workbox, juste les notifications

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

  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
