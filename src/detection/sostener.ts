import { CONFIG } from './config';

/**
 * Temporizador de una postura sostenida (calibración, gesto de inicio, abanico).
 * Suma el tiempo real entre fotogramas mientras se cumple la condición, así no
 * depende de los fps. Al soltar, se pausa (sin penalización) o vuelve a cero.
 */
export interface EstadoSostener {
  acumuladoMs: number;
  /** Tiempo del fotograma anterior en que se cumplía la condición; null si no se cumplía. */
  ultimoT: number | null;
  completo: boolean;
}

export const SOSTENER_INICIAL: EstadoSostener = { acumuladoMs: 0, ultimoT: null, completo: false };

export type AlSoltar = 'pausar' | 'reiniciar';

export function actualizarSostener(
  estado: EstadoSostener,
  t: number,
  cumple: boolean,
  duracionMs: number,
  alSoltar: AlSoltar = 'pausar',
): EstadoSostener {
  if (estado.completo) return estado;
  if (!cumple) {
    if (alSoltar === 'reiniciar') return SOSTENER_INICIAL;
    return estado.ultimoT === null ? estado : { ...estado, ultimoT: null };
  }
  // El primer fotograma que cumple solo marca el inicio: el tiempo se cuenta entre fotogramas.
  const paso = estado.ultimoT === null ? 0 : Math.min(Math.max(t - estado.ultimoT, 0), CONFIG.maximoPasoMs);
  const acumuladoMs = Math.min(estado.acumuladoMs + paso, duracionMs);
  return { acumuladoMs, ultimoT: t, completo: acumuladoMs >= duracionMs };
}

/** Fracción completada, entre 0 y 1 (para el anillo de progreso). */
export function progreso(estado: EstadoSostener, duracionMs: number): number {
  return Math.min(estado.acumuladoMs / duracionMs, 1);
}
