/* Offline cache for the trip site: precaches the app shell and every
   encrypted booking PDF so the itinerary + 憑證 work without network
   (map tiles still need to be online). Bump VERSION whenever index.html
   or any docs/*.bin changes so clients refetch. */
const VERSION = 'v3';
const CACHE = 'tim-' + VERSION;

const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/docs/hotel-mail.bin',
  '/docs/scoot-itinerary.bin',
  '/docs/scoot-receipt.bin',
  '/docs/scoot-mail.bin',
  '/docs/skyduck-confirm.bin',
  '/docs/skyduck-payment.bin',
  '/docs/vasara-mail.bin',
  '/docs/insurance-policy.bin',
  '/docs/jetstar-eticket.bin',
  '/docs/jetstar-eticket-en.bin',
  '/docs/jetstar-receipt.bin',
  '/docs/jetstar-mail.bin'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (url.origin === location.origin) {
    // the page itself: network-first so new deploys land, cache when offline
    if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
      e.respondWith(
        fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/', copy));
          return res;
        }).catch(() => caches.match('/'))
      );
      return;
    }
    // docs + icons + manifest: cache-first (VERSION bump busts them)
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  // Google Fonts: cache-first best effort so typography survives offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => Response.error()))
    );
  }
  // maps.googleapis.com is intentionally not handled — the map needs network
});
