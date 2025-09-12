// Service Worker for Restaurant Operations PWA
// This is a basic service worker that caches assets for offline use
// Updated to support push notifications
// Updated 2025-01-14: Added face recognition model caching
// Updated 2025-08-15: Enhanced model caching for offline-first strategy
// Updated 2025-09-08: Implemented automatic version updates with cache busting

// Version will be replaced during build with timestamp or commit hash
const VERSION = '__BUILD_VERSION__';
const CACHE_NAME = `restaurant-ops-${VERSION}`;
const MODEL_CACHE_NAME = `face-models-${VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx'
];

// Model files to pre-cache
const modelFiles = [
  '/models/tiny_face_detector_model-weights_manifest.json',
  '/models/tiny_face_detector_model-shard1.bin',
  '/models/face_landmark_68_model-weights_manifest.json',
  '/models/face_landmark_68_model-shard1.bin',
  '/models/face_recognition_model-weights_manifest.json',
  '/models/face_recognition_model-shard1.bin',
  '/models/face_recognition_model-shard2.bin'
];

// Install event - cache assets and models
self.addEventListener('install', event => {
  // Remove all console logs in production
  event.waitUntil(
    Promise.all([
      // Cache general assets
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(urlsToCache);
      }),
      // Pre-cache model files for offline use
      caches.open(MODEL_CACHE_NAME).then(cache => {
        return Promise.allSettled(
          modelFiles.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(err => {
                // Don't fail installation if model pre-caching fails
              })
          )
        );
      })
    ]).then(() => {
      // Skip waiting to activate immediately
      self.skipWaiting();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Special handling for face recognition models - OFFLINE FIRST
  if (url.pathname.includes('/models/') && 
      (url.pathname.endsWith('.bin') || url.pathname.endsWith('.json'))) {
    event.respondWith(
      caches.open(MODEL_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            // Only log in development or when explicitly debugging
            // console.log('[SW] Model from cache (offline-first):', url.pathname);
            // Return cached response directly - no background updates
            // This prevents unnecessary network requests and improves performance
            return cachedResponse;
          }
          
          // Not in cache, try to fetch with timeout
          return Promise.race([
            fetch(event.request),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Model fetch timeout')), 10000)
            )
          ]).then(networkResponse => {
            // Cache successful response
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              cache.put(event.request, responseToCache);
            }
            return networkResponse;
          }).catch(error => {
            // Return a 503 Service Unavailable response
            return new Response('Model unavailable - please check network connection', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        });
      })
    );
    return;
  }
  
  // Skip caching for API requests
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('supabase.in') ||
      url.hostname.includes('localhost') && url.port === '54321') {
    // API requests should always go to network
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Skip caching for non-GET requests (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Skip caching for data URLs (base64 images, etc.)
  if (url.protocol === 'data:') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Only cache static assets (HTML, CSS, JS, images)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // No cache hit - fetch from network
        return fetch(event.request).then(networkResponse => {
          // Only cache successful responses for static assets
          if (networkResponse && networkResponse.status === 200 && 
              networkResponse.type === 'basic' &&
              (url.pathname.endsWith('.html') ||
               url.pathname.endsWith('.js') ||
               url.pathname.endsWith('.css') ||
               url.pathname.endsWith('.png') ||
               url.pathname.endsWith('.jpg') ||
               url.pathname.endsWith('.svg') ||
               url.pathname === '/')) {
            // Clone the response before caching
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      }
    ).catch(() => {
      // Network request failed, try to serve a cached offline page
      return caches.match('/index.html');
    })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, MODEL_CACHE_NAME]; // Keep both caches
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients immediately
      clients.claim().then(() => {
        // Notify all clients about the update
        clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: VERSION
            });
          });
        });
      })
    ])
  );
});

// Push event - handle push notifications
self.addEventListener('push', event => {
  
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
  
  // Handle version check request
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
  
  // Handle force refresh message
  if (event.data && event.data.type === 'FORCE_REFRESH') {
    // Clear all caches
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      
      // Skip waiting and claim all clients
      self.skipWaiting();
      
      // Notify all clients to refresh
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_CLEARED',
            message: 'All caches have been cleared'
          });
        });
      });
    });
  }
});