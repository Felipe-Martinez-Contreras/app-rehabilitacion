/**
 * Volumen del acorde del abanico (0–1) según el avance del temporizador (0–1).
 * Mientras se sostiene, crece al ritmo del temporizador desde un mínimo audible;
 * si se suelta, es 0 (el motor de sonido lo desvanece con suavidad, sin cortes).
 */
export const VOLUMEN_ACORDE_MINIMO = 0.25;

export function volumenAcorde(avance: number, sosteniendo: boolean): number {
  if (!sosteniendo) return 0;
  const a = Math.min(Math.max(avance, 0), 1);
  return VOLUMEN_ACORDE_MINIMO + (1 - VOLUMEN_ACORDE_MINIMO) * a;
}
