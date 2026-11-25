const CACHE = 'sfc-app-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  // The page itself: try the network first so updates arrive, fall back to the saved copy offline.
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); return res; })));
    return;
  }
  // Google Fonts: use the saved copy if there is one, refresh it in the background.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(m => {
      const net = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m);
      return m || net;
    })));
  }
});
