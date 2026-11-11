// Yarrie Dinner offline cache, version 1. Cache required artwork before claiming readiness.
const CACHE = 'yarrie-dinner-offline-v1';
const REQUIRED = ['./', './index.html', './theme.jpg'];
const OPTIONAL = ['./manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(REQUIRED);
    await Promise.all(OPTIONAL.map(url => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('yarrie-dinner-offline-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) (await caches.open(CACHE)).put('./index.html', response.clone());
        return response;
      } catch (_) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) (await caches.open(CACHE)).put(event.request, response.clone());
    return response;
  })());
});
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'CHECK_OFFLINE') return;
  event.waitUntil((async () => {
    const missing = [];
    for (const path of REQUIRED) if (!(await caches.match(path))) missing.push(path);
    if (event.ports[0]) event.ports[0].postMessage({ready:missing.length===0,missing});
  })());
});
