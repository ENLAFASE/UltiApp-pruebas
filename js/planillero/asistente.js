// Modo Asistente: la línea se arma igual que en Coach (con el motor de sugerencia),
// pero el punto se registra de forma simple: gol (con asistencia), gol rival,
// turnover e intercepción. Sin pull cronometrado, sin pases y sin llamados.
// Los puntos y minutos jugados se registran desde que sale el pull.
import { cfg } from '../almacen.js';
import { P, abrev } from '../modelos/jugador.js';
import { esc } from '../util/formato.js';
import { quienSaca } from './pull.js';
import { ui } from '../ui.js';
import { cambio } from './llamados.js';

function lineaEnCancha(s) {
  return '<div class="linea-chips">' + s.line.map(function (id) {
    const p = P(id);
    return '<span class="lc' + (p && p.g === 'F' ? ' M' : ' H') + '"><b>' + esc(abrev(p)) + '</b> #' + esc(p ? p.num : '?') + '</span>';
  }).join('') + '</div>';
}

// Antes del punto: la línea ya está confirmada; falta que salga el pull.
export function viewAsistentePull(s) {
  const c = cfg(), saca = quienSaca(s), ataque = s.offense === 'us';
  let h = '<div class="scr">';
  h += '<div class="paso-h ' + (ataque ? 'us' : 'th') + '"><span class="disp">' + (ataque ? 'ATAQUE' : 'DEFENSA') + '</span><span>' +
    (saca === 'us' ? esc(c.club) + ' saca el pull' : esc(c.rival) + ' saca el pull') + '</span></div>';
  h += '<span class="lbl">En cancha</span>' + lineaEnCancha(s);
  h += '<button class="hang-big disp" data-a="pullAsis">▶ PULL<br><small>Toca cuando salga el disco</small></button>';
  h += '<p class="muted" style="margin:0;text-align:center">Desde aquí se cuentan los minutos de cada jugador' + (s.point === 1 ? ' y parte el reloj del partido' : '') + '.</p>';
  h += '<div class="mini"><button class="btn" data-a="undo">Editar línea</button><button class="btn" data-a="openTO">Timeout</button></div>';
  return h + '</div>';
}

// Punto en juego. La barra solo dice cómo EMPEZÓ el punto (quién recibió el pull):
// en este modo no se sigue la posesión, solo las acciones de nuestro equipo y el gol.
export function viewAsistentePunto(s) {
  const c = cfg(), recibimos = s.offense === 'us';
  let h = '<div class="scr">';
  h += '<div class="paso-h ' + (recibimos ? 'us' : 'th') + '"><span class="disp">' + (recibimos ? 'ATAQUE' : 'DEFENSA') + '</span><span>' +
    (recibimos ? 'Recibimos el pull' : esc(c.rival) + ' recibió el pull') + '</span></div>';
  h += '<span class="lbl">En cancha · punto ' + s.point + '</span>' + lineaEnCancha(s);
  h += '<div class="asis-goles"><button class="btn fill disp" data-a="asGol">Gol<br><small>' + esc(c.club) + '</small></button>' +
    '<button class="btn themfill disp" data-a="themGoal">Gol<br><small>' + esc(c.rival) + '</small></button></div>';
  h += '<div class="grid2"><button class="btn big disp" data-a="asTurn">Turnover</button><button class="btn big disp" data-a="asBlk">Intercepción</button></div>';
  h += '<div class="mini"><button class="btn" data-a="undo">Deshacer</button><button class="btn" data-a="asCambio">Cambio por lesión</button><button class="btn" data-a="openTO">Timeout</button></div>';
  return h + '</div>';
}

// Cambio por lesión durante el punto: quién sale y quién entra. Quien sale igual
// cuenta como que jugó el punto; quien entra suma el punto desde ese momento.
export function viewAsistenteCambio(s) {
  const k = ui.call, listo = !!(k.out && k.in);
  let h = '<div class="scr">';
  h += '<div class="paso-h us"><span class="disp">CAMBIO POR LESIÓN</span><span>Punto ' + s.point + ' · la posesión no cambia</span></div>';
  h += cambio(s, k);
  h += '<button class="btn big fill disp full" data-a="saveCall"' + (listo ? '' : ' disabled') + '>Guardar cambio</button>';
  h += '<button class="btn full" data-a="cancelCambio">Cancelar</button>';
  return h + '</div>';
}
