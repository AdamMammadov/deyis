const CACHE_NAME = 'urbanflow-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/routes.html',
  '/services.html',
  '/stats.html',
  '/css/style.css',
  '/js/main.js',
  '/js/map.js',
  '/js/chart.js',
  '/js/ai-routing.js',
  '/js/service.js',
  '/js/alerts.js',
  '/assets/data/traffic.json',
  '/assets/data/services.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request).then(res => res || fetch(evt.request).catch(()=> caches.match('/index.html')))
  );
});
