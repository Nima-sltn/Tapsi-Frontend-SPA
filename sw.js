/**
 * Offline support (Progressive Web App).
 *
 * Strategy
 *  - App shell (HTML/CSS/JS/fonts/hero): precached on install, then
 *    served stale-while-revalidate so updates land on the next visit.
 *  - Navigations: network-first with a cached `index.html` fallback so the
 *    site keeps working offline.
 *  - Everything else (images, icons): cache-first with background refresh.
 *
 * Bump CACHE_VERSION whenever a precached asset changes.
 */
const CACHE_VERSION = "tapsi-shell-v3";

const PRECACHE_ASSETS = [
  "./",
  "index.html",
  "css/style.css",
  "css/fonts.css",
  "js/main.js",
  "js/modules/feedback.js",
  "js/modules/nav.js",
  "js/modules/tabs.js",
  "js/modules/theme.js",
  "js/modules/reveal.js",
  "js/modules/carousel.js",
  "js/modules/form.js",
  "js/modules/fare.js",
  "js/modules/calculator.js",
  "js/modules/progress.js",
  "manifest.webmanifest",
  "assets/images/favicon.svg",
  "assets/images/logo.svg",
  "assets/images/tapsi-logo-white.svg",
  "assets/images/svg-sprite.svg",
  "assets/fonts/Vazir-Regular.woff",
  "assets/fonts/Vazir-Bold.woff",
  "assets/images/banner-opt.webp",
  "assets/images/banner-mobile.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: network first, cached shell as the offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("index.html", copy));
          return response;
        })
        .catch(() => caches.match("index.html").then((cached) => cached || Response.error()))
    );
    return;
  }

  // Code (CSS/JS/manifest): network first, cached copy only as the offline
  // fallback — so an edit is never masked by a stale cached file.
  const isCode = /\.(?:css|js|mjs)$/.test(url.pathname) || url.pathname.endsWith(".webmanifest");
  if (isCode) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Images & fonts: stale-while-revalidate — answer from cache instantly,
  // refresh the cache in the background so the next visit gets updates.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
