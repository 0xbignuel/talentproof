// The build script inserts the real build ID and complete asset list.
const CACHE = 'talentproof-offline-oAAoHwOiE9WSwIh21osR7';
const ASSETS = ["/","/manifest.webmanifest","/icon.svg","/icon-192.png","/icon-512.png","/icon-maskable.png","/fonts/dm-sans.ttf","/_next/static/chunks/0cfffkvfy0dm_.js","/_next/static/chunks/0cz1d0mv5g_q7.js","/_next/static/chunks/0pdsciuf1nuw0.js","/_next/static/chunks/0r-yur70-ku2o.js","/_next/static/chunks/0umf92h1sb77c.js","/_next/static/chunks/0x21r2_pxz1_t.js","/_next/static/chunks/0ytf_v6hu94y3.js","/_next/static/chunks/1zl8s569z6ses.js","/_next/static/chunks/25gz2b-5v0oly.js","/_next/static/chunks/2khxl0v1q4i6n.js","/_next/static/chunks/3b4mxm4rsdnm9.css","/_next/static/chunks/3cfn99dbrcvvp.js","/_next/static/chunks/3woxx1l0eqkeb.css","/_next/static/chunks/turbopack-16__d1zwn9wg4.js","/_next/static/chunks/turbopack-1o11dam4_ptxz.js","/_next/static/chunks/turbopack-2c3mg3r-05n1w.js","/_next/static/chunks/turbopack-worker-1hrsqshz0gfey.js","/_next/static/media/pdf.worker.0b4kqiytegebd.ts","/_next/static/media/photo.worker.0dzd24_8b_6e6.ts","/_next/static/oAAoHwOiE9WSwIh21osR7/_buildManifest.js","/_next/static/oAAoHwOiE9WSwIh21osR7/_clientMiddlewareManifest.js","/_next/static/oAAoHwOiE9WSwIh21osR7/_ssgManifest.js"];
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
