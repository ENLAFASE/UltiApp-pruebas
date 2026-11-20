// Modos de la app: tres niveles de funciones, de lo más simple a lo más completo.
// Se elige en el Dashboard. Cada partido recuerda el modo con que se creó
// (game.modo), porque cada modo registra datos distintos.
import { store, cfg } from './almacen.js';

export const MODOS_APP = {
  planillero: {
    nombre: 'Planillero', nivel: 1,
    resumen: 'Lo básico de cualquier partido',
    ayuda: 'Para el staff de un torneo: tiempo, marcador, planteles de ambos equipos y estadísticas básicas (gol, asistencia e intercepción por jugador). Sin líneas, sin minutos jugados y sin registro jugada a jugada.'
  },
  asistente: {
    nombre: 'Asistente', nivel: 2,
    resumen: 'Gestión de líneas durante el partido',
    ayuda: 'Para dirigir al equipo: líneas con el motor de sugerencia, proporción de géneros, ataque o defensa, puntos y minutos jugados por cada uno. Estadísticas básicas (gol, asistencia, intercepción) más turnovers. Solo nuestro plantel; del rival, el nombre.'
  },
  coach: {
    nombre: 'Coach', nivel: 3,
    resumen: 'Estadísticas completas (locutor + registrador)',
    ayuda: 'Para un cuerpo técnico de dos personas: todo lo del Asistente más pull cronometrado, dentro/fuera, flujo de pases, turnovers detallados y llamados con su resolución.'
  }
};

// Modo vigente: el del partido en curso o, si no hay partido, el elegido en el Dashboard.
export function modoApp() {
  const m = (store.game && store.game.modo) || cfg().modoApp;
  return MODOS_APP[m] ? m : 'coach';
}
export function esPlanillero() { return modoApp() === 'planillero'; }
export function esAsistente() { return modoApp() === 'asistente'; }
export function esCoach() { return modoApp() === 'coach'; }
// ¿El modo usa evaluación de jugadores y motor de sugerencia?
export function usaMotor() { return modoApp() !== 'planillero'; }

// Plantel del rival (solo Planillero): una línea por jugador, "número nombre".
export function leerRivales(texto) {
  const lista = [];
  String(texto || '').split(/\n/).forEach(function (linea, i) {
    const t = linea.trim(); if (!t) return;
    const m = t.match(/^(\d+)\s*[-.,;]?\s*(.*)$/);
    lista.push(m ? { id: 'r' + (i + 1), num: m[1], name: m[2].trim(), rival: true }
                 : { id: 'r' + (i + 1), num: '', name: t, rival: true });
  });
  return lista;
}
