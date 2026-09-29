import { CONFIG } from './config';
import {
  actualizarHisteresis,
  interrumpir,
  type ConfigHisteresis,
  type EstadoHisteresis,
  type ResultadoHisteresis,
} from './hysteresis';
import type { Metricas } from './metrics';
import type { Calibracion } from './types';

export const HISTERESIS_TOQUE: ConfigHisteresis = {
  direccion: 'bajo',
  entrar: CONFIG.toque.entrar,
  salir: CONFIG.toque.salir,
  confirmacionMs: CONFIG.confirmacionMs,
};

/** Apertura que se debe superar para empezar un toque: 60 % del rango calibrado, o 1,40 sin calibrar. */
export function aperturaMinimaParaToque(calibracion: Calibracion | null): number {
  if (!calibracion) return CONFIG.toque.aperturaMinimaSinCalibrar;
  const { aperturaMin, aperturaMax } = calibracion;
  return aperturaMin + CONFIG.toque.fraccionAperturaMinima * (aperturaMax - aperturaMin);
}

/** Filtro de puño cerrado: la mano está lo bastante abierta como para que un toque cuente. */
export function manoAbiertaParaToque(m: Metricas, calibracion: Calibracion | null): boolean {
  return m.apertura > aperturaMinimaParaToque(calibracion);
}

/**
 * Estado del toque pulgar → dedo con histéresis:
 * - un toque solo puede empezar si `puedeEmpezar` (mano abierta y palma de
 *   frente) se cumple durante toda la confirmación; si deja de cumplirse, la
 *   confirmación en curso se anula;
 * - soltar se reconoce con cualquier postura, siempre que el pulgar se separe
 *   de todos los dedos (> umbral de salida). Así cerrar el puño o girar la
 *   mano a mitad de un toque no produce un segundo conteo al volver.
 */
export function actualizarToque(
  estado: EstadoHisteresis,
  m: Metricas,
  t: number,
  puedeEmpezar: boolean,
): ResultadoHisteresis {
  if (!estado.activo && !puedeEmpezar) return { estado: interrumpir(estado), cambio: false };
  return actualizarHisteresis(estado, m.toque, HISTERESIS_TOQUE, t);
}
