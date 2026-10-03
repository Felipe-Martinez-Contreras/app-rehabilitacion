import type { Dedo } from '../detection/types';

/**
 * Qué nota toca cada evento, todo en Do. Frecuencias en Hz (Do4 = 261,63).
 * - La flor sube por la escala mayor de Do: sus notas siempre van en orden, y el
 *   oído espera Fa después de Mi.
 * - El piano, el arpegio y los acordes usan notas de la pentatónica de Do (Do, Mi,
 *   Sol), para que cualquier combinación de toques suene armoniosa.
 */
export const DO = 261.63;
export const RE = 293.66;
export const MI = 329.63;
export const FA = 349.23;
export const SOL = 392.0;
export const LA = 440.0;
export const SI = 493.88;
export const DO_AGUDO = DO * 2;

export const ESCALA_MAYOR: readonly number[] = [DO, RE, MI, FA, SOL, LA, SI];
export const PENTATONICA: readonly number[] = [DO, RE, MI, SOL, LA];

/**
 * Nota de la repetición `n` de la flor (1, 2, 3…): Do, Re, Mi, Fa, Sol, La, Si,
 * Do agudo y sigue en la octava siguiente. Con 8 repeticiones completa una octava.
 */
export function notaFlor(repeticion: number): number {
  const i = Math.max(repeticion, 1) - 1;
  return ESCALA_MAYOR[i % ESCALA_MAYOR.length] * 2 ** Math.floor(i / ESCALA_MAYOR.length);
}

/** Acorde de Do en registro medio (Do4–Mi4–Sol4): abanico y resolución de la flor. */
export const ACORDE_DO: readonly number[] = [DO, MI, SOL];

/** La frecuencia es un Do (en cualquier octava). */
export function esDo(frecuencia: number): boolean {
  const octavas = Math.log2(frecuencia / DO);
  return Math.abs(octavas - Math.round(octavas)) < 1e-6;
}

/**
 * Al completar la flor: si la última nota no es un Do (con 5 repeticiones termina
 * en Sol), un acorde suave de Do resuelve la melodía. Si ya termina en Do (8
 * repeticiones: una octava exacta), no hace falta.
 */
export function acordeResolucionFlor(objetivo: number): readonly number[] | null {
  return esDo(notaFlor(objetivo)) ? null : ACORDE_DO;
}

/** Nota de cada dedo del piano; suena aunque el dedo no sea el que sigue. */
export const NOTA_DEDO: Record<Dedo, number> = { indice: DO, medio: MI, anular: SOL, menique: DO_AGUDO };

/** Arpegio que cierra cada vuelta del piano: las notas de los cuatro dedos, seguidas. */
export const ARPEGIO: readonly number[] = [DO, MI, SOL, DO_AGUDO];
/** Tiempo entre las notas del arpegio. */
export const ARPEGIO_PASO_MS = 110;

/** Campana al completar cada repetición del abanico. */
export const CAMPANA = DO_AGUDO * 2;
