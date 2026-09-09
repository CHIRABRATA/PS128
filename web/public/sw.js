const CACHE_NAME = "maitri-v2-static";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/farmer",
  "/farmer/report",
  "/agent",
  "/vet",
];

// Install Event: Cache core static app shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Non-critical error pre-caching static assets:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Stale-While-Revalidate for static assets; Network-Only for private API/Actions
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // DO NOT intercept cross-origin third-party requests (OpenStreetMap tiles, Clerk, external CDNs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // DO NOT cache authenticated API routes or server actions (except /api/health)
  if (url.pathname.startsWith("/api/") && url.pathname !== "/api/health") {
    return; // Allow browser to perform default network request
  }

  // Network-first for HTML page navigation to preserve fresh server state
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/");
        });
      })
    );
    return;
  }

  // Stale-While-Revalidate for same-origin static JS, CSS, and media assets
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".json")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
