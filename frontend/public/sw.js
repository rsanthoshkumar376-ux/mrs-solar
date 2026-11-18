// MRS SOLAR Progressive Web App - Service Worker (v2.5.1 Ultra-Fast Network First)
const CACHE_NAME = 'mrs-solar-v2.5.1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

// Install: pre-cache static icons & manifest, skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate: clean ALL stale caches immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy:
// - Always bypass cache for API calls, uploads, and non-GET requests
// - Navigation requests (HTML): Network-first with fresh cache update
// - Static assets (.js, .css): Network-first for chunk files to prevent stale hashes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Always bypass cache for API calls, socket.io, uploads, and non-GET requests
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/socket.io/')
  ) {
    return;
  }

  // 2. Navigation requests (HTML pages): Network-first with fresh cache update
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request) || caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // 3. Static assets & chunks: Network-first to always run latest compiled code
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cType = networkResponse.headers.get('content-type') || '';
            // Guard: Never cache SPA HTML rewrite when requesting a JS chunk
            if (url.pathname.endsWith('.js') && !cType.includes('javascript')) {
              return networkResponse;
            }
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 4. Other static icons/fonts: Cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() => {
        // Return nothing on network fail for optional assets
      });
    })
  );
});
