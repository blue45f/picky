/* pickflow service worker — 설치 가능(PWA) + 오프라인 안전 폴백.
 * 전략: 내비게이션=네트워크 우선(온라인은 항상 최신), 해시 정적자산=캐시 우선,
 * API/OG(/api·/share)=캐시하지 않음. 콘텐츠 해시 자산만 영구 캐시하므로 stale 위험이 없어요. */
const CACHE = 'pickflow-static-v1';
const APP_SHELL = '/';
const PRECACHE = ['/', '/manifest.webmanifest', '/pwa-192.png', '/pwa-512.png', '/og-default.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  // API와 서버 렌더 OG 페이지는 항상 네트워크에서 (캐시 금지)
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/share')) {
    return;
  }

  // 내비게이션: 네트워크 우선 → 실패 시 캐시된 앱 셸
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(APP_SHELL, copy))
            .catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(APP_SHELL).then((cached) => cached || caches.match(request))),
    );
    return;
  }

  // 콘텐츠 해시 정적 자산: 캐시 우선(불변)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches
              .open(CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => undefined);
            return response;
          }),
      ),
    );
    return;
  }

  // 그 외: 네트워크 → 실패 시 캐시
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
