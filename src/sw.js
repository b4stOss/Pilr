import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = 'app-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  // Add other critical assets here
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('push', (e) => {
  const data = e.data?.json();
  if (!data) return;
  console.log('Showing notification with:', data);
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});

// Add fetch handler for caching
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});
