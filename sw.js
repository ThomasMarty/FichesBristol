const version = "2026.09.13-2";
const CACHE_NAME = `fiches-bristol-${version}`;

const APP_STATIC_RESOURCES = [
    "/",
    "/app.js",
    "/index.html",
    "/style.css",
    "/lib/sakura.css",
    "/lib/marked.min.js",
    "/lib/purify.min.js",
    "/icons/icon.svg",
    "/icons/icon.png",
    "/icons/icon-white.svg",
    "/icons/icon-white.png",
    "/icons/icon-black.svg",
    "/icons/icon-black.png",
    "/fiches/index.json"
]

self.addEventListener("install", (event) => {
    self.skipWaiting();
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
  
  if (event.request.mode === "navigate") {
    // On renvoie à la page index.html
    event.respondWith(caches.match("/"));
    return;
  }

  // Pour tous les autres types de requête

  if (event.request.url.includes("/fiches/")) {
    // NETWORK FIRST, avec mise en cache
    event.respondWith(

      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const reponseReseau = await fetch(event.request)

          cache.put(event.request, reponseReseau.clone());
          return reponseReseau;

        } catch (err) {
          const cachedResponse = await cache.match(event.request.url);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(null, { status: 404 });
        }
      })()
    );
    return;
  }
  
  // CACHE FIRST (comportement existant, pour tout le reste)
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request.url);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response(null, { status: 404 });
    })()
  );
});