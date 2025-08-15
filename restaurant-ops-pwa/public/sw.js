// Service Worker for Restaurant Operations PWA
// This is a basic service worker that caches assets for offline use
// Updated to support push notifications
// Updated 2025-01-14: Added face recognition model caching
// Updated 2025-08-15: Enhanced model caching for offline-first strategy

const CACHE_NAME = 'restaurant-ops-v4'; // Updated to force cache refresh
const MODEL_CACHE_NAME = 'face-models-v2'; // Separate cache for models
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
  event.waitUntil(
    Promise.all([
      // Cache general assets
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Opened general cache');
        return cache.addAll(urlsToCache);
      }),
      // Pre-cache model files for offline use
      caches.open(MODEL_CACHE_NAME).then(cache => {
        console.log('[SW] Pre-caching model files...');
        return Promise.allSettled(
          modelFiles.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(err => {
                console.warn(`[SW] Failed to pre-cache ${url}:`, err);
                // Don't fail installation if model pre-caching fails
              })
          )
        );
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
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
            console.log('[SW] Model from cache (offline-first):', url.pathname);
            // Try to update cache in background if online
            if (navigator.onLine) {
              fetch(event.request)
                .then(networkResponse => {
                  if (networkResponse && networkResponse.status === 200) {
                    cache.put(event.request, networkResponse.clone());
                    console.log('[SW] Model cache updated in background:', url.pathname);
                  }
                })
                .catch(() => {}); // Ignore errors in background update
            }
            return cachedResponse;
          }
          
          // Not in cache, try to fetch with timeout
          console.log('[SW] Model not cached, attempting fetch:', url.pathname);
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
              console.log('[SW] Model fetched and cached:', url.pathname);
            }
            return networkResponse;
          }).catch(error => {
            console.error('[SW] Failed to fetch model:', url.pathname, error);
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

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, MODEL_CACHE_NAME]; // Keep both caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
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