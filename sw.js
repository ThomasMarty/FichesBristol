const version = "2026.10.10-12";
const CACHE_NAME = `fiches-bristol-${version}`;

const APP_STATIC_RESOURCES = [
    "/",
    "/app.js",
    "/manifest.json",
    "/index.html",
    "/style.css",
    "/lib/marked.min.js",
    "/lib/purify.min.js",
    "/lib/katex/katex.min.css",
    "/lib/katex/katex.min.js",
    "/lib/katex/contrib/auto-render.min.js",
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
            await cache.addAll(APP_STATIC_RESOURCES);
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
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const url = new URL(event.request.url)
            
            // Uniquement pour l'accueil : on sert l'app depuis le cache
            if (url.pathname === "/" || url.pathname === "/index.html") {
                let reponse = await cache.match("/");
                if (reponse) return reponse;

                reponse = await cache.match("/index.html");
                if (reponse) return reponse;
            }

            // Toute autre page (outil-lot.html...) : réseau, sinon cache
            try {
                return await fetch(event.request);
            } catch (err) {
                const enCache = await cache.match(event.request);
                if (enCache) return enCache;
                return new Response("Page indisponible hors ligne.", { status: 503 });
            }
        })()
        );
        return;
    }

  if (event.request.url.includes("/fiches/")) {
      // NETWORK FIRST (repli sur le cache si hors ligne)
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const reponseReseau = await fetch(event.request);
          // On met en cache au passage, pour que la prochaine fois
          // ce fichier soit trouvé directement à l'étape 1
          if (reponseReseau.ok) {
            cache.put(event.request, reponseReseau.clone());
          }
          return reponseReseau;
        } catch (err) {
          // Si même le réseau échoue, on renvoie une vraie Response,
          // jamais null/undefined
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }

          return new Response("Ressource indisponible.", { status: 404 });
        }
      })()
    );
    return;
  }
  
  // CACHE FIRST (comportement existant, pour tout le reste)
    event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const reponseReseau = await fetch(event.request);

        if (reponseReseau.ok) {
          cache.put(event.request, reponseReseau.clone());
        }
        return reponseReseau;
      } catch (err) {
        return new Response("Ressource indisponible.", { status: 404 });
      }
    })()
  );
});
