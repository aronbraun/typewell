/* Typewell service worker.
 *
 * The whole point of this file is to make the app work offline WITHOUT ever
 * serving you a stale copy while you are online. The usual PWA recipe does the
 * opposite — cache-first with a version bump — and that is exactly the failure
 * this is written to avoid: you ship a fix, the browser keeps handing out
 * yesterday's HTML, and nobody finds out for a week.
 *
 * So: network first, always, for everything of ours. The cache is a fallback
 * for when the network is not there, never a shortcut for when it is.
 *
 *   online  -> fetch from the server, hand it over, quietly refresh the cache
 *   offline -> hand over the last copy we saw
 *
 * That costs one round trip per navigation, which is the honest price of
 * "never wrong". Typewell is a single ~200 KB HTML file, so the trip is cheap.
 *
 * The worker is registered with updateViaCache:"none", so the browser also
 * revalidates THIS file on every register() call rather than trusting its own
 * HTTP cache for up to 24 hours.
 */
/* Bump when the SHELL list changes: activate deletes every cache that is not
 * this one, which is what evicts entries for paths that no longer exist. */
const CACHE = "typewell-v2";

/* Precached so a first-run offline visit works at all. Deliberately short:
 * fonts and everything else are handled opportunistically below. */
const SHELL = [
  "/",
  "/index.html",
  "/privacy.html",
  "/terms.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  /* skipWaiting: a new worker takes over as soon as it is installed rather
   * than waiting for every tab to close. Combined with network-first there is
   * no version skew to protect against — the new worker serves the same fresh
   * network responses the old one did. */
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})          /* a failed precache must not fail the install */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* Someone else's origin — Google's auth and Drive endpoints, the font CDN.
   * Never cached: an intercepted, replayed auth response is a security
   * problem, not a performance win. Let the browser do its normal thing. */
  if (url.origin !== self.location.origin) return;

  /* For the page itself, revalidate with the server rather than trusting the
   * browser's own HTTP cache (GitHub Pages sends max-age=600 on HTML, which
   * would otherwise mean up to ten minutes of "why is my fix not live"). A
   * conditional request costs one 304 when nothing changed. */
  const hit = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/"
    ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" })
    : fetch(req);

  e.respondWith(
    hit
      .then((res) => {
        /* Only store real, complete responses. An opaque or partial one in the
         * cache turns into a broken page the next time you are offline. */
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) =>
          hit ||
          /* A navigation to any path with no cached match still deserves the
           * app rather than the browser's offline dinosaur. */
          (req.mode === "navigate" ? caches.match("/index.html") : undefined) ||
          new Response("Offline, and this was never cached.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        )
      )
  );
});
