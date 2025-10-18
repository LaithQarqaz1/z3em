/* Qusai Shop - Service Worker
 * Strategy:
 * - Images: cache-first (read from phone after first load), with LRU trim.
 * - Static assets (css/js/fonts): stale-while-revalidate.
 * - Pages (HTML navigations): network-first with offline fallback.
 * Notes:
 * - Place this file at your site root: /sw.js
 * - The HTML already registers this file conditionally on HTTPS / localhost.
 */

const VERSION = 'v1.0.1';
const STATIC_CACHE = `static-${VERSION}`;
const IMAGE_CACHE  = `images-${VERSION}`;
const PAGE_CACHE   = `pages-${VERSION}`;

// Tune these to your needs
const IMAGE_MAX_ITEMS = 160;   // max images kept
const STATIC_MAX_ITEMS = 80;   // max static files kept
const PAGE_MAX_ITEMS   = 20;   // max pages kept

// Paths to precache (small, critical shell)
const PRECACHE_URLS = [
  '/',               // if served from domain root
  '/index.html',
  '/header.css',
  '/header.js',
  '/loader.css',
  '/loader.js',
  // lightweight key pages (optional; remove if not present)
  '/games.html',
  '/social.html',
  '/software.html',
  '/freefireinbut.html',
];

// Helper: LRU-like trim by deleting oldest entries
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxItems) return;
    const toDelete = keys.length - maxItems;
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(keys[i]);
    }
  } catch (_) {}
}

// Helper: decide if a request should be cached as "static"
function isStaticAsset(req) {
  const url = new URL(req.url);
  const ext = url.pathname.split('.').pop().toLowerCase();
  if (['css','js','mjs','json','xml','txt','map'].includes(ext)) return true;
  if (url.hostname.includes('fonts.gstatic.com')) return true;
  if (url.hostname.includes('fonts.googleapis.com')) return true;
  if (url.hostname.includes('cdnjs.cloudflare.com')) return true;
  if (url.hostname.includes('unpkg.com')) return true;
  if (url.hostname.includes('gstatic.com')) return true; // firebase sdk
  return false;
}

// Helper: avoid caching Firebase dynamic API calls, POSTs, or unsupported schemes
function shouldBypass(req) {
  try{
    if (!req || req.method !== 'GET') return true;
    // Known Chrome quirk: ignore extension/file/blob/data schemes
    const url = new URL(req.url);
    const proto = url.protocol;
    if (proto !== 'http:' && proto !== 'https:') return true; // skip chrome-extension:, file:, data:, blob:
    // DevTools preloads sometimes use only-if-cached + cross-origin; skip to avoid errors
    if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return true;
    // Firestore/Identity endpoints should bypass
    if (url.hostname.endsWith('googleapis.com')) return true;
    if (url.pathname.startsWith('/__/')) return true;
    return false;
  }catch(_){ return true; }
}

// Install: precache small shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(PRECACHE_URLS.map(u => new Request(u, { cache: 'reload' })));
      } catch (_) {}
      // Activate new SW ASAP
      await self.skipWaiting();
    })()
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(k => {
          if (![STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE].includes(k)) {
            return caches.delete(k);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (shouldBypass(req)) return;

  const dest = req.destination;

  // 1) IMAGES: cache-first
  if (dest === 'image') {
    event.respondWith(cacheFirstImages(req));
    return;
  }

  // 2) Navigations (HTML pages): network-first with fallback
  if (req.mode === 'navigate' || (dest === '' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(networkFirstPages(req));
    return;
  }

  // 3) Static assets (css/js/fonts): stale-while-revalidate
  if (isStaticAsset(req)) {
    event.respondWith(staleWhileRevalidateStatic(req));
    return;
  }
  // Default: pass-through
});

async function cacheFirstImages(req) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(req, { ignoreVary: true });
  if (cached) return cached;

  try {
    const resp = await fetch(req, { mode: req.mode, credentials: 'same-origin' });
    // Cache only if usable (ok or opaque)
    if (resp && (resp.ok || resp.type === 'opaque')) {
      try { await cache.put(req, resp.clone()); } catch(_){}
      trimCache(IMAGE_CACHE, IMAGE_MAX_ITEMS);
    }
    return resp;
  } catch (err) {
    // Offline fallback: try any cached image as placeholder
    const keys = await cache.keys();
    if (keys.length) {
      const any = await cache.match(keys[0]);
      if (any) return any;
    }
    // last resort: generic response
    return new Response('', { status: 504, statusText: 'Image unavailable (offline)' });
  }
}

async function networkFirstPages(req) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const resp = await fetch(req);
    if (resp && resp.ok) {
      try { await cache.put(req, resp.clone()); } catch(_){}
      trimCache(PAGE_CACHE, PAGE_MAX_ITEMS);
      return resp;
    }
    // fallback to cache
    const cached = await cache.match(req);
    if (cached) return cached;
    return resp;
  } catch (_) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // basic offline fallback page
    const body = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>غير متصل</title><body style="font-family:sans-serif;padding:24px"><h2>أنت غير متصل</h2><p>لا يمكن تحميل الصفحة الآن. جرّب لاحقًا.</p></body></html>`;
    return new Response(body, { headers: { 'Content-Type':'text/html; charset=utf-8' } });
  }
}

async function staleWhileRevalidateStatic(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req, { ignoreVary: true });
  const fetchPromise = fetch(req).then((resp) => {
    if (resp && (resp.ok || resp.type === 'opaque')) {
      try { cache.put(req, resp.clone()); } catch(_){}
      trimCache(STATIC_CACHE, STATIC_MAX_ITEMS);
    }
    return resp;
  }).catch(() => undefined);
  return cached || fetchPromise || fetch(req);
}

// Optional: allow immediate activation via postMessage
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
