// Birdseye FC offline support. App files are cached when the app installs and refreshed in the
// background; fonts and libraries from CDNs are cached the first time they load.
const CACHE = "birdseye-3402f50ad1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-512-maskable.png", "looks/arcade.js", "looks/broadcast.js", "looks/stadium3d.js", "sound/crowd.js", "library/clips.js"];

self.addEventListener("install", event => {
  // Fetch fresh copies (not the browser's HTTP cache) so a new build never installs stale files
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin === location.origin) {
    // App files: answer from the cache straight away, update it from the network
    event.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const fresh = fetch(request, { cache: "no-cache" })
        .then(response => { if (response.ok) cache.put(request, response.clone()); return response; })
        .catch(() => cached);
      return cached || fresh;
    }));
  } else {
    // CDN fonts and libraries: network first, cached copy when offline
    event.respondWith(
      fetch(request)
        .then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response; })
        .catch(() => caches.match(request))
    );
  }
});
