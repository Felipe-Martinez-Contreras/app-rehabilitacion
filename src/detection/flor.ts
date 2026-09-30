import { CONFIG } from './config';
import { actualizarHisteresis, interrumpir, type EstadoHisteresis } from './hysteresis';
import type { Metricas } from './metrics';
import type { Calibracion } from './types';
import { umbralesFlor } from './umbrales';

/**
 * La flor: cada ciclo cerrada → abierta cuenta una repetición.
 * Histéresis sobre la apertura (activo = abierta) con confirmación por tiempo.
 *
 * El estado inicial es "abierta": el ejercicio empieza después del gesto de mano
 * abierta, así que la primera repetición exige pasar por "cerrada" y luego por
 * "abierta". Al perder la mano se vuelve a este estado (se reinicia el ciclo en curso).
 */
export type EstadoFlor = EstadoHisteresis;

export const FLOR_INICIAL: EstadoFlor = { activo: true, desde: null };

export interface ResultadoFlor {
  estado: EstadoFlor;
  /** true solo en el fotograma en que se confirma una repetición. */
  repeticion: boolean;
}

/**
 * @param suavizadas métricas suavizadas del fotograma; null si la mano no se ve.
 * @param puedeContar mano lista y palma de frente (ver `procesarFotograma`).
 */
export function actualizarFlor(
  estado: EstadoFlor,
  t: number,
  suavizadas: Metricas | null,
  puedeContar: boolean,
  calibracion: Calibracion,
): ResultadoFlor {
  if (!suavizadas) return { estado: FLOR_INICIAL, repeticion: false };
  if (!puedeContar) return { estado: interrumpir(estado), repeticion: false };
  const { cerrada, abierta } = umbralesFlor(calibracion);
  const r = actualizarHisteresis(
    estado,
    suavizadas.apertura,
    { direccion: 'alto', entrar: abierta, salir: cerrada, confirmacionMs: CONFIG.confirmacionMs },
    t,
  );
  return { estado: r.estado, repeticion: r.cambio && r.estado.activo };
}
