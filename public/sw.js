// public/sw.js — Service Worker para notificaciones push

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Recibir notificación push
self.addEventListener('push', e => {
  let data = { title: '📥 EduGestión', body: 'Tenés novedades.' };
  try {
    if (e.data) data = e.data.json();
  } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title || '📥 EduGestión', {
      body: data.body || '',
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: data.url ? { url: data.url } : {},
      vibrate: [200, 100, 200],
      requireInteraction: false,
      tag: 'edugestion-push'
    })
  );
});

// Click en la notificación → abrir la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
