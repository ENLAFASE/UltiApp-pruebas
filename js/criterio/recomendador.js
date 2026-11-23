// ============================================================================
//  CRITERIO · RECOMENDADOR DE LÍNEAS
//  Arma la línea de 7 según el criterio elegido en Ajustes y explica por qué
//  eligió a cada jugador. Solo usa jugadores convocados.
//
//    Competencia    según la zona del marcador (ver zonas.js):
//                   asegurar el ataque, línea fuerte, rotación con piezas
//                   clave o descanso de piezas clave.
//    Amistoso       rota, pero asegura manejo, corte de avance y corte de gol.
//    Entrenamiento  rotación pareja: descansó el punto anterior y menos puntos.
//
//  Siempre respeta la proporción de géneros si el partido es mixto; si no hay
//  suficientes jugadores de un género, completa con quien haya.
// ============================================================================
import { store, cfg } from '../almacen.js';
import { ev, evaluado } from '../coach/evaluacion.js';
import { PARAM } from './parametros.js';
import { ROLES, nivelPunto, nivelAtaque, nivelDefensa, nivelGeneral, piezasClave, n1 } from './metricas.js';
import { zonaDelMarcador, ZONAS, metaEfectiva } from './zonas.js';

export const MODOS = {
  competencia: { nombre: 'Competencia', ayuda: 'Decide según el marcador: asegurar el ataque, línea fuerte, rotación con piezas clave (ganando por el margen de ventaja) o descanso de piezas clave (perdiendo por el margen de desventaja). Siempre asegura manejo, corte de avance y corte de gol.' },
  amistoso: { nombre: 'Amistoso', ayuda: 'Rota a todos, pero asegura un buen manejo, un buen corte de avance y un buen corte de gol en cada punto.' },
  entrenamiento: { nombre: 'Entrenamiento', ayuda: 'Rotación pareja: entra quien descansó el punto anterior y lleva menos puntos jugados.' }
};

export function modoActual() { return MODOS[cfg().lineMode] ? cfg().lineMode : 'entrenamiento'; }

// Jugadores convocados para el partido (los no convocados no se sugieren ni se muestran).
export function convocados() { return store.roster.filter(function (p) { return !p.noConv; }); }

function genero(p) { return p.g === 'F' ? 'F' : 'M'; }
const ROLES_ESTRUCTURA = ROLES.filter(function (r) { return r.k !== 'def'; });

// s = estado del partido, req = { M, F } que pide la proporción (o null),
// elegidos = ids que el coach ya marcó a mano.
// ctx (opcional) = { roster, cfg } para calcular situaciones hipotéticas sin
// partido en curso (lo usan las Cartas de juego). Sin ctx se usa la app.
export function recomendarLinea(s, req, elegidos, ctx) {
  const c = (ctx && ctx.cfg) || cfg(), ataque = s.offense === 'us', EN_CANCHA = 7;
  const modo = MODOS[c.lineMode] ? c.lineMode : 'entrenamiento';
  const lista = ctx ? ctx.roster.filter(function (p) { return !p.noConv; }) : convocados();
  const enLista = function (id) { return lista.some(function (p) { return p.id === id; }); };
  const sel = elegidos.filter(enLista), motivos = {}, roles = {}, principales = [], tengo = { M: 0, F: 0 };
  const P = function (id) { return lista.find(function (x) { return x.id === id; }); };
  sel.forEach(function (id) { motivos[id] = 'Elegido por ti'; tengo[genero(P(id))]++; });
  let libres = lista.filter(function (p) { return sel.indexOf(p.id) < 0; });
  // Quienes llegaron al máximo de puntos seguidos (partido apretado): descansan,
  // salvo que no haya nadie de su nivel para la columna vertical o el 3.er manejo.
  let cansados = [];
  const NOTA_RESCATE = ' (pasa el máximo de puntos seguidos: no hay reemplazo de su nivel)';

  /* ----- desgaste ----- */
  const primerPunto = !s.lastLine.length;
  function descanso(p) { return s.lastLine.indexOf(p.id) < 0; }
  function pts(p) { return (s.stats[p.id] || {}).pts || 0; }
  function racha(p) { return (s.racha || {})[p.id] || 0; }
  function desgaste(p, bono) {
    return (descanso(p) ? bono : 0) - PARAM.CASTIGO_RACHA * Math.max(0, racha(p) - 1) - PARAM.CASTIGO_PUNTOS * pts(p);
  }
  function txtDesgaste(p) {
    if (primerPunto) return '';
    const r = racha(p);
    return ' · ' + (descanso(p) ? 'descansó' : (r >= 2 ? r + ' puntos seguidos' : 'jugó el anterior')) + ' · ' + pts(p) + (pts(p) === 1 ? ' punto' : ' puntos');
  }

  /* ----- armar la línea ----- */
  function cabe(p) { return sel.length < EN_CANCHA && (!req || tengo[genero(p)] < req[genero(p)]); }
  function tomar(p, motivo) {
    sel.push(p.id); tengo[genero(p)]++; motivos[p.id] = motivo;
    libres = libres.filter(function (x) { return x.id !== p.id; });
    cansados = cansados.filter(function (x) { return x.id !== p.id; });
  }
  // Posiciones: toda línea lleva 3 manejos, 2 cortes de avance y 2 cortes de gol.
  const NOMBRE_POS = { man: 'Manejo', av: 'Corte de avance', gol: 'Corte de gol' };
  function faltan(rol) { return PARAM.POSICIONES[rol] - sel.filter(function (id) { return roles[id] === rol; }).length; }
  // Los elegidos a mano sin posición toman la que falta y mejor les calza.
  function ubicarElegidos() {
    sel.filter(function (id) { return !roles[id]; })
      .sort(function (x, y) { const ex = ev(P(x)), ey = ev(P(y)); return Math.max(ey.man, ey.av, ey.gol) - Math.max(ex.man, ex.av, ex.gol); })
      .forEach(function (id) {
        const libresPos = ['man', 'av', 'gol'].filter(function (r) { return faltan(r) > 0; });
        const opciones = libresPos.length ? libresPos : ['man', 'av', 'gol'];
        roles[id] = opciones.reduce(function (m, r) { return ev(P(id))[r] > ev(P(id))[m] ? r : m; });
      });
  }
  // Llena los puestos que faltan (primero manejos, luego avance y gol) con el mejor
  // puntaje del criterio más la nota en esa posición. Para manejo se exige perfil
  // de manejador (nota 3 o más, o la mejor disponible).
  function completar(puntaje, motivoDe, sufijo) {
    ubicarElegidos();
    while (sel.length < EN_CANCHA && libres.length) {
      const rol = faltan('man') > 0 ? 'man' : faltan('av') > 0 ? 'av' : faltan('gol') > 0 ? 'gol' : null;
      let cands = libres.filter(cabe), forzado = false, rescate = false;
      if (!cands.length) { cands = libres.slice(); forzado = true; } // no alcanza la proporción de géneros
      // Rotación: fuera de la columna vertical, nota mínima en la posición (si hay quién).
      if (notaMinPos && rol) {
        const conNota = cands.filter(function (p) { return ev(p)[rol] >= notaMinPos; });
        if (conNota.length) cands = conNota;
      }
      if (rol === 'man') {
        // Perfil de manejador: nota 3 o más (o la mejor disponible). Si entre los descansados
        // no hay ninguno, entra un manejador que llegó al máximo de seguidos.
        const extra = cansados.filter(cabe);
        const mejorMan = Math.max.apply(null, cands.concat(extra).map(function (p) { return ev(p).man; }));
        const umbral = Math.min(PARAM.NOTA_PERFIL_MANEJO, mejorMan);
        const perfil = cands.filter(function (p) { return ev(p).man >= umbral; });
        if (perfil.length) cands = perfil;
        else {
          const conPerfil = extra.filter(function (p) { return ev(p).man >= umbral; });
          if (conPerfil.length) { cands = conPerfil; rescate = true; }
        }
      }
      if (!cands.length) break;
      const valor = function (p) {
        const pos = rol || ['man', 'av', 'gol'].reduce(function (m, r) { return ev(p)[r] > ev(p)[m] ? r : m; });
        const refuerzo = fuerteG && (fuerteG === 'todos' || genero(p) === fuerteG);
        return (refuerzo ? nivelPunto(p, ataque) + desgaste(p, 0.5) : puntaje(p)) + PARAM.PESO_POSICION * (ev(p)[pos] - 3) + PARAM.EQUIDAD * deficit(p) +
          (compensar && (compensar === 'todos' || genero(p) === compensar) ? PARAM.COMPENSACION * (nivelPunto(p, ataque) - 3) : 0) -
          (ataque && rol && fueraDePosicion(p, rol) ? PARAM.CASTIGO_FUERA_POSICION : 0);
      };
      cands.sort(function (a, b) { return (valor(b) - valor(a)) || ((+a.num || 0) - (+b.num || 0)); });
      const p = cands[0];
      const pos = rol || ['man', 'av', 'gol'].reduce(function (m, r) { return ev(p)[r] > ev(p)[m] ? r : m; });
      roles[p.id] = pos;
      const acompana = fuerteG && (fuerteG === 'todos' || genero(p) === fuerteG);
      tomar(p, NOMBRE_POS[pos] + ' (nota ' + ev(p)[pos] + ') · ' + (acompana ? 'Refuerza la línea que acompaña a la pareja (nivel ' + n1(nivelPunto(p, ataque)) + ')' + txtDesgaste(p) : motivoDe(p)) +
        (forzado ? ' (completa la línea; no alcanza la proporción)' : '') + (rescate ? NOTA_RESCATE : (sufijo || '')));
    }
  }
  // Asegura la columna vertical: un manejo, un corte de avance y un corte de gol
  // buenos (nota 4 o más, o la mejor disponible).
  //   rotar: entre los buenos entra quien descansó y lleva menos puntos;
  //          si no, entra la mejor nota (empate: menos desgaste).
  //   evitar:   ids que se prefiere no usar (si hay alternativa).
  //   preferir: ids que se prefiere usar si son buenos en el rol (piezas clave).
  // Cada rol lo cubre un jugador distinto: en una columna vertical nadie hace dos roles.
  const asignados = new Set();
  function asegurarEstructura(rotar, evitar, sufijo, preferir) {
    ROLES_ESTRUCTURA.forEach(function (rol) {
      // ¿Alguien ya elegido (a mano) cubre el rol y no tiene otro rol asignado?
      const yaEsta = sel.find(function (id) { return !asignados.has(id) && ev(P(id))[rol.k] >= PARAM.NOTA_BUENA; });
      if (yaEsta) { asignados.add(yaEsta); roles[yaEsta] = rol.k; principales.push(yaEsta); return; }
      let cands = libres.filter(cabe);
      const cansadosCabe = cansados.filter(cabe);
      if (!cands.length && !cansadosCabe.length) return;
      // El principal siempre es BUENO en su posición (nota 4 o más, o la mejor disponible).
      // "evitar" solo elige entre los buenos: si fuera de ese grupo no hay nadie bueno,
      // se usa igual a alguien del grupo (la columna vertical no se debilita).
      const notaMin = Math.min(PARAM.NOTA_BUENA, Math.max.apply(null, cands.concat(cansadosCabe).map(function (p) { return ev(p)[rol.k]; })));
      cands = cands.filter(function (p) { return ev(p)[rol.k] >= notaMin; });
      let rescate = false;
      if (!cands.length) { cands = cansadosCabe.filter(function (p) { return ev(p)[rol.k] >= notaMin; }); rescate = true; }
      if (evitar) {
        const fuera = cands.filter(function (p) { return !evitar.has(p.id); });
        if (fuera.length) cands = fuera;
      }
      let mejor = Math.max.apply(null, cands.map(function (p) { return ev(p)[rol.k]; }));
      if (preferir) {
        const clave = cands.filter(function (p) { return preferir.has(p.id) && ev(p)[rol.k] >= Math.min(PARAM.NOTA_BUENA, mejor); });
        if (clave.length) { cands = clave; mejor = Math.max.apply(null, cands.map(function (p) { return ev(p)[rol.k]; })); }
      }
      const buenos = cands.filter(function (p) { return ev(p)[rol.k] >= Math.min(PARAM.NOTA_BUENA, mejor); });
      buenos.sort(function (a, b) {
        // En ataque, primero quien tiene en esta posición su mejor nota (o un empate en lo mejor).
        const calce = ataque ? (fueraDePosicion(a, rol.k) - fueraDePosicion(b, rol.k)) : 0;
        if (calce) return calce;
        const nota = ev(b)[rol.k] - ev(a)[rol.k];
        const rot = (descanso(b) - descanso(a)) || (pts(a) - pts(b));
        return rotar ? (rot || nota) : (nota || (desgaste(b, 0.5) - desgaste(a, 0.5)));
      });
      const p = buenos[0];
      asignados.add(p.id); roles[p.id] = rol.k; principales.push(p.id); // rol principal de la columna vertical
      const esClave = preferir && preferir.has(p.id);
      tomar(p, rol.principal + ' (' + rol.nombre + ' ' + ev(p)[rol.k] + ')' + (esClave ? (sufijo || '') : '') + txtDesgaste(p) + (rescate ? NOTA_RESCATE : ''));
    });
  }
  // ¿Su mejor nota de ataque está claramente en OTRA posición? (si hay empate en lo
  // mejor, no tiene una posición preferida y puede jugar en cualquiera de ellas)
  function fueraDePosicion(p, rol) {
    const e = ev(p), max = Math.max(e.man, e.av, e.gol);
    const mejores = ['man', 'av', 'gol'].filter(function (r) { return e[r] === max; });
    return mejores.length === 1 && mejores[0] !== rol ? 1 : 0;
  }
  let notaMinPos = 0;   // rotación: nota mínima en la posición para completar la línea
  let fuerteG = null;   // género cuyo resto de la línea se elige por nivel (acompaña a una pareja)
  // Rotación: una pareja de jugadores de menor nivel entra junta cuando su género tiene
  // mayoría en el punto (4 de 7), y el resto de su género se elige entre los más fuertes.
  function entraPareja(parejas) {
    for (let i = 0; i < parejas.length; i++) {
      const par = parejas[i];
      if (par.some(function (p) { return !libres.some(function (x) { return x.id === p.id; }); })) continue;
      const g = genero(par[0]);
      if (req && c.mixed && !(req[g] > EN_CANCHA / 2)) continue;
      if ((req && c.mixed ? req[g] - tengo[g] : EN_CANCHA - sel.length) < 2) continue;
      const roles2 = []; let ok = true;
      par.forEach(function (p) {
        const r = ['av', 'gol', 'man'].filter(function (x) {
          return faltan(x) - roles2.filter(function (y) { return y === x; }).length > 0 && (x !== 'man' || ev(p).man >= PARAM.NOTA_PERFIL_MANEJO);
        }).sort(function (a, b) { return ev(p)[b] - ev(p)[a]; })[0];
        if (!r) ok = false;
        roles2.push(r);
      });
      if (!ok) continue;
      par.forEach(function (p, j) {
        const otro = par[1 - j];
        roles[p.id] = roles2[j];
        tomar(p, NOMBRE_POS[roles2[j]] + ' (nota ' + ev(p)[roles2[j]] + ') · Entra en pareja con ' + (otro.name || '#' + otro.num) +
          ' (nivel de la pareja ' + n1((nivelGeneral(p) + nivelGeneral(otro)) / 2) + '), acompañados de jugadores fuertes' + txtDesgaste(p));
      });
      fuerteG = c.mixed ? g : 'todos';
      return true;
    }
    return false;
  }
  // Cuota de puntos según la evaluación: cada uno debería jugar una parte de los
  // puntos proporcional a su nivel (dentro de su género si es mixto). Quien va
  // atrasado respecto de su cuota recibe un pequeño empujón (PARAM.EQUIDAD).
  const jugados = s.puntosJugados != null ? s.puntosJugados : (s.us || 0) + (s.them || 0);
  const cupoG = c.mixed ? { M: 3.5, F: 3.5 } : { M: 7, F: 7 };
  const sumaNivel = { M: 0, F: 0 };
  lista.forEach(function (p) { sumaNivel[c.mixed ? genero(p) : 'M'] += nivelGeneral(p); });
  function deficit(p) {
    const g = c.mixed ? genero(p) : 'M';
    if (!sumaNivel[g]) return 0;
    return cupoG[g] * nivelGeneral(p) / sumaNivel[g] * jugados - pts(p); // > 0: va atrasado
  }
  // Mínimo de participación (cfg.minPuntos, 0 = sin mínimo). Quien no ha llegado al
  // mínimo entra de dos formas:
  //  1) OPORTUNIDAD (desde el inicio): en un punto de DEFENSA en que su género tiene
  //     mayoría (por ejemplo, un hombre en un punto de 4 hombres; en open, cualquier
  //     defensa), fuera de la zona "línea fuerte". Entra uno por punto, el de menor nivel,
  //     y el resto de su género se elige pensando en compensarlo (mejores defensores).
  //  2) URGENCIA (segunda mitad): si lo que falta ya no alcanza con las oportunidades que
  //     quedan (deuda × 2 ≥ puntos que quedan como mínimo), entra aunque no sea el punto ideal.
  const minimo = Math.max(0, parseInt(c.minPuntos, 10) || 0);
  let compensar = null; // género cuyo resto de la línea se refuerza en defensa
  function minimoParticipacion() {
    if (!minimo) return;
    const meta = metaEfectiva(c), lider = Math.max(s.us || 0, s.them || 0);
    const quedan = Math.max(1, meta - lider);
    const deudores = libres.concat(cansados).filter(function (p) { return pts(p) < minimo; });
    if (!deudores.length) return;
    const deuda = deudores.reduce(function (t, p) { return t + minimo - pts(p); }, 0);
    function rolPara(p) {
      return ['av', 'gol', 'man'].filter(function (r) { return faltan(r) > 0 && (r !== 'man' || ev(p).man >= PARAM.NOTA_PERFIL_MANEJO); })
        .sort(function (a, b) { return ev(p)[b] - ev(p)[a]; })[0];
    }
    function entra(p, texto) {
      const rol = rolPara(p); if (!rol) return false;
      roles[p.id] = rol;
      tomar(p, NOMBRE_POS[rol] + ' (nota ' + ev(p)[rol] + ') · Mínimo de participación: lleva ' + pts(p) + ' de ' + minimo + (minimo === 1 ? ' punto' : ' puntos') + texto);
      return true;
    }
    // 2) Urgencia
    if (lider >= Math.ceil(meta / 2) && deuda * 2 >= quedan) {
      let cupo = Math.min(Math.ceil(deuda / quedan), EN_CANCHA - sel.length - 1);
      deudores.slice().sort(function (a, b) { return (pts(a) - pts(b)) || (descanso(b) - descanso(a)) || (nivelGeneral(b) - nivelGeneral(a)); })
        .forEach(function (p) { if (cupo > 0 && cabe(p) && entra(p, ' · quedan pocos puntos')) cupo--; });
      return;
    }
    // 1) Oportunidad: defensa, mayoría de su género, partido no apretado.
    if (ataque || (zona && zona.id === 'fuerte')) return;
    const opciones = deudores.filter(function (p) {
      if (!cabe(p)) return false;
      return !req || !c.mixed || req[genero(p)] > EN_CANCHA / 2;
    }).sort(function (a, b) { return (pts(a) - pts(b)) || (nivelGeneral(a) - nivelGeneral(b)); });
    const p = opciones[0];
    if (p && entra(p, ' · entra en defensa' + (req && c.mixed ? ' con ' + req[genero(p)] + (genero(p) === 'F' ? ' mujeres' : ' hombres') : '') + '; el resto de su género se elige premiando la defensa')) {
      compensar = c.mixed ? genero(p) : 'todos';
    }
  }
  function textoNivel(p, valor, tipo) { return 'Nivel ' + n1(valor) + ' ' + tipo + txtDesgaste(p); }

  // Cada criterio define: estructura (columna vertical), puntaje y motivo.
  let resumen, zona = null, plan;
  if (modo === 'competencia') {
    zona = zonaDelMarcador(s.us, s.them, c);
    resumen = 'Competencia · ' + ZONAS[zona.id].nombre + ' · ' + zona.motivo;
    const B = PARAM.BONO_DESCANSO;

    if (zona.id === 'rotacion') {
      // Descansan los principales (los 4 hombres y 4 mujeres de mayor nivel). La columna
      // vertical (manejo, avance y gol con nota 4+) sale de los demás si hay quién; el resto,
      // con nota 3+ en su posición, da minutos a los de nivel medio hacia abajo. Los de
      // menor nivel entran en parejas balanceadas, acompañados de jugadores fuertes.
      const princ = principalesRotacion(lista, c.mixed);
      // Turno de cada pareja: primero la que descansó el punto anterior, luego la que tiene
      // al jugador con menos puntos, para que las parejas se alternen.
      const parejas = parejasBajos(lista, c.mixed, princ).sort(function (a, b) {
        const desc = function (x) { return descanso(x[0]) && descanso(x[1]) ? 1 : 0; };
        const minimo = function (x) { return Math.min(pts(x[0]), pts(x[1])); };
        return (desc(b) - desc(a)) || (minimo(a) - minimo(b)) || ((pts(a[0]) + pts(a[1])) - (pts(b[0]) + pts(b[1])));
      });
      notaMinPos = PARAM.NOTA_MIN_POSICION_ROTACION;
      plan = { estructura: function () { asegurarEstructura(true, princ, ' · principal (no hay otro con nota 4+)', null); entraPareja(parejas); },
        puntaje: function (p) { return (5 - nivelPunto(p, ataque)) + desgaste(p, B.rotacion) - (princ.has(p.id) ? PARAM.CASTIGO_PRINCIPAL_ROTACION : 0); },
        motivo: function (p) { return (princ.has(p.id) ? 'Principal: entra porque faltan jugadores con nota 3+ en esta posición' : 'Suma minutos (nivel ' + n1(nivelPunto(p, ataque)) + ')') + txtDesgaste(p); } };
      resumen += ' · descansan los principales';

    } else if (zona.id === 'descanso') {
      const clave = piezasClave(lista, c.mixed);
      plan = { estructura: function () { asegurarEstructura(true, clave); },
        puntaje: function (p) { return (clave.has(p.id) ? -10 : 0) + desgaste(p, B.rotacion) + 0.2 * nivelPunto(p, ataque); },
        motivo: function (p) { return (clave.has(p.id) ? 'Pieza clave (no alcanzan los demás)' : 'Juega mientras descansan las piezas clave') + txtDesgaste(p); } };

    } else if (zona.id === 'fuerte') {
      plan = { estructura: function () { asegurarEstructura(false); },
        puntaje: function (p) { return nivelGeneral(p) + desgaste(p, B.fuerte); },
        motivo: function (p) { return textoNivel(p, nivelGeneral(p), 'general'); } };

    } else if (ataque) { // asegurar el ataque, punto en que recibimos: lo mejor para atacar
      plan = { estructura: function () { asegurarEstructura(false); },
        puntaje: function (p) { return nivelAtaque(p) + desgaste(p, B.ataque); },
        motivo: function (p) { return textoNivel(p, nivelAtaque(p), 'en ataque'); } };

    } else {
      // Asegurar el ataque, punto en que defendemos: hay rotación. La columna vertical
      // la forman jugadores BUENOS en su posición (nota 4 o más), rotando entre ellos
      // (no necesariamente los mejores), y descansa el núcleo ofensivo.
      const nucleo = nucleoOfensivo(lista, c.mixed);
      plan = { estructura: function () { asegurarEstructura(true, nucleo); },
        puntaje: function (p) { return nivelDefensa(p) - (nucleo.has(p.id) ? PARAM.CASTIGO_NUCLEO_ATAQUE : 0) + desgaste(p, B.rotacion); },
        motivo: function (p) { return nucleo.has(p.id) ? textoNivel(p, nivelDefensa(p), 'en defensa') + ' (del núcleo ofensivo)' : textoNivel(p, nivelDefensa(p), 'en defensa') + ' · rota en defensa'; } };
    }

  } else if (modo === 'amistoso') {
    resumen = 'Amistoso · rota, con manejo, corte de avance y corte de gol asegurados.';
    plan = { estructura: function () { asegurarEstructura(true); }, puntaje: function (p) { return desgaste(p, 1); }, motivo: rotacionTxt };

  } else {
    resumen = 'Entrenamiento · rotación pareja según puntos jugados.';
    plan = { estructura: null, puntaje: function (p) { return desgaste(p, 1); }, motivo: rotacionTxt };
  }

  // Máximo de puntos seguidos por jugador cuando el partido va apretado (zonas
  // en todas las zonas del marcador): quien llegó al máximo descansa este punto,
  // salvo que no haya reemplazo de su nivel.
  const maxSeg = Math.max(0, parseInt(c.maxSeguidos, 10) || 0);
  if (zona && maxSeg > 0) {
    cansados = libres.filter(function (p) { return racha(p) >= maxSeg; });
    libres = libres.filter(function (p) { return racha(p) < maxSeg; });
  }
  if (plan.estructura) plan.estructura();
  minimoParticipacion();
  completar(plan.puntaje, plan.motivo);
  if (sel.length < EN_CANCHA && cansados.length) {
    libres = libres.concat(cansados);
    completar(plan.puntaje, plan.motivo, NOTA_RESCATE);
  }
  if (cansados.length) resumen += ' · descansan ' + cansados.length + ' por el máximo de ' + maxSeg + ' seguidos';

  function rotacionTxt(p) {
    if (primerPunto) return 'Primer punto: rotación por número';
    return (descanso(p) ? 'Descansó el punto anterior' : 'Jugó el anterior') + ' · ' + pts(p) + (pts(p) === 1 ? ' punto jugado' : ' puntos jugados');
  }

  const sinEvaluar = lista.filter(function (p) { return !evaluado(p); }).length;
  return { ids: sel, resumen: resumen, motivos: motivos, roles: roles, principales: principales, descansanMax: cansados.map(function (p) { return p.id; }), sinEvaluar: sinEvaluar, modo: modo, zona: zona && zona.id };
}

// Rotación: los principales (4 hombres y 4 mujeres de mayor nivel general; en open, 7).
export function principalesRotacion(lista, mixto) {
  const princ = new Set();
  const top = function (g, n) {
    g.slice().sort(function (a, b) { return nivelGeneral(b) - nivelGeneral(a); }).slice(0, n).forEach(function (p) { princ.add(p.id); });
  };
  if (mixto) {
    top(lista.filter(function (p) { return p.g !== 'F'; }), PARAM.PRINCIPALES_GENERO);
    top(lista.filter(function (p) { return p.g === 'F'; }), PARAM.PRINCIPALES_GENERO);
  } else top(lista, PARAM.PRINCIPALES_OPEN);
  return princ;
}
// Parejas de menor nivel, por género, armadas para que las parejas queden lo más
// parejas posible entre sí (suma de niveles generales lo más igual posible).
export function parejasBajos(lista, mixto, princ) {
  const grupos = mixto ? [lista.filter(function (p) { return p.g !== 'F'; }), lista.filter(function (p) { return p.g === 'F'; })] : [lista];
  const parejas = [];
  grupos.forEach(function (g) {
    // De menor nivel = fuera de los principales y sin una posición fuerte (ninguna nota 4+ en
    // manejo, avance o gol): quien tiene una posición fuerte entra por su posición.
    let bajos = g.filter(function (p) { const e = ev(p); return !princ.has(p.id) && Math.max(e.man, e.av, e.gol) < PARAM.NOTA_BUENA; })
      .sort(function (a, b) { return nivelGeneral(a) - nivelGeneral(b); }).slice(0, PARAM.PAREJAS_BAJOS);
    if (bajos.length % 2) bajos = bajos.slice(0, bajos.length - 1);
    if (bajos.length < 2) return;
    if (bajos.length === 4) {
      const opciones = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
      const suma = function (par) { return nivelGeneral(bajos[par[0]]) + nivelGeneral(bajos[par[1]]); };
      const mejor = opciones.reduce(function (m, o) { return Math.abs(suma(o[0]) - suma(o[1])) < Math.abs(suma(m[0]) - suma(m[1])) ? o : m; });
      mejor.forEach(function (par) { parejas.push([bajos[par[0]], bajos[par[1]]]); });
    } else parejas.push([bajos[0], bajos[1]]);
  });
  return parejas;
}

// Los mejores para atacar (los que se reservan para el próximo punto de ataque).
function nucleoOfensivo(lista, mixto) {
  const nucleo = new Set();
  const top = function (g, n) {
    g.slice().sort(function (a, b) { return nivelAtaque(b) - nivelAtaque(a); }).slice(0, n).forEach(function (p) { nucleo.add(p.id); });
  };
  if (mixto) {
    top(lista.filter(function (p) { return p.g !== 'F'; }), 4);
    top(lista.filter(function (p) { return p.g === 'F'; }), 4);
  } else top(lista, 7);
  return nucleo;
}
