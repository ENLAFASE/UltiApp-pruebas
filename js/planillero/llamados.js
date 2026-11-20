// Pantalla para registrar un llamado, en 4 pasos numerados:
// 1 quién llama → 2 tipo → 3 resolución → 4 posesión al reanudar.
// La posesión se sugiere sola según el tipo y la resolución (se puede cambiar).
// "Lesión" reemplaza la resolución por el cambio: quién sale y quién entra.
import { cfg } from '../almacen.js';
import { ui } from '../ui.js';
import { KINDS, RES_SHORT, posesionSugerida, teamName } from '../modelos/eventos.js';
import { P, abrev, porNumero } from '../modelos/jugador.js';
import { convocados } from '../criterio/recomendador.js';
import { esc } from '../util/formato.js';

// Explicación corta bajo cada resolución.
const RES_AYUDA = {
  aceptado: 'No contestado',
  contestado: 'El disco vuelve',
  retirado: 'Se retira el llamado',
  observador: 'Decide el observador'
};

function paso(n, titulo, listo, cuerpo) {
  return '<section class="paso' + (listo ? ' ok' : '') + '"><div class="paso-t"><span class="n">' + (listo ? '✓' : n) + '</span>' + titulo + '</div>' + cuerpo + '</section>';
}

// ¿Está completo el llamado para guardarlo?
export function llamadoListo(k) {
  if (!k.kind) return false;
  if (k.kind === 'Lesión') return k.team === 'them' || !!(k.out && k.in);
  return !!k.res && !!k.poss;
}

function chipJugador(id, accion, marcado) {
  const p = P(id);
  return '<button class="chip sq" aria-pressed="' + marcado + '" data-a="' + accion + '" data-id="' + id + '">' +
    esc(abrev(p)) + ' <small>#' + esc(p ? p.num : '?') + '</small></button>';
}

// Cambio por lesión de nuestro equipo: quién sale (de la línea) y quién entra (de la banca).
function cambio(s, k) {
  if (k.team === 'them') return '<span class="muted">Se registra el cambio del rival (no llevamos su plantel).</span>';
  const banca = porNumero(convocados().filter(function (p) { return s.line.indexOf(p.id) < 0; })).map(function (p) { return p.id; });
  let h = '<span class="lbl">Sale</span><div class="chips">' + s.line.map(function (id) { return chipJugador(id, 'callOut', k.out === id); }).join('') + '</div>';
  h += '<span class="lbl">Entra</span>' + (banca.length
    ? '<div class="chips">' + banca.map(function (id) { return chipJugador(id, 'callIn', k.in === id); }).join('') + '</div>'
    : '<span class="muted">No hay convocados fuera de la cancha.</span>');
  return h;
}

export function viewCall(s) {
  const c = cfg(), k = ui.call, lesion = k.kind === 'Lesión';
  let h = '<div class="scr call">';
  h += '<div class="call-h"><h2 class="h2 disp">Llamado · punto ' + s.point + '</h2><button class="btn sm" data-a="cancelCall">Cancelar</button></div>';

  // 1. Qué equipo llama (es lo que cuenta en las estadísticas)
  h += paso(1, '¿Qué equipo llama?', true, '<div class="grid2 team-toggle">' +
    '<button class="btn disp us" aria-pressed="' + (k.team === 'us') + '" data-a="callTeam" data-v="us">' + esc(c.club) + '</button>' +
    '<button class="btn disp th" aria-pressed="' + (k.team === 'them') + '" data-a="callTeam" data-v="them">' + esc(c.rival) + '</button></div>');

  // 2. Tipo
  let tipos = '<div class="grid3">';
  KINDS.forEach(function (x) { tipos += '<button class="chip sq" aria-pressed="' + (k.kind === x) + '" data-a="callKind" data-v="' + esc(x) + '">' + esc(x) + '</button>'; });
  h += paso(2, 'Tipo de llamado', !!k.kind, tipos + '</div>');

  if (lesion) {
    // 3. Cambio por lesión (no tiene resolución ni cambia la posesión)
    h += paso(3, 'Cambio por lesión', k.team === 'them' || !!(k.out && k.in), cambio(s, k));
  } else {
    // 3. Resolución
    let res = '<div class="grid2">';
    Object.keys(RES_SHORT).forEach(function (r) {
      res += '<button class="res" aria-pressed="' + (k.res === r) + '" data-a="callRes" data-v="' + r + '">' + RES_SHORT[r] + '<small>' + RES_AYUDA[r] + '</small></button>';
    });
    h += paso(3, 'Resolución', !!k.res, res + '</div>');

    // 4. Posesión: sugerida según el tipo y la resolución
    const sug = posesionSugerida(k, k.antes);
    const nota = k.possManual
      ? (sug.equipo && sug.equipo !== k.poss ? 'Cambiada a mano (se sugería ' + esc(teamName(sug.equipo)) + ').' : '')
      : sug.motivo;
    h += paso(4, 'Posesión al reanudar', !!k.poss, '<div class="grid2 team-toggle sm">' +
      '<button class="btn us" aria-pressed="' + (k.poss === 'us') + '" data-a="callPoss" data-v="us">' + esc(c.club) + '</button>' +
      '<button class="btn th" aria-pressed="' + (k.poss === 'them') + '" data-a="callPoss" data-v="them">' + esc(c.rival) + '</button></div>' +
      (nota ? '<span class="muted sug-pos">' + (k.possManual ? '' : '<b>Sugerida.</b> ') + nota + '</span>' : ''));
  }

  h += '<button class="btn big fill disp full" data-a="saveCall"' + (llamadoListo(k) ? '' : ' disabled') + '>Guardar ' + (lesion ? 'cambio' : 'llamado') + '</button>';
  h += '</div>';
  return h;
}
