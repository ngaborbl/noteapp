// service-worker.js

const CACHE_NAME = 'noteapp-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/app.js',
  '/js/notifications.js',
  '/css/style.css',
  '/icons/icon-48.png',
  '/icons/icon-144.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Service Worker telepítése
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache megnyitva');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch események kezelése cache-eléssel
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Push értesítések kezelése
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Új értesítés érkezett',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-48.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'noteapp-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Megnyitás'
        },
        {
          action: 'dismiss',
          title: 'Bezárás'
        }
      ],
      data: {
        url: data.url || '/',
        timestamp: Date.now(),
        ...data.data
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Értesítésre kattintás kezelése
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Alkalmazás megnyitása a megfelelő oldalon
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      // Ha már nyitva van az alkalmazás
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Ha nincs nyitva, új ablakban nyitjuk meg
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Service worker aktiválása
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});