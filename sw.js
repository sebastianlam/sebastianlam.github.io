const CACHE = 'cv-cache-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req)
                .then((resp) => {
                    const copy = resp.clone();
                    caches.open(CACHE).then((cache) => cache.put(req, copy));
                    return resp;
                })
                .catch(() => caches.match('/index.html'));
        })
    );
});


