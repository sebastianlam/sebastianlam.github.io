const CACHE = 'cv-cache-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon-180.png',
    '/og-image.jpg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        try {
            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable();
            }
        } catch (e) {}
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    })());
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const isNavigate = req.mode === 'navigate';
    const url = new URL(req.url);
    const isSameOrigin = url.origin === location.origin;
    const isCssJs = isSameOrigin && (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.webmanifest'));
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        if (isNavigate) {
            try {
                const preload = self.registration.navigationPreload ? await event.preloadResponse : null;
                const resp = preload || await fetch(req);
                return resp;
            } catch (e) {
                const fallback = await cache.match('/index.html');
                if (fallback) return fallback;
            }
        }
        // Network-first for CSS/JS so style/script updates are not stuck behind cache
        if (isCssJs) {
            try {
                const resp = await fetch(req);
                cache.put(req, resp.clone());
                return resp;
            } catch (e) {
                const cached = await cache.match(req);
                if (cached) return cached;
                const offline = await cache.match('/index.html');
                return offline || Response.error();
            }
        }
        // Cache-first for other requests (images, icons, etc.)
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
            const resp = await fetch(req);
            cache.put(req, resp.clone());
            return resp;
        } catch (e) {
            const offline = await cache.match('/index.html');
            return offline || Response.error();
        }
    })());
});


