// Service worker du back-office GET Admission — volontairement minimal :
// aucune mise en cache des pages ni des réponses API (données dossiers/paiements
// toujours fraîches). Sert uniquement à satisfaire les critères d'installabilité
// (icône "installer l'application" dans le navigateur, ajout à l'écran d'accueil).
// Enregistré avec { scope: "/admin" } — ne s'active que sous /admin/*.

const STATIC_CACHE = "ga-admin-static-v1";
const STATIC_ASSETS = ["/favicon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Passthrough réseau pour tout, sauf les icônes statiques (cache-first, jamais périmées).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
    );
    return;
  }
  event.respondWith(fetch(event.request));
});
