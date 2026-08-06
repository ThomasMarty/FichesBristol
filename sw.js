const version = "2026.06.02-01";
const CACHE_NAME = `fiches-bristol-${version}`;

const APP_STATIC_RESOURCES = [
    "/",
    "/index.html",
    "/sakura.css",
    "/style.css",
    "/app.js",
    "/icon.svg"
]

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            cache.addAll(APP_STATIC_RESOURCES);
        })(),
    );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        }),
      );
      await clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // Lorsqu'on cherche une page HTML
  if (event.request.mode === "navigate") {
    // On renvoie à la page index.html
    event.respondWith(caches.match("/"));
    return;
  }

  // Pour tous les autres types de requête
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request.url);
      if (cachedResponse) {
        // On renvoie la réponse mise en cache si elle est disponible.
        return cachedResponse;
      }
      // On répond avec une réponse HTTP au statut 404.
      return new Response(null, { status: 404 });
    })(),
  );
});