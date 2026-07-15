// Minimal service worker — enough for real installability (Chrome requires an
// active SW with a fetch handler) without risking stale content. It deliberately
// does NOT cache page navigations or Next.js's RSC/chunk requests: caching those
// naively (network-first, fall back to cache on any hiccup) can serve a stale
// route on a transient network blip, which is worse than no offline support at
// all. Only a small set of truly static, rarely-changing assets are cached.
// The real offline write-queue (IndexedDB) described in DEVELOPMENT_PLAN.md's
// Platform Foundations lands with the check-in/scan features that need it.
const CACHE_NAME = "evento-static-v2";
const STATIC_ASSETS = ["/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isStaticAsset = event.request.method === "GET" && STATIC_ASSETS.includes(url.pathname);
  if (!isStaticAsset) return; // let the browser handle everything else normally

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
  );
});
