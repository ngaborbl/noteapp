importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBsQMs29I_kwN5idgcyAdz0etWfv7ymyz8",
  projectId: "noteapp-5c98e",
  messagingSenderId: "10607490745",
  appId: "1:10607490745:web:5cdff4c9c5e78d7c798d68"
});

const messaging = firebase.messaging();

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

// FCM háttér üzenetek kezelése
messaging.onBackgroundMessage(function(payload) {
  console.log('[Service Worker] Háttér üzenet érkezett:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/calendar.png',
    badge: '/icons/calendar.png'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});