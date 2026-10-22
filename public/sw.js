/*
 * Service worker — deliberately small.
 *
 *  - Hashed build assets (/_next/static): cache-first (they never change).
 *  - Public images and icons: stale-while-revalidate, capped.
 *  - Public pages: network-first; a recent copy is used only when offline,
 *    and the page itself shows an offline notice that details may be outdated.
 *  - Never cached: /admin, /api, non-GET requests, cross-origin requests and
 *    RSC/data requests. Cached prices or availability are never authoritative.
 */

const VERSION = "v3";
const STATIC_CACHE = `farop-static-${VERSION}`;
const PAGE_CACHE = `farop-pages-${VERSION}`;
const IMAGE_CACHE = `farop-images-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_PAGES = 25;
const MAX_IMAGES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)),
      // Home page goes in the page cache so later network copies replace it.
      caches.open(PAGE_CACHE).then((cache) => cache.add("/").catch(() => {})),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("farop-") && !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isPrivatePath(pathname) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api");
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy)).then(() => trim(PAGE_CACHE, MAX_PAGES));
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const url = new URL(request.url);
    if (url.pathname === OFFLINE_URL) return (await caches.match(OFFLINE_URL)) || Response.error();
    // Redirect rather than serving the offline HTML under this URL: the app's
    // router must see a URL that matches the page, or it errors on hydration.
    return Response.redirect(`${OFFLINE_URL}?from=${encodeURIComponent(url.pathname + url.search)}`, 302);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(IMAGE_CACHE).then((cache) => cache.put(request, copy)).then(() => trim(IMAGE_CACHE, MAX_IMAGES));
      }
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivatePath(url.pathname)) return;

  // React Server Component payloads and prefetches: always go to the network.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/image") || url.pathname.startsWith("/images/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
