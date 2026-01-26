/* sw.js */
const CACHE_NAME = 'bilingual-toolkit-v0.1';

// 1. Core Assets: These are critical for the app shell and must be cached immediately.
const CORE_ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './manifest.json'
];

// 2. Install Phase: Cache the core assets
self.addEventListener('install', event => {
    self.skipWaiting(); // Force this SW to become active immediately
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Pre-caching core assets');
                return cache.addAll(CORE_ASSETS);
            })
            .catch(err => console.error('[SW] Pre-cache failed:', err))
    );
});

// 3. Activate Phase: Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    // Delete any cache that doesn't match the current CACHE_NAME
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Clearing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all pages immediately
    );
});

// 4. Fetch Phase: The Strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // STRATEGY: Network Only (Do NOT Cache)
    // - Supabase API calls (Data must be fresh)
    // - YouTube Video streams/API (Complex streaming logic handled by browser)
    // - Extension schemes (chrome-extension://)
    if (
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('youtube.com') ||
        url.hostname.includes('googlevideo.com') ||
        url.protocol.includes('extension')
    ) {
        return; // Fallback to standard network request
    }

    // STRATEGY: Stale-While-Revalidate (or Cache First with fallback)
    // For everything else (HTML, JS Libraries, CSS, Fonts)
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // A. If found in cache, return it immediately (Fastest)
            if (cachedResponse) {
                return cachedResponse;
            }

            // B. If not in cache, fetch from network
            return fetch(event.request)
                .then(networkResponse => {
                    // Check if we received a valid response
                    if (
                        !networkResponse || 
                        networkResponse.status !== 200 || 
                        networkResponse.type !== 'basic' && networkResponse.type !== 'cors'
                    ) {
                        return networkResponse;
                    }

                    // C. Clone the response and store it in cache for next time
                    // This creates a "Runtime Cache" for your CDN libraries (Alpine, Tailwind, etc.)
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                })
                .catch(err => {
                    // Network failed (Offline)
                    console.log('[SW] Fetch failed (Offline):', err);
                    // You could return a custom offline.html here if you created one
                });
        })
    );
});
