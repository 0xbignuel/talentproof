const CACHE = 'talentproof-v3-identity';
const SHELL = ['/', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest', '/fonts/dm-sans.ttf'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    const response = await cache.match('/');
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+)"/g)].map(match => match[1].replace(/&amp;/g, '&'));
    await cache.addAll([...new Set(assets)]);
  })());
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('talentproof-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Public portfolios and APIs must never enter the offline cache.
  if (event.request.mode === 'navigate' && url.pathname === '/') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put('/', copy)); }
      return response;
    }).catch(() => caches.match('/')));
  } else if (url.pathname.startsWith('/_next/static/') || SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
      return response;
    })));
  }
});
