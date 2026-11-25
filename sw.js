// FRILEA · Coche
// - Guarda la app en el movil para abrirla sin internet (el video si necesita datos).
// - Recoge el video cuando se comparte desde YouTube (Compartir -> Coche).

var CACHE = "frilea-coche-v4";
var BASE = new URL("./", self.registration ? self.registration.scope : self.location.href).href;
var ASSETS = [BASE, BASE + "index.html", BASE + "manifiesto.webmanifest", BASE + "icono-192.png", BASE + "icono-512.png"];

var PEND_CACHE = "frilea-pendiente";
var PEND_KEY = "ultimo";
var SHARE_PATH = "compartir";

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(
        ks.filter(function (k) { return k !== CACHE && k !== PEND_CACHE; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Saca un enlace de YouTube de lo que manda Android al compartir
function sacaEnlace(s) {
  if (!s) return "";
  s = String(s);
  var lista = s.match(/[?&]list=([A-Za-z0-9_-]+)/);
  var video = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if (video) return "https://www.youtube.com/watch?v=" + video[1] + (lista ? "&list=" + lista[1] : "");
  if (lista) return "https://www.youtube.com/playlist?list=" + lista[1];
  var suelto = s.trim().match(/^[A-Za-z0-9_-]{11}$/);
  if (suelto) return "https://www.youtube.com/watch?v=" + suelto[0];
  return "";
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // a YouTube no se le toca nada

  // Viene de "Compartir" un video desde YouTube
  var ruta = url.pathname.replace(/\/+$/, "");
  if (req.mode === "navigate" && ruta.slice(-SHARE_PATH.length) === SHARE_PATH) {
    e.respondWith((async function () {
      try {
        var partes = [url.searchParams.get("url"), url.searchParams.get("text"), url.searchParams.get("title")];
        var enlace = "";
        for (var i = 0; i < partes.length && !enlace; i++) enlace = sacaEnlace(partes[i]);
        if (!enlace) enlace = sacaEnlace(partes.join(" "));
        if (enlace) {
          var c = await caches.open(PEND_CACHE);
          await c.put(PEND_KEY, new Response(JSON.stringify({ link: enlace, cuando: Date.now() })));
        }
      } catch (err) {}
      return Response.redirect(new URL("./", self.registration.scope).href, 303);
    })());
    return;
  }

  var esPagina = req.mode === "navigate" || url.pathname === new URL(BASE).pathname ||
                 url.pathname.slice(-10) === "index.html";

  if (esPagina) {
    // primero la red (para no quedarse con una version vieja), y si no hay, la copia guardada
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
