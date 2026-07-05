/* Service worker del Dietari.
   Estratègia: primer xarxa (així les actualitzacions de Netlify arriben soles),
   i si no hi ha connexió, se serveix la còpia en memòria cau (mode offline). */
const CACHE = 'dietari-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // les crides de dades (Supabase POST/PATCH) van directes
  e.respondWith(
    fetch(req)
      .then(res => {
        // desa una còpia de les respostes bones per si es perd la connexió
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./') : undefined))
      )
  );
});
