// FRILEA · Coche — guarda la app en el móvil para abrirla sin internet.
// El vídeo siempre necesita datos (viene de YouTube); lo que se guarda es la app.
var CACHE = "frilea-coche-v3";
var BASE = new URL("./", self.registration ? self.registration.scope : self.location.href).href;
var ASSETS = [BASE, BASE + "index.html", BASE + "manifiesto.webmanifest", BASE + "icono-192.png", BASE + "icono-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // a YouTube no se le toca nada

  var esPagina = req.mode === "navigate" || url.pathname === new URL(BASE).pathname ||
                 url.pathname.slice(-10) === "index.html";

  if (esPagina) {
    // primero la red (para no quedarse con una versión vieja), y si no hay, la copia guardada
    e.respondWith(
      fetch(req).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return r;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match(BASE + "index.html"); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (r) {
      if (r) return r;
      return fetch(req).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return res;
      });
    })
  );
});
