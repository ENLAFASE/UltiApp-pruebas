// Pantalla para elegir un jugador (quién anotó, quién asistió, quién interceptó...).
// La usan los modos Planillero y Asistente. ui.pick = { act, title, ids, sin, tema }:
//   sin  = texto de un botón extra para "sin jugador" (por ejemplo, "Sin asistencia")
//   tema = 'us' o 'th' para el color de la franja
import { ui } from '../ui.js';
import { P, label, htmlBoton } from '../modelos/jugador.js';
import { esc } from '../util/formato.js';

function columnas(n) { return n <= 8 ? 2 : n <= 15 ? 3 : n <= 24 ? 4 : 5; }

export function viewElegir() {
  const k = ui.pick;
  let h = '<div class="scr">';
  h += '<div class="paso-h ' + (k.tema === 'th' ? 'th' : 'us') + '"><span class="disp">' + esc(k.titulo || '') + '</span><span>' + esc(k.sub || '') + '</span></div>';
  h += '<p class="q disp">' + esc(k.title) + '</p>';
  if (k.ids.length) {
    h += '<div class="pgrid" style="--cols:' + columnas(k.ids.length) + '">';
    k.ids.forEach(function (id) {
      h += '<button class="pb" data-a="elegido" data-id="' + id + '" aria-label="' + esc(label(id)) + '">' + htmlBoton(P(id)) + '</button>';
    });
    h += '</div>';
  } else {
    h += '<p class="muted" style="margin:0">No hay jugadores para elegir.</p>';
  }
  h += '<div class="mini">' + (k.sin ? '<button class="btn" data-a="elegidoSin">' + esc(k.sin) + '</button>' : '') +
    '<button class="btn" data-a="cancelPick">Cancelar</button></div>';
  return h + '</div>';
}
