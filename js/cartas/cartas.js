// ============================================================================
//  CARTAS DE JUEGO · PÁGINA
//  Paso 1 Plantel (y evaluación) → 2 Partido (variantes de inicio y criterio)
//  → 3 Tablero (navegar el partido gol a gol) → 4 Imprimir (cuadernillo).
//  Usa el mismo motor de sugerencia que la app (js/criterio/).
//  Guarda sus datos aparte (clave 'ufs-cartas-v1'); puede traer el plantel
//  de la app, que vive en el mismo sitio, sin modificarlo.
// ============================================================================
import { generarCartas, llegada, MAX_RACHA } from './motor.js';
import { ZONAS, MODALIDADES, margenes } from '../criterio/zonas.js';
import { HABILIDADES, evaluado } from '../coach/evaluacion.js';
import { esc } from '../util/formato.js';

const KEY = 'ufs-cartas-v1';
const RAIZ = document.getElementById('cartas');

const CFG_BASE = {
  meta: 15, halfAt: 8, inicio: 'ataque', division: 'open', startRatio: '4M3F', abba: true,
  lineMode: 'competencia', compModo: 'auto', rivalNivel: 'similar', crucial: false,
  margenVentaja: 4, margenDesventaja: 6
};

/* ---------- datos ---------- */
function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d) return { roster: d.roster || [], cfg: Object.assign({}, CFG_BASE, d.cfg || {}), ruta: d.ruta || [], rachaImp: d.rachaImp || MAX_RACHA, paso: d.paso || 'plantel' };
  } catch (e) {}
  return { roster: [], cfg: Object.assign({}, CFG_BASE), ruta: [], rachaImp: MAX_RACHA, paso: 'plantel' };
}
const st = cargar();
function guardar() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

let cartas = null;          // resultado del motor (se recalcula si cambian plantel o ajustes)
let celdaVista = null;      // casilla tocada en el tablero ("8-5")
let aviso = null, avisoTimer = null;
function sucio() { cartas = null; }
function calcular() {
  if (!cartas) cartas = generarCartas(convocados(), st.cfg);
  return cartas;
}
function convocados() { return st.roster.filter(function (p) { return !p.noConv; }); }
function P(id) { return st.roster.find(function (p) { return p.id === id; }); }
function abrev(p) {
  if (!p) return '?';
  const w = String(p.name || '').trim().split(/\s+/)[0];
  if (!w) return '#' + p.num;
  const l = Array.from(w).slice(0, 3).join('');
  return l.charAt(0).toUpperCase() + l.slice(1);
}
function letraG(p) { return p && p.g === 'F' ? 'M' : 'H'; }
function avisar(t) { aviso = t; clearTimeout(avisoTimer); avisoTimer = setTimeout(function () { aviso = null; const el = document.querySelector('.toast'); if (el) el.remove(); }, 2200); }
function miles(n) { return Number(n).toLocaleString('es-CL'); }

/* ---------- plantel: texto e importación ---------- */
// "36 Enzo H man5 av5 gol3 def3" (las ramas mix/open/husarex se ignoran aquí).
function leerTexto(t) {
  const lista = [];
  String(t || '').split(/\n/).forEach(function (linea, i) {
    const partes = linea.trim().split(/[\s,;]+/).filter(Boolean);
    if (!partes.length || !/^\d+$/.test(partes[0])) return;
    const p = { id: 'c' + Date.now().toString(36) + i, num: partes[0], name: '', g: 'M', ev: {} }, nombre = [];
    partes.slice(1).forEach(function (x) {
      const hab = x.match(/^(man|av|gol|def)[:=]?([1-5])$/i);
      if (hab) { p.ev[hab[1].toLowerCase()] = +hab[2]; return; }
      if (/^[HhMmFf]$/.test(x)) { p.g = x.toUpperCase() === 'H' ? 'M' : 'F'; return; }
      if (/^(mix|open|husarex|hx)$/i.test(x)) return;
      nombre.push(x);
    });
    p.name = nombre.join(' ');
    lista.push(p);
  });
  return lista;
}
// Plantel guardado por la app en este mismo navegador (solo se lee).
function plantelDeApp(clave) {
  try {
    const d = JSON.parse(localStorage.getItem(clave) || 'null');
    if (!d || !d.roster || !d.roster.length) return null;
    return {
      division: d.cfg && d.cfg.division,
      roster: d.roster.map(function (p) { return { id: p.id, num: p.num, name: p.name, g: p.g, ev: Object.assign({}, p.ev || {}), noConv: !!p.noConv }; })
    };
  } catch (e) { return null; }
}
const FUENTES = [['ufs-pruebas-v1', 'UltiApp Pruebas'], ['ufs-v1', 'la app Húsares']];

/* ---------- vistas ---------- */
const PASOS = [['plantel', '1 · Plantel'], ['partido', '2 · Partido'], ['tablero', '3 · Tablero'], ['imprimir', '4 · Imprimir']];

function cabecera() {
  return '<header class="sb brand"><div class="brand-row"><div class="brand-t"><span class="title-h">Cartas de juego</span>' +
    '<span class="brand-sub">Una línea sugerida para cada situación del marcador</span></div></div></header>' +
    '<nav class="ct-pasos" aria-label="Pasos">' + PASOS.map(function (p) {
      return '<button data-a="paso" data-v="' + p[0] + '" aria-current="' + (st.paso === p[0] ? 'step' : 'false') + '">' + p[1] + '</button>';
    }).join('') + '</nav>';
}

function selectEv(p, k) {
  const v = (p.ev || {})[k] || '';
  return '<select data-ev="' + k + '" data-id="' + p.id + '" aria-label="' + k + ' de ' + esc(p.name) + '"><option value="">–</option>' +
    [1, 2, 3, 4, 5].map(function (n) { return '<option' + (v === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>';
}

function vistaPlantel() {
  const conv = convocados(), sinEv = conv.filter(function (p) { return !evaluado(p); }).length;
  let h = '<section class="pad stack">';
  h += '<div class="card stack"><b class="disp ct-h">¿Cómo funciona?</b>' +
    '<p style="margin:0">Imagina el partido como un tablero de 15×15: la ficha parte en 0-0; cada <b>gol nuestro</b> la mueve a la <b>derecha</b> y cada <b>gol rival</b>, <b>hacia abajo</b>. ' +
    'Para cada situación posible, el motor de juego sugiere la línea del próximo punto. Imprimes las cartas y en el partido solo buscas la del marcador y cómo llegaste.</p></div>';
  h += '<h2 class="h2 disp">Plantel (' + st.roster.length + ')</h2>';
  const fuentes = FUENTES.filter(function (f) { return plantelDeApp(f[0]); });
  if (fuentes.length) {
    h += '<div class="stack" style="gap:6px">' + fuentes.map(function (f) {
      const d = plantelDeApp(f[0]);
      return '<button class="btn full" data-a="importar" data-v="' + f[0] + '">Traer plantel de ' + f[1] + ' (' + d.roster.length + ')</button>';
    }).join('') + '</div>';
  }
  h += '<div class="field"><label class="lbl" for="ct-texto">O pega el plantel (una línea por jugador)</label>' +
    '<textarea id="ct-texto" rows="4" placeholder="36 Enzo H man5 av5 gol3 def4&#10;89 Diego H man3 av5 gol5 def5"></textarea>' +
    '<span class="muted">Número, nombre, H (hombre) o M (mujer) y la evaluación de 1 a 5: man (manejo), av (corte de avance), gol (corte de gol), def (defensa).</span>' +
    '<div class="grid2"><button class="btn" data-a="pegar" data-v="agregar">Agregar</button><button class="btn" data-a="pegar" data-v="reemplazar">Reemplazar todo</button></div></div>';
  if (st.roster.length) {
    h += '<p class="muted" style="margin:0">' + conv.length + ' convocados' + (sinEv ? ' · <b class="txt-warn">' + sinEv + ' sin evaluar</b> (cuentan como 3)' : ' · todos evaluados') + '. Toca el casillero para convocar o no.</p>';
    h += '<div class="ct-tabla"><div class="ct-fila ct-tit"><span></span><span>Jugador</span><span>G</span>' + HABILIDADES.map(function (x) { return '<span>' + x.corto + '</span>'; }).join('') + '</div>';
    st.roster.slice().sort(function (x, y) { return (+x.num || 0) - (+y.num || 0); }).forEach(function (p) {
      h += '<div class="ct-fila' + (p.noConv ? ' fuera' : '') + '"><input type="checkbox" data-conv="' + p.id + '"' + (p.noConv ? '' : ' checked') + ' aria-label="Convocar a ' + esc(p.name) + '">' +
        '<span class="ct-nom"><b>' + esc(p.name || '#' + p.num) + '</b> <small>#' + esc(p.num) + '</small></span>' +
        '<button class="ct-g g ' + letraG(p) + '" data-a="genero" data-id="' + p.id + '">' + letraG(p) + '</button>' +
        HABILIDADES.map(function (x) { return selectEv(p, x.k); }).join('') + '</div>';
    });
    h += '</div>';
    h += '<button class="btn danger full" data-a="vaciar">Borrar plantel de las cartas</button>';
  }
  h += '<button class="btn big fill disp full" data-a="paso" data-v="partido"' + (conv.length >= 7 ? '' : ' disabled') + '>Seguir: partido</button>';
  if (conv.length < 7) h += '<p class="muted" style="margin:0">Se necesitan al menos 7 convocados.</p>';
  return h + '</section>';
}

function sel(clave, etiqueta, opciones, ayuda) {
  const v = String(st.cfg[clave]);
  return '<div class="field"><label class="lbl" for="cf-' + clave + '">' + etiqueta + '</label><select id="cf-' + clave + '" data-cf="' + clave + '">' +
    Object.keys(opciones).map(function (k) { return '<option value="' + k + '"' + (v === k ? ' selected' : '') + '>' + opciones[k] + '</option>'; }).join('') +
    '</select>' + (ayuda ? '<span class="muted">' + ayuda + '</span>' : '') + '</div>';
}
function num(clave, etiqueta, ayuda) {
  return '<div class="field"><label class="lbl" for="cf-' + clave + '">' + etiqueta + '</label><input id="cf-' + clave + '" type="number" min="1" inputmode="numeric" data-cf="' + clave + '" value="' + st.cfg[clave] + '">' +
    (ayuda ? '<span class="muted">' + ayuda + '</span>' : '') + '</div>';
}

function vistaPartido() {
  const c = st.cfg, m = margenes(Object.assign({}, c));
  let h = '<section class="pad stack">';
  h += '<p class="muted" style="margin:0">Las cartas cambian según cómo parte el partido. Si no sabes si partirás en ataque o defensa, imprime ambas variantes.</p>';
  h += '<h2 class="h2 disp">Inicio</h2>';
  h += '<div class="grid2 team-toggle"><button class="btn us" data-a="cf" data-k="inicio" data-v="ataque" aria-pressed="' + (c.inicio !== 'defensa') + '">Partimos en ATAQUE</button>' +
    '<button class="btn th" data-a="cf" data-k="inicio" data-v="defensa" aria-pressed="' + (c.inicio === 'defensa') + '">Partimos en DEFENSA</button></div>';
  h += sel('division', 'Tipo de partido', { mixto: 'Mixto', open: 'Open', femenino: 'Femenino' });
  if (c.division === 'mixto') {
    h += sel('startRatio', 'Proporción del primer punto', { '4M3F': '4 hombres / 3 mujeres', '3M4F': '3 hombres / 4 mujeres' });
    h += '<label class="switch">Alternar con regla ABBA<input type="checkbox" data-cfk="abba"' + (c.abba ? ' checked' : '') + '></label>';
  }
  h += '<div class="grid2">' + num('meta', 'Puntos para ganar', 'Tamaño del tablero') + num('halfAt', 'Medio tiempo en', 'En el medio tiempo se invierte quién recibe') + '</div>';
  h += '<h2 class="h2 disp">Criterio (competencia)</h2>';
  h += sel('compModo', 'Modalidad', MODALIDADES, c.compModo === 'auto' ? 'El motor elige según el marcador.' : 'Los márgenes se siguen aplicando.');
  h += sel('rivalNivel', 'Nivel del rival', { menor: 'Menor que el nuestro', similar: 'Similar', mayor: 'Mayor que el nuestro' });
  h += '<label class="switch">Partido crucial (hay que ganar sí o sí)<input type="checkbox" data-cfk="crucial"' + (c.crucial ? ' checked' : '') + '></label>';
  h += '<div class="grid2">' + num('margenVentaja', 'Margen de ventaja (+)') + num('margenDesventaja', 'Margen de desventaja (−)') + '</div>';
  h += '<p class="muted" style="margin:0">Se rota desde <b>+' + m.ventaja + '</b>' + (m.desventaja === Infinity ? ' y nunca descansan las piezas clave.' : ' y descansan las piezas clave desde <b>−' + m.desventaja + '</b>.') + '</p>';
  h += '<button class="btn big fill disp full" data-a="paso" data-v="tablero">Ver el tablero</button>';
  return h + '</section>';
}

/* ---------- tablero ---------- */
// Situación actual siguiendo la ruta (lista de 'us' / 'them').
function situacionDeRuta(k) {
  let a = 0, b = 0, d = null, r = 0;
  for (let i = 0; i < st.ruta.length; i++) {
    const m = st.ruta[i];
    r = d === m ? r + 1 : 1; d = m;
    if (m === 'us') a++; else b++;
  }
  return k.estados.get(a + '-' + b + '-' + (d || 'ini') + '-' + r) || null;
}

function lineaHTML(e, detalle) {
  const roles = { man: 'Manejo', av: 'Avance', gol: 'Gol' };
  return '<ol class="ct-linea">' + e.linea.map(function (id) {
    const p = P(id), rol = e.roles[id], nuevo = e.entran.indexOf(id) >= 0 && e.prev;
    return '<li class="' + (p && p.g === 'F' ? 'M' : 'H') + '"><b>' + esc(p ? p.name || '#' + p.num : '?') + '</b> <small>#' + esc(p ? p.num : '?') + '</small>' +
      (rol ? '<span class="ct-rol">' + roles[rol] + '</span>' : '') +
      (e.prev ? (nuevo ? '<span class="ct-tag entra">entra</span>' : '<span class="ct-tag repite">repite</span>') : '') +
      (detalle ? '<span class="muted ct-mot">' + esc(e.motivos[id] || '') + '</span>' : '') + '</li>';
  }).join('') + '</ol>';
}

function cabeceraSituacion(e) {
  return '<div class="ct-sit"><span class="ct-marc num-d">' + e.a + '–' + e.b + '</span>' +
    '<span class="ct-sit-t"><b>Punto ' + (e.a + e.b + 1) + '</b> · ' + llegada(e) + (e.medio ? ' · <b>medio tiempo</b>' : '') + '</span>' +
    '<span class="ct-chips"><span class="ct-od ' + (e.ataque ? 'at' : 'df') + '">' + (e.ataque ? 'ATAQUE' : 'DEFENSA') + '</span>' +
    (e.ratio ? '<span class="ct-ratio ' + (e.ratio === '4M3F' ? 'hom' : 'muj') + '">' + (e.ratio === '4M3F' ? '4H · 3M' : '4M · 3H') + '</span>' : '') +
    '<span class="zona-tag ' + ZONAS[e.zona].clase + '">' + ZONAS[e.zona].corto + '</span></span></div>';
}

function vistaTablero() {
  const k = calcular(), meta = k.meta, actual = situacionDeRuta(k);
  const casillasRuta = {}; let a = 0, b = 0; casillasRuta['0-0'] = true;
  st.ruta.forEach(function (m) { if (m === 'us') a++; else b++; casillasRuta[a + '-' + b] = true; });
  let h = '<section class="pad stack">';
  h += '<p class="muted" style="margin:0">' + Object.keys(k.casillas).length + ' marcadores posibles · ' + miles(k.estados.size) + ' situaciones · ' + miles(k.total) + ' rutas distintas (sin rachas de más de ' + MAX_RACHA + ' goles seguidos).</p>';

  // Tablero: columnas = nuestros goles (→), filas = goles del rival (↓)
  h += '<div class="ct-tablero" style="--n:' + (meta + 1) + '" role="grid" aria-label="Tablero del marcador">';
  h += '<span class="ct-esq">↓ rival<br>nos →</span>';
  for (let x = 0; x < meta; x++) h += '<span class="ct-eje">' + x + '</span>';
  for (let y = 0; y < meta; y++) {
    h += '<span class="ct-eje">' + y + '</span>';
    for (let x = 0; x < meta; x++) {
      const kk = x + '-' + y, cas = k.casillas[kk];
      if (!cas) { h += '<span class="ct-c nada" title="' + x + '-' + y + ': requiere más de ' + MAX_RACHA + ' goles seguidos"></span>'; continue; }
      const z = cas.situaciones[0].zona;
      h += '<button class="ct-c ' + ZONAS[z].clase + (casillasRuta[kk] ? ' ruta' : '') + (actual && actual.a === x && actual.b === y ? ' ficha' : '') + (celdaVista === kk ? ' vista' : '') +
        '" data-a="celda" data-v="' + kk + '" aria-label="Marcador ' + x + ' a ' + y + '"></button>';
    }
  }
  h += '</div>';
  h += '<div class="leyenda">' + Object.keys(ZONAS).map(function (z) { return '<span><i class="mapa-c ' + ZONAS[z].clase + '"></i>' + ZONAS[z].corto + '</span>'; }).join('') +
    '<span><i class="mapa-c ct-leg-ficha"></i>Ficha</span></div>';

  // Navegar la ruta
  h += '<div class="ct-mov"><button class="btn fill disp" data-a="mov" data-v="us">Gol nuestro →</button><button class="btn themfill disp" data-a="mov" data-v="them">Gol rival ↓</button></div>';
  h += '<div class="mini"><button class="btn" data-a="atras"' + (st.ruta.length ? '' : ' disabled') + '>↶ Deshacer gol</button><button class="btn" data-a="reiniciar"' + (st.ruta.length ? '' : ' disabled') + '>Volver a 0-0</button></div>';
  if (st.ruta.length) h += '<div class="ct-ruta">' + st.ruta.map(function (m) { return '<i class="' + m + '">' + (m === 'us' ? '→' : '↓') + '</i>'; }).join('') + '</div>';

  // Carta de la situación actual
  if (actual) {
    h += '<div class="card ct-carta">' + cabeceraSituacion(actual) + lineaHTML(actual, true) +
      '<span class="muted">' + miles(actual.rutas) + ' rutas llegan a esta situación (de ' + miles(k.casillas[actual.a + '-' + actual.b].rutas) + ' que llegan a ' + actual.a + '–' + actual.b + ').</span></div>';
  } else {
    h += '<div class="aviso">' + finDeRuta(k) + '</div>';
  }

  // Carta completa de una casilla tocada
  if (celdaVista && k.casillas[celdaVista]) h += cartaCasilla(k.casillas[celdaVista], true);
  return h + '</section>';
}

function finDeRuta(k) {
  let a = 0, b = 0;
  st.ruta.forEach(function (m) { if (m === 'us') a++; else b++; });
  if (a >= k.meta) return '¡Partido ganado ' + a + '–' + b + '! La ficha salió del tablero por la derecha.';
  if (b >= k.meta) return 'Partido perdido ' + a + '–' + b + '. La ficha salió del tablero por abajo.';
  return 'Ruta fuera de las cartas.';
}

// Carta de una casilla: todas las formas de llegar y la línea para cada una.
function cartaCasilla(cas, enPantalla) {
  const e0 = cas.situaciones[0], k = calcular();
  let h = '<div class="ct-cas' + (enPantalla ? ' card' : '') + '">';
  h += '<div class="ct-cas-h"><span class="ct-marc num-d">' + cas.a + '–' + cas.b + '</span><span>Punto ' + (cas.a + cas.b + 1) +
    (e0.ratio ? ' · ' + (e0.ratio === '4M3F' ? '4H·3M' : '4M·3H') : '') + ' · ' + ZONAS[e0.zona].corto + '<br><small>' + miles(cas.rutas) + ' rutas</small></span></div>';
  h += '<table class="ct-tab"><tbody>';
  cas.situaciones.filter(function (e) { return enPantalla || e.r <= st.rachaImp; }).forEach(function (e) {
    h += '<tr><th class="' + (e.d || 'ini') + '">' + (e.d ? (e.d === 'us' ? '→' : '↓') + (e.r > 1 ? '×' + e.r : '') : '0–0') + '</th>' +
      '<td class="od ' + (e.ataque ? 'at' : 'df') + '">' + (e.ataque ? 'A' : 'D') + '</td><td class="ln">' +
      e.linea.map(function (id) {
        const p = P(id), rol = e.roles[id];
        return '<span class="' + (p && p.g === 'F' ? 'M' : 'H') + (rol ? ' r' : '') + '">' + esc(abrev(p)) + (rol ? '<sup>' + { man: 'M', av: 'A', gol: 'G' }[rol] + '</sup>' : '') + '</span>';
      }).join(' ') + '</td></tr>';
  });
  h += '</tbody></table>';
  if (enPantalla) h += '<span class="muted">→ = llegamos con gol nuestro · ↓ = con gol rival · ×2 = segundo seguido. A/D = jugamos el punto en ataque o defensa. Letras chicas: M manejo, A avance, G gol principales.</span>';
  return h + '</div>';
}

/* ---------- imprimir ---------- */
function resumenVariante() {
  const c = st.cfg;
  return 'Partimos en ' + (c.inicio === 'defensa' ? 'DEFENSA' : 'ATAQUE') + ' · ' + { mixto: 'Mixto', open: 'Open', femenino: 'Femenino' }[c.division] +
    (c.division === 'mixto' ? ' · primer punto ' + (c.startRatio === '4M3F' ? '4H·3M' : '4M·3H') + (c.abba ? ' · ABBA' : '') : '') +
    ' · a ' + c.meta + ' · medio en ' + c.halfAt + ' · ' + MODALIDADES[c.compModo] + ' · rival ' + c.rivalNivel + (c.crucial ? ' · crucial' : '');
}
function vistaImprimir() {
  const k = calcular();
  const casillas = Object.keys(k.casillas).map(function (x) { return k.casillas[x]; })
    .sort(function (x, y) { return (x.a + x.b) - (y.a + y.b) || x.a - y.a; });
  let h = '<section class="pad stack no-imprimir">';
  h += '<p style="margin:0">Se imprime un cuadernillo con <b>una carta por marcador</b> (' + casillas.length + ' cartas), ordenadas por número de punto. Cada carta trae una fila por cada forma de llegar a ese marcador.</p>';
  h += '<div class="field"><label class="lbl" for="ct-racha">Rachas a incluir</label><select id="ct-racha" data-racha="1">' +
    [1, 2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '"' + (st.rachaImp === n ? ' selected' : '') + '>' + (n === 1 ? 'Solo sin racha (más corto)' : 'Hasta ' + n + ' goles seguidos') + '</option>'; }).join('') +
    '</select><span class="muted">Menos rachas = menos filas por carta y menos páginas. Con todas: ' + miles(k.estados.size) + ' filas.</span></div>';
  h += '<p class="muted" style="margin:0">Variante: ' + esc(resumenVariante()) + '</p>';
  h += '<button class="btn big fill disp full" data-a="imprimir">Imprimir o guardar PDF</button>';
  h += '<p class="muted" style="margin:0">En el teléfono: "Compartir" → "Imprimir" o "Guardar como PDF". Abajo ves una vista previa.</p>';
  h += '</section>';

  // Cuadernillo (lo único que sale en la impresión)
  h += '<div id="impresion"><div class="ct-portada"><h1 class="disp">Cartas de juego</h1><p><b>' + esc(resumenVariante()) + '</b></p>' +
    '<p>Plantel: ' + convocados().map(function (p) { return esc(abrev(p)) + ' = ' + esc(p.name) + ' #' + esc(p.num); }).join(' · ') + '</p>' +
    '<p><b>Cómo usarlas:</b> busca la carta del marcador actual. Elige la fila según cómo llegaste: <b>→</b> si el último gol fue nuestro, <b>↓</b> si fue del rival; <b>×2, ×3…</b> si es el segundo, tercero… gol seguido del mismo equipo. ' +
    '<b>A/D</b> indica si el próximo punto lo jugamos en ataque o en defensa. Las letras chicas marcan al manejo (M), corte de avance (A) y corte de gol (G) principales; el color, si es hombre o mujer.</p>' +
    '<p class="leyenda">' + Object.keys(ZONAS).map(function (z) { return '<span><i class="mapa-c ' + ZONAS[z].clase + '"></i>' + ZONAS[z].nombre + '</span>'; }).join('') + '</p></div>';
  h += '<div class="ct-cuaderno">' + casillas.map(function (cas) { return cartaCasilla(cas, false); }).join('') + '</div></div>';
  return h;
}

function render() {
  const y = window.scrollY;
  let cuerpo;
  if (st.paso === 'partido') cuerpo = vistaPartido();
  else if (st.paso === 'tablero') cuerpo = convocados().length >= 7 ? vistaTablero() : vistaPlantel();
  else if (st.paso === 'imprimir') cuerpo = convocados().length >= 7 ? vistaImprimir() : vistaPlantel();
  else cuerpo = vistaPlantel();
  RAIZ.innerHTML = cabecera() + cuerpo + '<p class="muted pad no-imprimir"><a href="./">← Volver a UltiApp</a></p>' +
    (aviso ? '<div class="toast" role="status">' + esc(aviso) + '</div>' : '');
  window.scrollTo(0, y);
}

/* ---------- acciones ---------- */
RAIZ.addEventListener('click', function (ev) {
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const a = b.getAttribute('data-a'), v = b.getAttribute('data-v'), id = b.getAttribute('data-id');
  switch (a) {
    case 'paso': st.paso = v; window.scrollTo(0, 0); break;
    case 'importar': {
      const d = plantelDeApp(v); if (!d) break;
      st.roster = d.roster; if (d.division) st.cfg.division = d.division;
      sucio(); avisar(d.roster.length + ' jugadores traídos (la app no se modifica)'); break;
    }
    case 'pegar': {
      const lista = leerTexto(document.getElementById('ct-texto').value);
      if (!lista.length) { avisar('No encontré líneas con número'); break; }
      st.roster = v === 'reemplazar' ? lista : st.roster.concat(lista);
      sucio(); avisar(lista.length + ' jugadores ' + (v === 'reemplazar' ? 'cargados' : 'agregados')); break;
    }
    case 'genero': { const p = P(id); if (p) { p.g = p.g === 'F' ? 'M' : 'F'; sucio(); } break; }
    case 'vaciar': if (confirm('¿Borrar el plantel de las cartas? (La app no se modifica.)')) { st.roster = []; st.ruta = []; sucio(); } break;
    case 'cf': st.cfg[b.getAttribute('data-k')] = v; sucio(); break;
    case 'celda': celdaVista = celdaVista === v ? null : v; break;
    case 'mov': {
      const k = calcular();
      st.ruta.push(v);
      if (!situacionDeRuta(k)) {
        let a2 = 0, b2 = 0, d = null, r = 0;
        st.ruta.forEach(function (m) { r = d === m ? r + 1 : 1; d = m; if (m === 'us') a2++; else b2++; });
        if (a2 < k.meta && b2 < k.meta && r > MAX_RACHA) { st.ruta.pop(); avisar('Las cartas no incluyen más de ' + MAX_RACHA + ' goles seguidos'); }
      }
      celdaVista = null; break;
    }
    case 'atras': st.ruta.pop(); break;
    case 'reiniciar': st.ruta = []; celdaVista = null; break;
    case 'imprimir': guardar(); window.print(); return;
  }
  guardar(); render();
});
RAIZ.addEventListener('change', function (ev) {
  const el = ev.target;
  if (el.hasAttribute('data-conv')) { const p = P(el.getAttribute('data-conv')); if (p) p.noConv = !el.checked; sucio(); }
  else if (el.hasAttribute('data-ev')) {
    const p = P(el.getAttribute('data-id')); if (!p) return;
    p.ev = p.ev || {}; const k = el.getAttribute('data-ev');
    if (el.value) p.ev[k] = +el.value; else delete p.ev[k];
    sucio();
  }
  else if (el.hasAttribute('data-cf')) {
    const k = el.getAttribute('data-cf');
    st.cfg[k] = el.type === 'number' ? Math.max(1, parseInt(el.value, 10) || CFG_BASE[k]) : el.value;
    if (k === 'meta') st.cfg.meta = Math.min(Math.max(st.cfg.meta, 5), 21);
    sucio();
  }
  else if (el.hasAttribute('data-cfk')) { st.cfg[el.getAttribute('data-cfk')] = el.checked; sucio(); }
  else if (el.hasAttribute('data-racha')) { st.rachaImp = +el.value; }
  else return;
  guardar(); render();
});

render();
