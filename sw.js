const version = "2026.09.18-3";
const CACHE_NAME = `fiches-bristol-${version}`;

const APP_STATIC_RESOURCES = [
    "/",
    "/app.js",
    "/manifest.json",
    "/index.html",
    "/style.css",
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
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            
            // Essai 1 : chercher la clé "/"
            let reponse = await cache.match("/");
            if (reponse) return reponse;
            
            // Essai 2 : chercher la clé "/index.html" (fallback si "/" ne matche pas)
            reponse = await cache.match("/index.html");
            if (reponse) return reponse;
            
            // Essai 3 : dernier recours, aller chercher sur le réseau
            try {
                return await fetch(event.request);
            } catch (err) {
                // Si même le réseau échoue (hors ligne), on renvoie une vraie Response,
                // jamais null/undefined, pour ne jamais casser respondWith()
                return new Response("Page indisponible hors ligne.", { status: 503 });
            }
        })()
        );
        return;
    }

  // Pour tous les autres types de requête

  if (event.request.url.includes("/fiches/")) {
      // CACHE FIRST (avec fallback réseau en dernier recours)
event.respondWith(
    (async () => {
        const cache = await caches.open(CACHE_NAME);

        // Essai 1 : chercher en cache
        const cachedResponse = await cache.match(event.request.url);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Essai 2 : dernier recours, aller chercher sur le réseau
        try {
            const reponseReseau = await fetch(event.request);
            // On met en cache au passage, pour que la prochaine fois
            // ce fichier soit trouvé directement à l'étape 1
            cache.put(event.request, reponseReseau.clone());
            return reponseReseau;
        } catch (err) {
            // Si même le réseau échoue, on renvoie une vraie Response,
            // jamais null/undefined
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
      const cachedResponse = await cache.match(event.request.url);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response(null, { status: 404 });
    })()
  );
});
