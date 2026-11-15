/* Service Worker für Web Push. Kein Cache: die App bleibt serverseitig. */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'VYRX', body: '', href: '/' };
  try {
    const parsed = event.data?.json();
    if (parsed && typeof parsed.title === 'string') {
      payload = {
        title: parsed.title,
        body: typeof parsed.body === 'string' ? parsed.body : '',
        href: typeof parsed.href === 'string' && parsed.href.startsWith('/') ? parsed.href : '/',
      };
    }
  } catch {
    /* Kein JSON: der neutrale Titel bleibt. */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { href: payload.href },
      tag: `vyrx-${payload.title}`,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = event.notification.data?.href || '/';
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(href);
          return;
        }
      }
      await self.clients.openWindow(href);
    })(),
  );
});
