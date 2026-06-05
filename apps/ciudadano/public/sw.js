const CACHE_NAME = 'siagrd-v1';
const STATIC_ASSETS = [
  '/',
  '/alertas',
  '/autoproteccion',
  '/mapa',
  '/manifest.json',
];

// Instalar: pre-cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para estáticos, network-first para API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API: network-first, fallback a cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Estáticos: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const { title = 'SIAGRD Meta', body = 'Nueva alerta', nivel = 'AMARILLO', url = '/alertas' } = data;

  const NIVEL_ICONS = {
    VERDE: '/icons/icon-96.png',
    AMARILLO: '/icons/icon-96.png',
    NARANJA: '/icons/icon-96.png',
    ROJO: '/icons/icon-96.png',
  };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: NIVEL_ICONS[nivel] || '/icons/icon-96.png',
      badge: '/icons/icon-72.png',
      tag: 'siagrd-alerta',
      renotify: nivel === 'ROJO',
      requireInteraction: nivel === 'ROJO' || nivel === 'NARANJA',
      data: { url },
      vibrate: nivel === 'ROJO' ? [200, 100, 200, 100, 200] : [200],
    })
  );
});

// Click en notificación → abrir app en la URL correcta
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/alertas';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
