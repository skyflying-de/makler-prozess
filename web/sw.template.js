/* Makler-Prozess – Service Worker der Browser-App: App-Dateien offline vorhalten.
   Daten und Dokumente liegen in IndexedDB; Cloud-Zugriffe laufen nie über diesen Zwischenspeicher. */
const CACHE = "__CACHE__";
const FILES = __FILES__;
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("mp-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (/\.apk$/i.test(u.pathname)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: e.request.mode === "navigate" || u.pathname.endsWith("auth.html") });
    if (hit) return hit;
    try { return await fetch(e.request); }
    catch (x) { return e.request.mode === "navigate" ? (await c.match("./index.html")) || Response.error() : Response.error(); }
  }));
});
