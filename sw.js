/* 计划册 Service Worker - 离线可用 + 每次刷新拉取最新
   v42 重大改动：index.html 不进预缓存、永远走 network-first
   —— iOS PWA 一旦预缓存旧 HTML 就顽固保留，导致复盘页结构错位/空白。必须保证每次打开都拉新 HTML。 */
const CACHE = "jihua-v42";
/* 注意：index.html 故意不在 ASSETS 里（不预缓存）。其他静态资源保留预缓存以保证离线可用。 */
const ASSETS = [
  "./",
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
  /* 清空所有旧版缓存（包括 jihua-v42 及之前所有版本） */
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 应用外壳一律 network-first（每次刷新先取服务器最新，更新本地缓存；离线时回退到缓存）：
   - index.html：必走 network，iOS PWA 必须每次拉新结构（autoSync meta 自检依赖）
   - styles.css/app.js/plus.js/manifest.webmanifest/version.json：network-first 保证更新必达
   - 其余资源（图标等）：缓存优先，离线可用 */
const SHELL_RE = /\/(index\.html|styles\.css|app\.js|plus\.js|manifest\.webmanifest|version\.json)$/;

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // 外部资源（CDN 等）不拦截

  if (SHELL_RE.test(url.pathname)) {
    /* shell 资源：network-first（iOS PWA 必杀：保证每次拉到最新） */
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

  // 其余资源（图标等）：缓存优先，离线可用
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match("./"));
    })
  );
});
