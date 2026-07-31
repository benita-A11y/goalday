/* 计划册 Service Worker - 离线可用 + 每次刷新拉取最新 */
const CACHE = "jihua-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./plus.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 应用外壳（html/js/css）采用「网络优先」：每次刷新都先取服务器最新，
   更新本地缓存；仅在断网时回退到缓存，保证离线可用且更新必达。 */
const SHELL_RE = /\/(index\.html|styles\.css|app\.js|plus\.js|manifest\.webmanifest|version\.json)$/;

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // 外部资源（CDN 等）不拦截

  if (SHELL_RE.test(url.pathname)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  // 其余资源（图标等）缓存优先，离线可用
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
