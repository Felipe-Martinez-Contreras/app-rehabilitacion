/**
 * Media móvil exponencial. `alfa` es el peso del valor nuevo (0–1).
 * Si no hay valor anterior, devuelve el valor nuevo.
 */
export function suavizar(anterior: number | null, nuevo: number, alfa: number): number {
  if (anterior === null) return nuevo;
  return anterior + alfa * (nuevo - anterior);
}

/** Suaviza cada campo numérico de un objeto de métricas. */
export function suavizarCampos<T extends Record<K, number>, K extends keyof T>(
  anterior: T | null,
  nuevo: T,
  campos: readonly K[],
  alfa: number,
): T {
  if (anterior === null) return nuevo;
  const resultado = { ...nuevo };
  for (const campo of campos) {
    resultado[campo] = suavizar(anterior[campo], nuevo[campo], alfa) as T[K];
  }
  return resultado;
}
