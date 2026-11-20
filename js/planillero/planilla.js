// Modo Planillero: el registro básico de cualquier partido, como se hace a mano
// en un torneo. Marcador, tiempo y, por cada equipo, gol, asistencia e
// intercepción por jugador. Sin líneas, sin minutos jugados y sin jugada a jugada.
import { store, cfg } from '../almacen.js';
import { describe } from '../modelos/eventos.js';
import { tiempoCumplido } from '../modelos/partido.js';
import { esc } from '../util/formato.js';

export function viewPlanilla(s) {
  const c = cfg(), g = store.game;
  let h = '<div class="scr">';
  if (!g.start) {
    // Antes de empezar: el reloj parte con el primer pull.
    h += '<div class="paso-h us"><span class="disp">LISTOS</span><span>' + esc(c.club) + ' vs ' + esc(c.rival) + '</span></div>';
    h += '<button class="hang-big disp" data-a="planInicio">▶ EMPEZAR<br><small>Toca cuando salga el primer pull</small></button>';
    h += '<p class="muted" style="margin:0;text-align:center">Así parte el reloj del partido.</p>';
    h += '<div class="mini"><button class="btn" data-a="openTO">Timeout</button></div>';
    return h + '</div>';
  }
  if (s.half && s.halfPoint === s.point) h += '<div class="aviso">Medio tiempo. Empieza la segunda mitad.</div>';
  if (tiempoCumplido()) h += '<div class="aviso"><span>Se cumplió el tiempo del partido.</span><button class="btn sm danger" data-a="askEnd" data-v="tiempo">Finalizar</button></div>';

  function equipo(lado, nombre) {
    const nuestro = lado === 'us';
    return '<div class="plan-eq ' + (nuestro ? 'us' : 'th') + '"><span class="plan-n disp">' + esc(nombre) + '</span>' +
      '<button class="btn ' + (nuestro ? 'fill' : 'themfill') + ' disp plan-gol" data-a="' + (nuestro ? 'plGol' : 'plGolR') + '">GOL</button>' +
      '<button class="btn disp" data-a="' + (nuestro ? 'plBlk' : 'plBlkR') + '">Intercepción</button></div>';
  }
  h += '<div class="plan-eqs">' + equipo('us', c.club) + equipo('them', c.rival) + '</div>';
  h += '<p class="muted ult" style="margin:0">' + (s.last ? 'Último: ' + esc(describe(s.last)) : 'Todavía sin registros') + '</p>';
  h += '<div class="mini"><button class="btn" data-a="undo">Deshacer</button><button class="btn" data-a="openTO">Timeout</button></div>';
  return h + '</div>';
}
