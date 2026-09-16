const CACHE_NAME = 'checklist-agro-shell-v2';
const ASSETS = [
  './',
  './index.html',
  './vistoria.html',
  './styles.css',
  './offline-cache.js',
  './persist.js',
  './speech.js',
  './db-v8.js',
  './photo.js',
  './gps.js',
  './vistoria-add-item.js',
  './vistoria-medida-corretiva.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(ASSETS.map(x => cache.add(x))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.hostname.endsWith('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && url.origin === self.location.origin) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;

        if (event.request.mode === 'navigate') {
          const vistoria = await caches.match('./vistoria.html', { ignoreSearch: true });
          if (vistoria && url.pathname.endsWith('/vistoria.html')) return vistoria;

          const inicio = await caches.match('./index.html', { ignoreSearch: true });
          if (inicio) return inicio;
        }

        throw new Error('Recurso não disponível no cache offline.');
      })
  );
});
