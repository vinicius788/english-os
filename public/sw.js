const CACHE = 'english-os-shell-v2';
const BASE = new URL('./', self.registration.scope).pathname;
const SHELL = new URL(BASE, self.location.origin).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([
    SHELL,
    `${BASE}manifest.webmanifest`,
    `${BASE}icon.svg`,
  ])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('english-os-shell-') && key !== CACHE).map((key) => caches.delete(key)),
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) void caches.open(CACHE).then((cache) => cache.put(SHELL, response.clone()));
      return response;
    }).catch(async () => (await caches.match(SHELL)) || Response.error()));
    return;
  }

  if (url.pathname.startsWith(`${BASE}assets/`) || url.pathname === `${BASE}manifest.webmanifest` || url.pathname === `${BASE}icon.svg`) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) void caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});
