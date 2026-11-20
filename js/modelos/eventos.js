// Tipos de evento del partido y su descripción en palabras.
// Cada cosa que pasa en la cancha (línea, pull, pase, gol, llamado...) es un evento.
import { cfg } from '../almacen.js';
import { short } from './jugador.js';

export const KINDS = ['Foul', 'Pick', 'Travel', 'Strip', 'Dentro/Fuera', 'Down', 'Contacto', 'Stall', 'Lesión', 'Otro'];
export const RES = {
  aceptado: 'Aceptado (no contestado)',
  contestado: 'Contestado, disco vuelve',
  retirado: 'Retirado',
  observador: 'Decisión de observador'
};
export const RES_SHORT = { aceptado: 'Aceptado', contestado: 'Contestado', retirado: 'Retirado', observador: 'Observador' };

// Llamados que, si el rival los acepta, le dan el disco al equipo que llamó
// (por ejemplo, un "down": el disco no se atrapó, hay turnover).
// Si se contestan, el disco vuelve a quien lo tenía.
const CAMBIAN_POSESION = ['Down', 'Dentro/Fuera', 'Stall'];

// Posesión que se sugiere al reanudar después de un llamado.
// k = { team, kind, res }; actual = equipo con el disco antes del llamado.
// Devuelve { equipo, motivo }; equipo null = no hay sugerencia (decide el observador).
export function posesionSugerida(k, actual) {
  if (!k.kind) return { equipo: actual, motivo: '' };
  if (k.kind === 'Lesión') return { equipo: actual, motivo: 'Un cambio por lesión no cambia la posesión.' };
  if (!k.res) return { equipo: actual, motivo: '' };
  if (k.res === 'observador') return { equipo: null, motivo: 'Decide el observador: elige quién reanuda.' };
  if (CAMBIAN_POSESION.indexOf(k.kind) >= 0) {
    if (k.res === 'aceptado') return { equipo: k.team, motivo: k.kind + ' aceptado: el disco pasa al equipo que llamó.' };
    if (k.res === 'contestado') return { equipo: actual, motivo: 'Contestado: el disco vuelve a quien lo tenía.' };
    return { equipo: actual, motivo: 'Retirado: sigue quien tenía el disco.' };
  }
  return { equipo: actual, motivo: 'Este llamado no cambia la posesión: sigue quien tenía el disco.' };
}

export function teamName(t) { return t === 'us' ? cfg().club : cfg().rival; }

export function describe(e) {
  switch (e.type) {
    case 'line': return 'Línea: ' + e.players.map(short).join(' ');
    case 'pull': return 'Pull de ' + teamName(e.team) + (e.player ? ' (' + short(e.player) + ')' : '') +
      (e.hang != null ? ', ' + (e.hang / 1000).toFixed(2) + ' s' : '') + (e.auto ? '' : ', ' + (e.inBounds ? 'dentro' : 'fuera'));
    case 'pickup': return 'Levanta ' + short(e.player);
    case 'pass': return 'Pase ' + short(e.from) + ' a ' + short(e.to);
    case 'goal': return 'Gol de ' + (e.to ? short(e.to) : cfg().club + ' (sin registrar quién)') + (e.from ? ', asistencia ' + short(e.from) : '');
    case 'themGoal': return 'Gol de ' + cfg().rival + (e.to ? ' (' + short(e.to) + (e.from ? ', asistencia ' + short(e.from) : '') + ')' : '');
    case 'throwaway': return 'Turnover de ' + (e.player ? short(e.player) : cfg().club);
    case 'stall': return 'Stall a ' + short(e.player);
    case 'drop': return 'Drop de ' + short(e.player);
    case 'block': return 'Intercepción de ' + (e.player ? short(e.player) : cfg().club);
    case 'themBlock': return 'Intercepción de ' + cfg().rival + (e.player ? ' (' + short(e.player) + ')' : '');
    case 'themTurn': return 'Turnover de ' + cfg().rival;
    case 'call':
      if (e.kind === 'Lesión') return 'Cambio por lesión de ' + teamName(e.team) + (e.out ? ': sale ' + short(e.out) + ', entra ' + short(e.in) : '');
      return 'Llamado de ' + teamName(e.team) + ': ' + e.kind +
        (e.player ? ' (' + (e.team === 'us' ? short(e.player) : '#' + e.player) + ')' : '') + ', ' + RES_SHORT[e.res];
    case 'timeout': return 'Timeout de ' + teamName(e.team);
    case 'end': return 'Partido finalizado';
  }
  return e.type;
}
