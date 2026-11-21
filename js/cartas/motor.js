// ============================================================================
//  CARTAS DE JUEGO · MOTOR
//  El partido es un tablero: nuestra ficha parte en 0-0; cada gol nuestro la
//  mueve a la derecha y cada gol rival, hacia abajo. Hay millones de rutas,
//  pero para elegir la línea solo importa la SITUACIÓN de llegada:
//    marcador (a, b)  → zona del motor y proporción ABBA (por el n.º de punto)
//    quién anotó el último gol → si jugamos el próximo punto en ataque o defensa
//    racha (goles seguidos del mismo equipo, máximo 6) → cuántos puntos seguidos
//                     lleva la línea del mismo tipo (desgaste)
//  Así, 142 millones de rutas se reducen a ~1.800 situaciones, y cada casilla
//  del tablero tiene como máximo 12 (6 rachas × 2 equipos).
//
//  El desgaste acumulado (puntos jugados por cada uno) sí depende de la ruta
//  completa: se estima siguiendo la ruta MÁS PROBABLE (la que más rutas reúne)
//  hasta cada situación.
// ============================================================================
import { recomendarLinea } from '../criterio/recomendador.js';
import { zonaDelMarcador } from '../criterio/zonas.js';

export const MAX_RACHA = 6;

// Proporción del punto (índice 0 = primer punto), igual que en la app.
export function ratioDelPunto(c, idx) {
  if (c.division !== 'mixto') return null;
  const base = c.startRatio || '4M3F', otra = base === '4M3F' ? '3M4F' : '4M3F';
  if (!c.abba) return base;
  return (((idx + 1) >> 1) % 2 === 0) ? base : otra;
}
function cupos(r) { return r === '4M3F' ? { M: 4, F: 3 } : r === '3M4F' ? { M: 3, F: 4 } : null; }

export function clave(a, b, d, r) { return a + '-' + b + '-' + (d || 'ini') + '-' + r; }

// roster = jugadores (con ev, g, noConv); c = configuración de las cartas:
//   meta (puntos para ganar), halfAt, inicio ('ataque'|'defensa'), division,
//   startRatio, abba, y los ajustes del criterio (lineMode, compModo, margenes...).
export function generarCartas(roster, c) {
  const meta = c.meta || 15, ctx = { roster: roster, cfg: Object.assign({}, c, { mixed: c.division === 'mixto', pointsToWin: meta }) };
  const estados = new Map();
  const inicio = { a: 0, b: 0, d: null, r: 0, rutas: 1, previos: [] };
  estados.set(clave(0, 0, null, 0), inicio);

  // 1) Todas las situaciones alcanzables y cuántas rutas llegan a cada una.
  for (let n = 0; n <= 2 * (meta - 1); n++) {
    estados.forEach(function (e) {
      if (e.a + e.b !== n) return;
      [['us', e.a + 1, e.b], ['them', e.a, e.b + 1]].forEach(function (mov) {
        const d = mov[0], a = mov[1], b = mov[2];
        if (a >= meta || b >= meta) return; // la ficha sale del tablero: fin del partido
        const r = e.d === d ? e.r + 1 : 1;
        if (r > MAX_RACHA) return;          // rutas extremas: más de 6 goles seguidos
        const k = clave(a, b, d, r);
        let x = estados.get(k);
        if (!x) { x = { a: a, b: b, d: d, r: r, rutas: 0, previos: [] }; estados.set(k, x); }
        x.rutas += e.rutas; x.previos.push(e);
      });
    });
  }

  // 2) Línea sugerida para el PRÓXIMO punto en cada situación, en orden de marcador.
  const orden = Array.from(estados.values()).sort(function (x, y) { return (x.a + x.b) - (y.a + y.b); });
  const empiezaAtaque = c.inicio !== 'defensa';
  orden.forEach(function (e) {
    // Ruta más probable para estimar el desgaste.
    const prev = e.previos.length ? e.previos.reduce(function (m, x) { return x.rutas > m.rutas ? x : m; }) : null;
    e.prev = prev;
    e.pts = {}; e.racha = {};
    if (prev) {
      Object.keys(prev.pts).forEach(function (id) { e.pts[id] = prev.pts[id]; });
      prev.linea.forEach(function (id) { e.pts[id] = (e.pts[id] || 0) + 1; e.racha[id] = (prev.racha[id] || 0) + 1; });
    }
    // ¿Ataque o defensa? Saca el pull quien anotó. En el medio tiempo recibe quien sacó primero.
    const halfAt = c.halfAt || Math.ceil(meta / 2);
    const medio = e.d && ((e.d === 'us' && e.a === halfAt && e.b < halfAt) || (e.d === 'them' && e.b === halfAt && e.a < halfAt));
    e.medio = !!medio;
    e.segunda = Math.max(e.a, e.b) >= halfAt;
    e.ataque = !e.d ? empiezaAtaque : medio ? !empiezaAtaque : e.d === 'them';
    e.ratio = ratioDelPunto(c, e.a + e.b);
    e.zona = zonaDelMarcador(e.a, e.b, ctx.cfg).id;
    const s = {
      us: e.a, them: e.b, offense: e.ataque ? 'us' : 'them',
      lastLine: prev ? prev.linea : [],
      stats: {}, racha: e.racha
    };
    Object.keys(e.pts).forEach(function (id) { s.stats[id] = { pts: e.pts[id] }; });
    const rec = recomendarLinea(s, cupos(e.ratio), [], ctx);
    e.linea = rec.ids; e.roles = rec.roles; e.principales = rec.principales || []; e.motivos = rec.motivos; e.resumen = rec.resumen;
    e.descansanMax = rec.descansanMax || [];
    e.entran = prev ? e.linea.filter(function (id) { return prev.linea.indexOf(id) < 0; }) : e.linea.slice();
    e.repiten = prev ? e.linea.filter(function (id) { return prev.linea.indexOf(id) >= 0; }) : [];
  });

  // 3) Resumen por casilla del tablero.
  const casillas = {};
  estados.forEach(function (e) {
    const k = e.a + '-' + e.b;
    const x = casillas[k] || (casillas[k] = { a: e.a, b: e.b, rutas: 0, situaciones: [] });
    x.rutas += e.rutas; x.situaciones.push(e);
  });
  Object.keys(casillas).forEach(function (k) {
    casillas[k].situaciones.sort(function (x, y) {
      // Primero el inicio; luego "anotamos" y después "anotó el rival", por racha.
      const o = function (e) { return !e.d ? 0 : (e.d === 'us' ? 1 : 2) * 10 + e.r; };
      return o(x) - o(y);
    });
  });
  const total = Array.from(estados.values()).reduce(function (t, e) { return t + e.rutas; }, 0);
  return { estados: estados, casillas: casillas, meta: meta, total: total };
}

// Texto de cómo se llegó a una situación: "2.º gol nuestro seguido".
export function llegada(e) {
  if (!e.d) return 'Inicio del partido';
  const n = e.r === 1 ? '' : (e.r + '.º ');
  return e.d === 'us' ? (e.r === 1 ? 'Gol nuestro' : n + 'gol nuestro seguido') : (e.r === 1 ? 'Gol rival' : n + 'gol rival seguido');
}
