// ChronoMind Service Worker – Auto-Updates via skipWaiting + controllerchange
const CACHE = 'chronomind-v1'
const APP_SHELL = ['/app_main', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIPWAITING') self.skipWaiting()
})

// Wake-Reminder-Push: Tap fokussiert die App (öffnet sie notfalls neu)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/app_main'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // API nie cachen (Cloud-Sync immer live)
  if (url.pathname.startsWith('/api/')) return

  // Navigation: network-first, Fallback Cache, dann App-Shell (offlinefähig)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
          return res
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('/app_main'))
        )
    )
    return
  }

  // Statische Assets: stale-while-revalidate
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const fetchPromise = fetch(req).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
          return res
        })
        return hit || fetchPromise
      })
    )
  }
})
