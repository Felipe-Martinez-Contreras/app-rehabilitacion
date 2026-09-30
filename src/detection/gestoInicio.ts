import { CONFIG } from './config';
import type { Metricas } from './metrics';
import { actualizarSostener, type EstadoSostener } from './sostener';
import type { Calibracion } from './types';
import { umbralesFlor } from './umbrales';

/**
 * Inicio con gesto en "¿Todo listo?": mano abierta (sobre el umbral de "abierta"
 * de la flor, relativo al rango calibrado) y palma de frente, sostenida 2 s.
 * Empieza a contar 1 s después de que aparece la pantalla; si la mano se cierra
 * o se pierde, vuelve a cero. Nunca es la única vía: siempre está el botón.
 */
export function actualizarGestoInicio(
  estado: EstadoSostener,
  t: number,
  inicioPantalla: number,
  suavizadas: Metricas | null,
  puedeContar: boolean,
  calibracion: Calibracion,
): EstadoSostener {
  const cumple =
    t - inicioPantalla >= CONFIG.gestoInicio.esperaMs &&
    suavizadas !== null &&
    puedeContar &&
    suavizadas.apertura > umbralesFlor(calibracion).abierta;
  return actualizarSostener(estado, t, cumple, CONFIG.gestoInicio.sostenerMs, 'reiniciar');
}
