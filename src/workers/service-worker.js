// The build script inserts the real build ID and complete asset list.
const CACHE = 'talentproof-offline-__BUILD_ID__';
const ASSETS = __ASSETS__;
self.addEventListener('install', event => {
  event.waitUntil((async () => { const cache = await caches.open(CACHE); await cache.addAll(ASSETS); await self.skipWaiting(); })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => { const names = await caches.keys(); await Promise.all(names.filter(name => name.startsWith('talentproof-') && name !== CACHE).map(name => caches.delete(name))); await self.clients.claim(); })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Neither private data, public portfolios, API responses nor exports enter this cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/p/')) return;
  if (event.request.mode === 'navigate' && url.pathname === '/') {
    event.respondWith((async () => {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 3500);
      try { const response = await fetch(event.request, { signal: controller.signal }); if (response.ok) { const cache = await caches.open(CACHE); await cache.put('/', response.clone()); return response; } return (await caches.match('/')) || response; }
      catch { return (await caches.match('/')) || new Response('Ouvrez TalentProof une première fois avec une connexion.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
      finally { clearTimeout(timeout); }
    })());
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith((async () => { const cached = await caches.match(url.pathname); if (cached) return cached; const response = await fetch(event.request); if (response.ok) { const cache = await caches.open(CACHE); await cache.put(url.pathname, response.clone()); } return response; })());
  }
});
