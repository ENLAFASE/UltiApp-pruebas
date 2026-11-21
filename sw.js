// Service worker: guarda una copia de la app en el teléfono para que funcione
// sin señal en la cancha.
//
// IMPORTANTE: cada vez que cambies cualquier archivo de la app, sube el número
// de VERSION. Así los teléfonos saben que hay una versión nueva y la descargan.
const VERSION = 'p7';
// VERSIÓN DE PRUEBAS: nombres propios para no borrar ni pisar la copia de la app real
// (las dos viven en el mismo dominio).
const PREFIJO = 'ultiapp-pruebas-';
const CACHE_APP = PREFIJO + VERSION;
const CACHE_FUENTES = PREFIJO + 'fuentes';

// Todos los archivos que necesita la app para funcionar sin conexión.
const ARCHIVOS = [
  './',
  'index.html',
  'privacidad.html',
  'cartas.html',
  'css/cartas.css',
  'js/cartas/motor.js',
  'js/cartas/cartas.js',
  'manifest.webmanifest',
  'css/base.css',
  'css/componentes.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-64.png',
  'img/husares.png',
  'img/husares-escudo.png',
  'js/app.js',
  'js/modos.js',
  'js/almacen.js',
  'js/ui.js',
  'js/util/formato.js',
  'js/util/exportar.js',
  'js/modelos/jugador.js',
  'js/modelos/eventos.js',
  'js/modelos/partido.js',
  'js/modelos/historial.js',
  'js/coach/evaluacion.js',
  'js/criterio/parametros.js',
  'js/criterio/metricas.js',
  'js/criterio/zonas.js',
  'js/criterio/recomendador.js',
  'js/planillero/acciones.js',
  'js/planillero/asistente.js',
  'js/planillero/elegir.js',
  'js/planillero/planilla.js',
  'js/planillero/ajustes.js',
  'js/planillero/encabezado.js',
  'js/planillero/controles.js',
  'js/planillero/dashboard.js',
  'js/planillero/juego.js',
  'js/planillero/linea.js',
  'js/planillero/llamados.js',
  'js/planillero/marcador.js',
  'js/planillero/plantel.js',
  'js/planillero/pull.js',
  'js/planillero/reloj.js',
  'js/planillero/render.js',
  'js/planillero/resumen.js'
];

// En el PC (localhost) se prefiere siempre la versión más reciente,
// para ver los cambios al recargar sin tener que subir VERSION.
const EN_DESARROLLO = ['localhost', '127.0.0.1'].includes(self.location.hostname);

// 1) Instalación: descargar y guardar todos los archivos.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_APP)
      .then(function (cache) { return cache.addAll(ARCHIVOS); })
      .then(function () { return self.skipWaiting(); })
  );
});

// 2) Activación: borrar las copias de versiones anteriores.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(nombres.map(function (n) {
        if (n.indexOf(PREFIJO) === 0 && n !== CACHE_APP && n !== CACHE_FUENTES) return caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 3) Cada vez que la app pide un archivo.
self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tipografías de Google: usar la copia guardada y actualizarla en segundo plano.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_FUENTES).then(function (cache) {
        return cache.match(req).then(function (guardada) {
          const red = fetch(req).then(function (resp) {
            if (resp.ok || resp.type === 'opaque') cache.put(req, resp.clone());
            return resp;
          }).catch(function () { return guardada; });
          return guardada || red;
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (EN_DESARROLLO) {
    // Primero internet; si falla, la copia guardada.
    event.respondWith(
      fetch(req).then(function (resp) {
        if (resp.ok) { const copia = resp.clone(); caches.open(CACHE_APP).then(function (c) { c.put(req, copia); }); }
        return resp;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (r) {
          return r || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
        });
      })
    );
    return;
  }

  // Publicada: primero la copia guardada (rápido y sin señal); si no está, internet.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (guardada) {
      if (guardada) return guardada;
      return fetch(req).catch(function () {
        if (req.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
