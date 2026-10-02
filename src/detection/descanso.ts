/**
 * Temporizador del descanso (20 s) con pausa. No depende de la mano: avanza
 * con el reloj mientras no esté en pausa. El tiempo se pasa como argumento
 * para probarlo sin reloj.
 */
export interface EstadoDescanso {
  restanteMs: number;
  /** Tiempo de la última actualización sin pausa; null en pausa o al empezar. */
  ultimoT: number | null;
}

export function descansoInicial(duracionMs: number): EstadoDescanso {
  return { restanteMs: duracionMs, ultimoT: null };
}

export function actualizarDescanso(estado: EstadoDescanso, t: number, enPausa: boolean): EstadoDescanso {
  if (enPausa) return estado.ultimoT === null ? estado : { ...estado, ultimoT: null };
  const paso = estado.ultimoT === null ? 0 : Math.max(t - estado.ultimoT, 0);
  return { restanteMs: Math.max(estado.restanteMs - paso, 0), ultimoT: t };
}

export function descansoTerminado(estado: EstadoDescanso): boolean {
  return estado.restanteMs <= 0;
}

/** Segundos que se muestran en texto (redondeados hacia arriba: 20, 19, … 1). */
export function segundosRestantes(estado: EstadoDescanso): number {
  return Math.ceil(estado.restanteMs / 1000);
}
