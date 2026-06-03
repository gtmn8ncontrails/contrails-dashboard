// ============================================
// CONTRAILS AI — SERVICE WORKER
// sw.js — Enables offline support & PWA install
// ============================================

const CACHE_NAME = 'contrails-ai-v1';

// Files to cache for offline use
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './mock-data.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
];

// Install: precache shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets; ignore failures for external (fonts)
      return Promise.allSettled(PRECACHE.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Google Sheets API calls: network-only (always fresh)
// - n8n webhooks: network-only
// - Everything else: cache-first, fallback to network
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Always go to network for API calls
  if (
    url.includes('sheets.googleapis.com') ||
    url.includes('n8n.cloud') ||
    url.includes('/webhook/') ||
    event.request.method !== 'GET'
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
