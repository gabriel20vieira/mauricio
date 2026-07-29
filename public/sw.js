// Minimal service worker — enables installability + light offline resilience.
// Bump this on every change to the caching rules: `activate` deletes every cache
// whose name differs, which is what evicts entries a previous version wrongly kept.
const CACHE = 'mauricio-v2';
const ASSETS = ['/', '/manifest.webmanifest', '/favicon.ico', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin: not ours

  // App data is NEVER cached. The cache-first branch below would otherwise answer
  // the re-fetch that follows a write with the pre-write response, so a new expense
  // or income only showed up after a reload.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/') || caches.match(req)));
    return;
  }
  // Cache-first applies to build output and static files only — an allowlist, so a
  // dynamic route added later is never cached by accident.
  const cacheable = url.pathname.startsWith('/_nuxt/')
    || ASSETS.includes(url.pathname)
    || /\.(?:css|js|mjs|png|jpe?g|svg|webp|avif|ico|woff2?)$/.test(url.pathname);
  if (!cacheable) return;

  // Static assets: cache-first, revalidate in background.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
