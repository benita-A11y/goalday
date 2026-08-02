/* 计划册 Service Worker - 离线可用 + 每次刷新拉取最新
   v43 重大修复：导航请求（HTML 页面）一律 network-first
   —— v42 的 SHELL_RE 只匹配 /index.html 结尾的 URL，但用户访问 /goalday/ 时
   pathname 是 /goalday/ 不匹配 → 落入 cache-first → 永远返回旧 HTML！
   修复：用 e.request.mode==='navigate' 捕获所有页面导航，保证每次拉最新 HTML。 */
const CACHE = "jihua-v44";
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
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 所有导航请求 + shell 资源一律 network-first：
   - 导航请求（mode==='navigate'）：覆盖 /goalday/、/goalday/index.html、/goalday/?v=xxx 等所有页面 URL
   - shell 资源（JS/CSS/manifest/version.json）：network-first 保证更新必达
   - 其余资源（图标等）：缓存优先，离线可用 */
const SHELL_RE = /\/(index\.html|styles\.css|app\.js|plus\.js|manifest\.webmanifest|version\.json)$/;

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  /* 关键修复：导航请求 + shell 资源走 network-first */
  if (e.request.mode === "navigate" || SHELL_RE.test(url.pathname)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./")))
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
