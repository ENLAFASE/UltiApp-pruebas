# Criterio de sugerencia de líneas ("motor de juego")

Este documento explica cómo decide la app qué línea sugerir, en el criterio **Competencia**. El código está separado en `js/criterio/` para poder pulirlo con el feedback de la cancha:

| Archivo | Qué contiene |
|---|---|
| `parametros.js` | **Todos los números ajustables** (notas, pesos, márgenes, castigos por desgaste). Se cambian aquí sin tocar el resto. |
| `zonas.js` | Qué modalidad aplica según el marcador. |
| `metricas.js` | Cómo se mide un jugador, una línea y el plantel. |
| `recomendador.js` | Cómo se arma la línea de 7 en cada modalidad. |

## 1. El árbol de marcadores

Un partido a 15 tiene **225 marcadores en juego** (de 0-0 a 14-14). Los marcadores finales (15-x o x-15) no necesitan sugerencia. Desde cada marcador solo hay dos caminos: anotamos nosotros o anota el rival.

Lo que importa para decidir la línea no es el marcador exacto, sino tres cosas:

1. **La diferencia** (nosotros − rival): ¿vamos cómodos, parejos o abajo?
2. **El momento**: inicio (menos de 4 puntos jugados), medio o **cierre** (algún equipo a 3 o menos de ganar).
3. **El contexto**: nivel del rival y si el partido es crucial.

Con eso, el árbol se agrupa en **cuatro zonas**:

| Zona | Cuándo (ajustes por defecto) | Qué hace |
|---|---|---|
| **Asegurar el ataque** | Inicio, empate o ventaja de +1 a +3 | En **ataque**: la mejor línea ofensiva para no perder el punto. En **defensa**: descansa el núcleo ofensivo para el próximo ataque. |
| **Línea fuerte** | Desventaja de −1 a −5, cierre parejo (diferencia ≤ 1 con alguien a 3 o menos de ganar), o partido crucial | La mejor combinación, en ataque o en defensa. |
| **Rotación con piezas clave** | Ventaja de **+4** o más | La estructura (manejo, corte de avance, corte de gol) con piezas clave; el resto, minutos para jugadores de menor nivel. |
| **Descanso de piezas clave** | Desventaja de **−6** o más | Descansan las piezas clave; se busca el mejor manejo disponible fuera de ellas. |

Con los ajustes por defecto (rival similar, no crucial), los 225 marcadores se reparten así: **48** asegurar el ataque, **66** línea fuerte, **66** rotación y **45** descanso. El mapa en **Ajustes → Criterio** muestra esta división con los ajustes actuales.

### Ajustes que mueven las zonas

- **Margen de ventaja** (+4) y **margen de desventaja** (−6): se cambian en Ajustes.
- **Rival mayor**: la ventaja para rotar sube +2 (no se relaja tan pronto).
- **Rival menor**: la ventaja para rotar baja 1.
- **Partido crucial**: la ventaja para rotar sube +2, **nunca** se da descanso a las piezas clave y, sin ventaja amplia, siempre es línea fuerte.
- **Modalidad fija**: "Asegurar el ataque" o "Línea fuerte" reemplaza la elección automática, pero los márgenes se siguen aplicando.

## 2. Ataque y defensa dentro del árbol

En Ultimate saca el pull quien anotó. Por eso:

- Después de **anotar nosotros**, el punto siguiente es de **defensa**.
- Después de **anotar el rival**, el punto siguiente es de **ataque**.
- Si los dos equipos "mantienen el saque" (cada uno anota cuando recibe), se alterna ataque–defensa.
- Si **quebramos** (anotamos en defensa), volvemos a defender. La línea de defensa puede jugar varios puntos seguidos, y ahí el desgaste importa: el motor castiga cada punto seguido desde el segundo.
- En el **medio tiempo** se invierte: recibe quien sacó el primer pull.

Empezar en ataque o en defensa no cambia la zona (la zona depende del marcador). Sí cambia **qué línea** se arma dentro de la zona:

- En "Asegurar el ataque", un punto de ataque usa la mejor línea ofensiva, y uno de defensa deja descansar a esa línea.
- En las otras zonas, el nivel de cada jugador se calcula distinto: en ataque pesa más lo ofensivo y en defensa, la defensa.

## 3. Proporción de géneros (mixto)

Con la regla ABBA, la proporción cambia cada dos puntos, **sin importar** si se ataca o se defiende. Así, en un partido aparecen las cuatro combinaciones: ataque con 4H, ataque con 4M, defensa con 4H y defensa con 4M. Por eso el motor:

- Calcula las **piezas clave por género** (el mejor 35 % de hombres y de mujeres), para que siempre haya piezas clave de ambos.
- Arma la línea respetando los cupos del punto (por ejemplo, 3H y 4M) también cuando asegura la estructura.
- Si todos los buenos manejos son de un solo género, la pestaña **Plantel** lo avisa: en los puntos con menos cupos de ese género, el manejo puede quedar débil.

## 4. Estructura y desgaste

- **Estructura**: en Competencia y Amistoso, cada línea lleva un manejo, un corte de avance y un corte de gol buenos (nota 4 o más, o la mejor disponible). Cada rol lo cubre **una persona distinta**.
- **Desgaste**: puntos jugados, minutos jugados (desde el pull hasta el gol de cada punto) y puntos seguidos. Se ve en cada botón de jugador ("3p 6'") y en la tarjeta de la línea.

## 5. Qué falta pulir (con feedback de cancha)

- Ajustar en `parametros.js` los pesos y castigos según cómo se sientan las sugerencias en partidos reales.
- Considerar el **tiempo** (cap blando y duro) además del marcador: con poco tiempo, una ventaja de +2 vale más.
- Diferenciar el "núcleo ofensivo" de la "línea de defensa" a partir de los resultados reales de cada línea (holds y breaks).
- Registrar el nivel del rival por partido (hoy es un ajuste general).

## 6. Cartas de juego (tablero de marcadores)

El partido se puede ver como un tablero: la ficha de nuestro equipo parte en 0-0; cada gol nuestro la mueve a la derecha y cada gol rival, hacia abajo, hasta que sale del tablero (ganamos por la derecha, perdemos por abajo).

- Con meta 15 y sin permitir más de 6 goles seguidos de un mismo equipo hay **142.866.705 rutas** (36,9 millones solo hasta 14-14). Imposible de imprimir.
- Pero para el motor, dos rutas que llegan al mismo marcador **de la misma forma** son equivalentes. La línea depende de:
  - el **marcador** → zona (asegurar ataque, línea fuerte, rotación, descanso);
  - el **n.º de punto** → proporción ABBA;
  - **quién anotó el último gol** → si el próximo punto es de ataque o de defensa (y el medio tiempo);
  - la **racha** (goles seguidos del mismo equipo) → cuántos puntos seguidos lleva la línea del mismo tipo.
- Eso reduce todo a **1.769 situaciones** en **205 marcadores** alcanzables (máximo 12 por marcador). Una carta por marcador, con una fila por cada forma de llegar.
- Lo único que sí depende de la ruta completa es el desgaste acumulado (puntos jugados por cada uno): se estima siguiendo la **ruta más probable** hasta cada situación.
- Pendiente: probar en cancha si conviene sumar el tiempo (cap) como variable de las cartas.

## 7. Posiciones y máximo de puntos seguidos (2026-11-21)

- **Posiciones:** toda línea, en ataque y en defensa, lleva **3 manejos, 2 cortes de avance y 2 cortes de gol**. Primero se eligen los 3 principales (la columna vertical) y después se llenan los otros 4 puestos con el criterio de la zona más la nota en esa posición. Los manejos deben tener perfil de manejador (nota 3 o más).
- **Máximo de puntos seguidos:** en todas las zonas del marcador (desde el 2026-11-21, cambio B), quien llegó al máximo descansa un punto (por defecto 4; se cambia en Ajustes y en las Cartas). Si por cansancio no queda nadie de nivel para la columna vertical o el 3.er manejo, juega igual uno de los cansados y el motivo lo indica. Con planteles normales (14 o más) eso no ocurre; con 9 o 10 jugadores sí, a veces.
- **Asegurar el ataque en defensa:** la columna vertical se elige entre los buenos (nota 4 o más), rotando entre ellos; no siempre entran los mejores. El núcleo ofensivo descansa cuando hay alternativa buena.

## 8. Reparto según la evaluación (cambios A + B + C, 2026-11-21)

Una simulación de miles de partidos (con fin por tiempo en 12, 13, 14 o 15 y mitad ganados, mitad perdidos) mostró que el motor respetaba el orden por nivel, pero los de nota baja casi no jugaban, los especialistas jugaban mucho más que los parejos de su misma nota y había rachas de hasta 10 puntos seguidos. Se aplicó:

- **A · Equidad** (`PARAM.EQUIDAD = 0.15`): cada jugador tiene una *cuota* de puntos proporcional a su nivel general, dentro de su género si es mixto (3,5 cupos por género en promedio). Quien va atrasado respecto de su cuota recibe un pequeño empujón al llenar cada puesto (0,15 por punto de atraso).
- **B · Máximo en todas las zonas:** el máximo de puntos seguidos vale también en rotación y descanso de piezas clave.
- **C · Menos peso a la posición** (`PARAM.PESO_POSICION` de 0,5 a 0,25): la nota general pesa más que la nota en la posición.

Resultado con el plantel Mixto de Húsares (16): la distancia promedio a la cuota bajó de 11,8 a 8,4 puntos de %, la racha máxima de 10 a 4, y los partidos ganados (modelo donde una línea mejor anota más) de 54 % a 50 %. Quedan pendientes de decidir: tope duro (descanso obligado al doble del máximo, para planteles de 8), subir la equidad a 0,30, un mínimo de participación y el marcador esperado por tiempo para el cierre.

## 9. Equidad 0,30, mínimo de participación y marcador esperado (2026-11-21)

- **Equidad** sube a `PARAM.EQUIDAD = 0.30`.
- **Mínimo de participación** (`cfg.minPuntos`, por defecto 2; 0 = sin mínimo; en Ajustes y en las Cartas): desde la segunda mitad, quien no ha llegado al mínimo entra en un puesto fuera de la columna vertical (prefiere avance o gol; manejo solo con nota 3+). Cuántos entran por punto = deuda total ÷ puntos que quedan como mínimo (si el que va arriba anotara todos), para no dejarlos todos para el final.
- **Marcador esperado por tiempo** (`cfg.metaTiempoOn`, `cfg.metaTiempo`, por defecto 12): si está activado, el motor razona con esa meta (`metaEfectiva()` en `zonas.js`) para el cierre ("línea fuerte") y para el mínimo. Se activa o desactiva durante el partido con el botón "a 15 / ⏱ a 12" de la pantalla de línea, y el número se cambia en Ajustes.

Simulación con el plantel Mixto de Húsares (16; 2.000 partidos por versión, fin por tiempo en 12-15):

| Versión | Distancia a la cuota | Racha máx. | Peor caso bajo 2 pts | Papalote | Ganados* |
|---|---|---|---|---|---|
| Original | 12,4 pp | 12 | 93,5 % | 0,6 pts | 52,0 % |
| A + B + C (0,15) | 8,8 | 4 | 83,2 % | 0,6 | 53,2 % |
| + equidad 0,30 | 6,8 | 4 | 84,1 % | 0,5 | 52,2 % |
| + mínimo 2 | 6,2 | 4 | 0,5 % | 2,2 | 49,6 % |
| + marcador esperado | 6,1 | 4 | 0 % | 2,2 | 49,1 % |

\* modelo donde una línea con mejor nivel anota un poco más seguido (margen ±1 punto). Con el marcador esperado, los puntos de Papalote en los últimos 3 del partido bajan de 24 % a 14 %. Pendiente: preferir cumplir el mínimo en puntos de rotación o de defensa antes que con el partido apretado.

## 10. Cómo se cumple el mínimo: oportunidades en defensa (2026-11-21)

Antes el mínimo se cumplía desde la segunda mitad en cualquier punto, y los de menor nivel entraban tarde (Papalote, mediana del primer punto: 13) y muchas veces con el partido apretado (41 %). Ahora:

1. **Oportunidad, desde el inicio:** en un punto de **defensa** en que el género del jugador tiene **mayoría** (4 hombres o 4 mujeres; en open, cualquier defensa) y fuera de "línea fuerte", entra uno de los que están bajo el mínimo: el de menor nivel. El resto de su género se elige sumando `PARAM.COMPENSACION × (nivel en defensa − 3)` (por defecto 1,0), para compensar su entrada.
2. **Urgencia, en la segunda mitad:** si la deuda × 2 ≥ los puntos que quedan como mínimo (con `metaEfectiva`), entran aunque no sea el punto ideal.

Simulación (plantel Mixto, 2.000 partidos): Papalote pasa de 34 % a 79 % de sus puntos en defensa con 4 hombres, de 42 % a 16 % con el partido apretado y su primer punto (mediana) del 13 al 4. Con compensación, la defensa promedio de los hombres que lo acompañan sube de 3,11 a 3,50. Todos siguen llegando al mínimo; los partidos ganados quedan dentro del margen de error (52,0 % → 50,8 %, ±1).
