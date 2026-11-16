// Service worker mínimo: abre la app sin conexión (la interfaz), pero NUNCA toca las peticiones a Supabase.
const V = "teyra-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(["/", "/logo.png", "/manifest.webmanifest"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return; // Supabase y otros dominios: directo a la red
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((x) => x.put("/", c)); return res; }).catch(() => caches.match("/")));
    return;
  }
  e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((x) => x.put(r, c)); } return res; })));
});
