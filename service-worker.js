/* Retired service worker — self-destruct / kill switch.
   This app is now an online-only web app (no offline cache, not installable).
   The previous versions shipped a cache-first SW; returning browsers still have
   it installed and would keep serving the old cached app forever. Browsers
   re-fetch this script on navigation, so the moment they pick up this version it
   clears every cache, unregisters itself, and reloads open tabs to pull a fresh,
   uncached copy from the network. Once all clients have flushed, this file (and
   its registration) can be deleted entirely. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url)); // reload -> fresh from network
  })());
});
