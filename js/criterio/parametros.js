// ============================================================================
//  CRITERIO · PARÁMETROS
//  Todos los números que usa el "motor de juego" para decidir líneas están
//  aquí, en un solo lugar. Cuando tengamos feedback de la cancha, se ajustan
//  estos valores sin tocar el resto del código.
// ============================================================================

export const PARAM = {
  // Evaluación (1 a 5)
  NOTA_BUENA: 4,          // desde esta nota alguien es "bueno" en un rol
  NOTA_MIN_MANEJO: 3,     // si el mejor manejo de la línea está bajo esto: alerta "sin manejo"
  NIVEL_SIN_EVALUAR: 3,   // nota que se asume si el jugador no está evaluado

  // Cómo se combina la evaluación en un "nivel" según el tipo de punto.
  // ofensa = promedio ponderado de manejo, corte de avance y corte de gol.
  PESO_ROLES_OFENSA: { man: 0.4, av: 0.3, gol: 0.3 },
  PESO_ATAQUE: { ofensa: 0.75, defensa: 0.25 },   // puntos en que recibimos
  PESO_DEFENSA: { ofensa: 0.35, defensa: 0.65 },  // puntos en que sacamos
  PESO_GENERAL: { ofensa: 0.55, defensa: 0.45 },  // "línea fuerte" y ranking general

  // Posiciones de cada línea (criterio general para todas las líneas, en ataque y en defensa):
  // 3 manejos, 2 cortes de avance y 2 cortes de gol.
  POSICIONES: { man: 3, av: 2, gol: 2 },
  NOTA_PERFIL_MANEJO: 3,  // desde esta nota de manejo alguien tiene "perfil de manejador"
  PESO_POSICION: 0.25,    // cuánto pesa la nota en la posición al llenar cada puesto (antes 0.5: favorecía demasiado a los especialistas)
  COMPENSACION: 1.0,      // si entra alguien por el mínimo, cuánto se premia el nivel en defensa del resto de su género
  EQUIDAD: 0.30,          // empujón por cada punto que alguien va atrasado respecto de su cuota (cuota = parte proporcional a su nivel)

  // Piezas clave: el mejor tramo del plantel convocado (por género si es mixto).
  PIEZAS_CLAVE_FRACCION: 0.35,

  // Zonas del marcador
  INICIO_PUNTOS: 4,       // si se han jugado menos de estos puntos en total: "inicio del partido"
  CIERRE_PUNTOS: 3,       // si algún equipo está a esta distancia de ganar: "cierre"
  PAREJO: 1,              // diferencia que se considera partido parejo
  AJUSTE_RIVAL_MAYOR: 2,  // contra un rival mayor, la ventaja para rotar sube en esto
  AJUSTE_RIVAL_MENOR: -1, // contra un rival menor, baja en esto
  AJUSTE_CRUCIAL: 2,      // en un partido crucial, la ventaja para rotar sube en esto

  // Desgaste
  BONO_DESCANSO: { fuerte: 0.3, ataque: 0.4, poca: 0.8, rotacion: 1.0 }, // premio por haber descansado el punto anterior
  CASTIGO_RACHA: 0.35,    // por cada punto seguido jugado desde el 2.º en adelante
  CASTIGO_PUNTOS: 0.05,   // por cada punto jugado en el partido (reparte minutos)
  CASTIGO_NUCLEO_ATAQUE: 1.5, // en "asegurar el ataque", lo que se castiga en defensa a quien es del núcleo ofensivo

  // Rotación (ganando por el margen de ventaja o más)
  PRINCIPALES_GENERO: 4,  // descansan los 4 hombres y las 4 mujeres de mayor nivel general (en open: PRINCIPALES_OPEN)
  PRINCIPALES_OPEN: 7,
  CASTIGO_PRINCIPAL_ROTACION: 3, // cuánto se castiga a un principal para que entre solo si hace falta
  NOTA_MIN_POSICION_ROTACION: 3, // fuera de la columna vertical, nota mínima en la posición que ocupa
  PAREJAS_BAJOS: 4,       // cuántos de menor nivel (fuera de los principales y sin nota 4+ en ataque) forman parejas, por género
  // Posición en ataque: castigo por jugar fuera de la posición en que tiene su mejor nota
  CASTIGO_FUERA_POSICION: 1.0,
  DIF_FUERA_POSICION: 2   // se considera fuera de posición si su nota ahí es 2+ puntos menor que su mejor nota
};
