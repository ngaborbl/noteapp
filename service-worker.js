// service-worker.js
const CACHE_NAME = 'noteapp-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/app.js',
  '/css/style.css',
  '/icons/calendar.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('push', function(event) {
  console.log('Push értesítés érkezett', event);
  
  // Az értesítés tartalmának beolvasása
  const data = event.data.json();

  // Értesítés megjelenítése a felhasználó számára
  const options = {
    body: data.body,
    icon: '/icons/calendar.png', // Az ikon, amely az értesítéssel együtt megjelenik
    badge: '/icons/calendar.png', // A kis ikon, amely megjelenik az eszköztárban
    data: {
      url: data.url // Az URL, amelyet meg kell nyitni, ha az értesítésre kattintanak
    }
  };
  
  // Értesítés megjelenítése
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Értesítésre kattintottak', event.notification.data.url);
  event.notification.close(); // Bezárjuk az értesítést

  // A megadott URL megnyitása új lapon
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
