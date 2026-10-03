import type { EntradaRegistro, Repeticiones } from './registro';

/**
 * Tu jardín: una flor por cada rutina con al menos una repetición, tanto si llegó
 * al cierre como si terminó antes ("Terminar por hoy"). Las flores nunca se
 * marchitan: no hay rachas ni fechas que se pierdan.
 */
export function rutinaDaFlor(repeticiones: Repeticiones): boolean {
  return repeticiones.flor + repeticiones.piano + repeticiones.abanico > 0;
}

export function floresDelJardin(registro: readonly EntradaRegistro[]): number {
  return registro.filter((e) => rutinaDaFlor(e.repeticiones)).length;
}

/** Cuántas flores se dibujan (el resto se cuenta en texto, para no llenar la pantalla). */
export const MAXIMO_FLORES_DIBUJADAS = 60;

export function floresDibujadas(flores: number): { dibujadas: number; mas: number } {
  const dibujadas = Math.min(Math.max(flores, 0), MAXIMO_FLORES_DIBUJADAS);
  return { dibujadas, mas: Math.max(flores - dibujadas, 0) };
}
