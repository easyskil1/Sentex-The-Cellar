/*
 * Sentex PWA service worker - kézzel, plugin nélkül (zéró-dependencia elv).
 * Stratégia:
 *  - navigáció (HTML): network-first → friss deploy jöjjön; offline-ban cache.
 *  - statikus (hash-elt JS/CSS/SVG, zene): cache-first, futásidőben feltöltve.
 * Csak same-origin GET-et kezel; a Google Fonts marad hálózati (offline-ban a
 * CSS system-ui fallbackre vált). A cache-nevet bumpold, ha tisztítani kell.
 */
const CACHE = 'sentex-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return; // csak same-origin

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        (await caches.open(CACHE)).put(req, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(req)) || (await caches.match('index.html')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh.ok) (await caches.open(CACHE)).put(req, fresh.clone());
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});
