import { CONFIG } from './config';
import type { Orientacion } from './types';

/**
 * Clasifica la orientación con la componente z de la normal de la palma.
 * `signoPalma` es el signo registrado en la calibración mientras la persona
 * mostraba la palma; sin él solo se distingue "de frente" de "de canto".
 */
export function clasificarOrientacion(orientacionZ: number, signoPalma: 1 | -1 | null): Orientacion {
  if (Math.abs(orientacionZ) < CONFIG.orientacion.minimoDeFrente) return 'de-canto';
  if (signoPalma === null) return 'de-frente';
  return Math.sign(orientacionZ) === signoPalma ? 'palma' : 'dorso';
}

/** La orientación permite contar toques y repeticiones: palma a la cámara (o de frente, sin calibrar). */
export function orientacionValida(orientacion: Orientacion): boolean {
  return orientacion === 'palma' || orientacion === 'de-frente';
}

/** Signo a registrar en la calibración; null si la mano está de canto y no se puede saber. */
export function signoDePalma(orientacionZ: number): 1 | -1 | null {
  if (Math.abs(orientacionZ) < CONFIG.orientacion.minimoDeFrente) return null;
  return orientacionZ > 0 ? 1 : -1;
}
