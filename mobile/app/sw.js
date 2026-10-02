/* Field Sales service worker: receives Web Push from the backend (VAPID), shows the notification,
   and opens the action in the app when it is tapped. Payload: {title, body, data: {type, aid, so, ...}} */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const appClients = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  .then((l) => l.filter((c) => c.url.startsWith(self.registration.scope)));

self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (_) { p = { title: 'Field Sales', body: e.data ? e.data.text() : '' }; }
  const data = p.data || {};
  e.waitUntil(Promise.all([
    // an open app refreshes its bell and tracker straight away
    appClients().then((l) => l.forEach((c) => c.postMessage({ type: 'push', data }))),
    self.registration.showNotification(p.title || 'Field Sales', {
      body: p.body || '',
      icon: 'icon.png',
      badge: 'icon.png',
      tag: data.aid ? data.type + ':' + data.aid : undefined,
      renotify: !!data.aid,
      data,
    }),
  ]));
});

// a tap while the app is open in the background: also kept here until the app asks for it (or says it opened it),
// because a suspended page can miss the message (iPhone)
let pendingOpen = null;
self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'pending?') {
    const p = pendingOpen; pendingOpen = null;
    if (p && Date.now() - p.ts < 60000 && e.source) e.source.postMessage({ type: 'open', aid: p.aid });
  } else if (m.type === 'opened') pendingOpen = null;
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  const url = self.registration.scope + (d.so ? '?so=' + encodeURIComponent(d.so) : '') + (d.aid ? '#a=' + encodeURIComponent(d.aid) : '');
  e.waitUntil(appClients().then((l) => {
    const c = l.find((x) => 'focus' in x);
    // the app opens the action itself (it waits until it has loaded); if the window can't be focused, open a new one
    if (c) { if (d.aid) pendingOpen = { aid: d.aid, ts: Date.now() }; c.postMessage({ type: 'open', aid: d.aid }); return c.focus().catch(() => self.clients.openWindow(url)); }
    return self.clients.openWindow(url);
  }));
});
