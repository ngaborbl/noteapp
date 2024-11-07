importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

// Firebase inicializálása
firebase.initializeApp({
  apiKey: "AIzaSyBsQMs29I_kwN5idgcyAdz0etWfv7ymyz8",
  authDomain: "noteapp-5c98e.firebaseapp.com",
  projectId: "noteapp-5c98e",
  storageBucket: "noteapp-5c98e.appspot.com",
  messagingSenderId: "10607490745",
  appId: "1:10607490745:web:5cdff4c9c5e78d7c798d68",
  measurementId: "G-3NSSJ1FT7S"
});

const messaging = firebase.messaging();

// Cache kezelés
const CACHE_NAME = 'noteapp-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/app.js',
  '/css/style.css',
  '/icons/calendar.png'
];

self.addEventListener('install', function(event) {
  console.log('Service Worker telepítve');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache megnyitva');
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

// Firebase Cloud Messaging háttér üzenetek kezelése
messaging.onBackgroundMessage(function(payload) {
  console.log('Háttér üzenet érkezett:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/calendar.png',
    badge: '/icons/calendar.png',
    data: payload.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Értesítésre kattintás kezelése
self.addEventListener('notificationclick', function(event) {
  console.log('Értesítésre kattintottak', event.notification);
  event.notification.close();

  // Ha van megadott URL az adatokban, azt nyitjuk meg
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then(function(clientList) {
      // Ha van már nyitott ablak, azt használjuk
      for (let client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Ha nincs nyitott ablak, újat nyitunk
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Push értesítések kezelése
self.addEventListener('push', function(event) {
  console.log('Push értesítés érkezett', event);

  let notificationData = {};
  
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'Értesítés',
      body: event.data ? event.data.text() : 'Nincs üzenet tartalom'
    };
  }

  const options = {
    body: notificationData.body,
    icon: '/icons/calendar.png',
    badge: '/icons/calendar.png',
    data: {
      url: notificationData.url || '/'
    },
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});