const CACHE_NAME = 'pos-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/inventory.js',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Instalace Service Workera
self.addEventListener('install', (event) => {
  // Použití waitUntil pro zaručení, že service worker nebude instalován,
  // dokud se nedokončí cache
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Otevřená cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error('Chyba při cachování assetů:', error);
      })
  );
});

// Aktivace Service Workera
self.addEventListener('activate', (event) => {
  // Použití waitUntil pro zaručení, že service worker nebude aktivován,
  // dokud se nedokončí čištění starých cache
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Odstranění všech starých verzí cache
          if (cacheName !== CACHE_NAME) {
            console.log('Odstraňování staré cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Zajištění, že service worker převezme kontrolu hned po aktivaci,
  // bez nutnosti načtení nové stránky
  return self.clients.claim();
});

// Zachycení fetch požadavků
self.addEventListener('fetch', (event) => {
  // Ignorování API požadavků - ty by neměly být cachovány
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - vrátit odpověď z cache
        if (response) {
          return response;
        }
        
        // Není v cache, stáhnout ze sítě
        return fetch(event.request)
          .then((fetchResponse) => {
            // Pokud odpověď není validní, vrátit ji
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            
            // Odpověď je validní, uložit do cache pro příští použití
            // Důležité: Je potřeba klonovat odpověď, protože se jedná o stream
            // který může být použit pouze jednou
            const responseToCache = fetch