/* Service worker del Dietari.
   Estratègia: primer xarxa (així les actualitzacions de Netlify arriben soles),
   i si no hi ha connexió, se serveix la còpia en memòria cau (mode offline). */
const CACHE = 'dietari-v3';

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
  // MAI tocar ni desar en cau res de Supabase (dades del dietari, PDF de factures,
  // sessió/tokens): ha d'anar sempre directe a la xarxa, sense còpia local extra.
  const url = new URL(req.url);
  if (url.hostname.endsWith('.supabase.co')) return;
  // La pàgina SEMPRE de la xarxa de debò: GitHub Pages la marca amb `max-age=600`, i sense el
  // `cache:'reload'` el navegador encara servia la versió vella deu minuts després de publicar.
  const esPagina = req.mode === 'navigate';
  e.respondWith(
    (esPagina ? fetch(req.url, { cache: 'reload' }) : fetch(req))
      .then(res => {
        // desa una còpia de les respostes bones per si es perd la connexió
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(esPagina ? './' : req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => hit || (esPagina ? caches.match('./') : undefined))
      )
  );
});
