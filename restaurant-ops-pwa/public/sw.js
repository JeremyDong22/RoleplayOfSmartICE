// Service Worker for Restaurant Operations PWA
// This is a basic service worker that caches assets for offline use
// Updated to support push notifications

const CACHE_NAME = 'restaurant-ops-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event - handle push notifications
self.addEventListener('push', event => {
  console.log('Push notification received');
  
  const options = {
    body: '您有新的任务提醒',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.data = data.data || options.data;
      
      event.waitUntil(
        self.registration.showNotification(data.title || '任务提醒', options)
      );
    } catch (e) {
      // 如果不是 JSON，直接使用文本
      options.body = event.data.text();
      event.waitUntil(
        self.registration.showNotification('任务提醒', options)
      );
    }
  } else {
    event.waitUntil(
      self.registration.showNotification('任务提醒', options)
    );
  }
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked');
  event.notification.close();

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If the app is already open, focus it
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        // If app is not open, open it
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Message event - handle messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});