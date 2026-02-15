const CACHE_NAME = 'noteapp-cache-v2.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/app.js',
  '/css/style.css',
  '/icons/icon-48.png',
  '/icons/icon-144.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
  // notifications.js eltávolítva a listából, mert module-ként töltődik be
];

// Cache telepítés módosítása
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache megnyitva');
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(error => {
              console.error(`Nem sikerült cache-elni: ${url}`, error);
              return null; // Ha egy URL nem sikerül, folytassuk a többivel
            })
          )
        );
      })
  );
  self.skipWaiting();
});

// Service worker aktiválása
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Régi cache-ek törlése
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Azonnal átvesszük az irányítást minden tab felett
      clients.claim()
    ])
  );
});

// Fetch események kezelése cache-eléssel
self.addEventListener('fetch', (event) => {
  // Csak http és https protokollokat cache-eljük
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache találat esetén visszaadjuk
        if (response) {
          return response;
        }

        // Cache miss esetén fetch és cache
        return fetch(event.request).then(
          (response) => {
            // Csak valid response-t cache-elünk
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Response klónozása cache-eléshez
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Csak http/https URL-eket cache-elünk
                if (event.request.url.startsWith('http')) {
                  cache.put(event.request, responseToCache);
                }
              })
              .catch(error => {
                console.error('Cache írási hiba:', error);
              });

            return response;
          }
        ).catch(error => {
          console.error('Fetch hiba:', error);
          // Offline fallback content visszaadása hiba esetén
          return new Response('Offline tartalom');
        });
      })
  );
});

// Push értesítések kezelése
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
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
    } catch (error) {
      console.error('Push értesítés feldolgozási hiba:', error);
    }
  }
});

// Értesítésre kattintás kezelése
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      // Ha már nyitva van az alkalmazás
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          // Navigálás a megfelelő URL-re
          if ('navigate' in client) {
            return client.navigate(event.notification.data.url);
          }
          return;
        }
      }
      // Ha nincs nyitva, új ablakban nyitjuk meg
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
    .catch(error => {
      console.error('Értesítés kattintás kezelési hiba:', error);
    })
  );
});

// Sync események kezelése
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Itt szinkronizálhatjuk a függőben lévő értesítéseket
      Promise.resolve()
    );
  }
});

// Hibakezelés
self.addEventListener('error', (event) => {
  console.error('Service Worker hiba:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Kezeletlen Promise elutasítás:', event.reason);
});