// 凉丸瓶工作台 · Service Worker（离线缓存，PWA）
// 策略：缓存优先，后台刷新。沙箱/网络异常时也能从本地缓存打开，不白屏。
var CACHE = "lwp-v3";
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

// 后台刷新缓存：联网成功就更新，失败也不影响当前响应
function refreshCache(request) {
  return fetch(request).then(function (res) {
    if (!res || res.status !== 200 || res.type !== "basic") return res;
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(request, copy); });
    return res;
  }).catch(function () { /* 静默失败，缓存兜底 */ });
}

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  // 腾讯行情等跨域接口走网络实时拉取，不缓存
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      // 命中缓存：立刻返回，同时后台去拉最新版更新缓存
      if (hit) {
        refreshCache(e.request);
        return hit;
      }
      // 没命中：联网拉，同时写入缓存
      return fetch(e.request).then(function (res) {
        if (!res || res.status !== 200 || res.type !== "basic") return res;
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    })
  );
});
