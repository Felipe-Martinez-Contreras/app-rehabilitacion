/**
 * La melodía del día: cada nota tocada con su tiempo, solo en memoria durante
 * la sesión. Entran las notas de la flor, los toques del piano y la campana de
 * cada abanico completado (no el arpegio ni el acorde).
 */
export interface NotaMelodia {
  /** Momento en que sonó, en ms. */
  t: number;
  frecuencia: number;
  timbre: 'nota' | 'campana';
}

export const MELODIA = {
  /** Duración máxima de la reproducción (desde la primera nota hasta la última). */
  maximoMs: 20000,
  /** Los silencios más largos (descansos, pausas) se recortan a este valor. */
  silencioMaximoMs: 1500,
  /** Al escalar, dos notas no quedan más cerca que esto, para que cada una se distinga. */
  separacionMinimaMs: 150,
} as const;

/**
 * Comprime la melodía conservando el ritmo:
 * 1. recorta los silencios de más de 1,5 s a 1,5 s;
 * 2. si aún dura más de 20 s, escala los intervalos;
 * 3. al escalar, ningún intervalo baja de 150 ms (los que ya eran más cortos, se
 *    quedan como eran). Los intervalos que no están en ese mínimo se escalan un
 *    poco más para que el total siga cabiendo en 20 s.
 * Si ni con todos los intervalos al mínimo cabe (más de ~130 notas), se conservan
 * las últimas notas que caben. Devuelve los tiempos contados desde 0.
 */
export function comprimirMelodia(notas: readonly NotaMelodia[]): NotaMelodia[] {
  const { maximoMs, silencioMaximoMs, separacionMinimaMs } = MELODIA;
  let orden = [...notas].sort((a, b) => a.t - b.t);
  if (orden.length === 0) return [];

  const intervalosDe = (lista: NotaMelodia[]) =>
    lista.slice(1).map((n, i) => Math.min(Math.max(n.t - lista[i].t, 0), silencioMaximoMs));
  let intervalos = intervalosDe(orden);
  /** Mínimo de cada intervalo: 150 ms, o su valor original si ya era más corto. */
  let minimos = intervalos.map((x) => Math.min(x, separacionMinimaMs));

  // Demasiadas notas: se conservan las últimas que caben con la separación mínima.
  let sobra = minimos.reduce((a, b) => a + b, 0) - maximoMs;
  let desde = 0;
  while (sobra > 0 && desde < minimos.length) sobra -= minimos[desde++];
  if (desde > 0) {
    orden = orden.slice(desde);
    intervalos = intervalos.slice(desde);
    minimos = minimos.slice(desde);
  }

  // Escala los intervalos libres; los que caen bajo su mínimo se fijan y se repite.
  const fijo = intervalos.map(() => false);
  for (;;) {
    const total = intervalos.reduce((a, b) => a + b, 0);
    if (total <= maximoMs + 1e-6) break;
    const fijos = intervalos.reduce((a, x, i) => (fijo[i] ? a + x : a), 0);
    const libres = total - fijos;
    if (libres <= 0) break;
    const factor = (maximoMs - fijos) / libres;
    let cambio = false;
    intervalos = intervalos.map((x, i) => {
      if (fijo[i]) return x;
      const escalado = x * factor;
      if (escalado >= minimos[i]) return escalado;
      fijo[i] = true;
      cambio = true;
      return minimos[i];
    });
    if (!cambio) break;
  }

  let t = 0;
  return orden.map((nota, i) => {
    if (i > 0) t += intervalos[i - 1];
    return { ...nota, t };
  });
}

/** Duración de una melodía ya comprimida (tiempo de la última nota). */
export function duracionMelodia(notas: readonly NotaMelodia[]): number {
  return notas.length ? notas[notas.length - 1].t : 0;
}
