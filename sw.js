// 凉丸瓶工作台 · Service Worker（离线缓存，PWA）
var CACHE = "lwp-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./content.js",
  "./valuation.js",
  "./sectors.js",
  "./analysis.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  // 腾讯行情等跨域接口走网络实时拉取，不缓存
  if (url.origin !== self.location.origin) return;
  var path = url.pathname;
  // 业务文件（html/js 及首页）联网取最新，失败降级用缓存
  var dynamic = path === "/" || /\.(html|js)$/.test(path);
  if (dynamic) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }
  // 静态资源（图标、manifest）缓存优先
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    })
  );
});
