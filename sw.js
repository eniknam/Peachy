const CACHE_NAME = 'offline-v1';
const ASSETS = [
  'index.html',
  'app.js',
  'manifest.json'
];

// Install stage: Saves the files into the phone's long-term memory cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch stage: Forces the app to load directly from the phone memory instead of looking for internet
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
