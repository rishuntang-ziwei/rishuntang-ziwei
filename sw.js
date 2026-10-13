/* 國際日舜堂排盤 · 靜態資源快取（API 一律走網路） */
const CACHE_VERSION = 'rishuntang-ziwei-v1'
const PRECACHE = [
  './',
  './index.html',
  './chart.html',
  './css/theme.css',
  './vendor/site-config.js',
  './vendor/lunar.min.js',
  './vendor/iztro.min.js',
  './vendor/register-birth.js',
  './vendor/auth-common.js',
  './vendor/auth-login.js',
  './vendor/auth-app.js',
  './vendor/payment-ui.js',
  './vendor/pwa-register.js',
  './assets/zushi-jiangziya.png',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

function isApiRequest(url) {
  return url.pathname.includes('/api/') || url.hostname.includes('onrender.com')
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (isApiRequest(url)) return

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone()
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
