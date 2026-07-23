/* Service Worker — "Mis Gastos"
   Estrategia: cache-first con actualización en segundo plano.
   Funciona en cualquier subcarpeta (ej. GitHub Pages: /usuario/repo/). */

const VERSION = "v1.0.0";
const CACHE_NAME = "mis-gastos-" + VERSION;

// Ruta base donde vive este service worker (soporta subcarpetas de GitHub Pages)
const BASE = new URL(".", self.location).pathname;

const ASSETS = [
  "",               // index.html vía la ruta base
  "index.html",
  "manifest.json",
  "css/styles.css",
  "js/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
].map(p => BASE + p);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("mis-gastos-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navegaciones: intenta red, si falla sirve el index cacheado (SPA offline)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(BASE + "index.html"))
    );
    return;
  }

  // Resto de assets: cache-first, con actualización silenciosa en segundo plano
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
