/**
 * Máquina de estados con histéresis: un umbral para entrar al estado activo,
 * otro para salir, y un tiempo mínimo durante el cual la condición debe
 * mantenerse sin interrupción antes de confirmar el cambio. Se mide en
 * milisegundos (no en fotogramas) para que no dependa de los fps.
 */
export interface ConfigHisteresis {
  /** 'bajo': se activa cuando el valor baja del umbral (p. ej., toque). 'alto': cuando sube. */
  direccion: 'bajo' | 'alto';
  entrar: number;
  salir: number;
  confirmacionMs: number;
}

export interface EstadoHisteresis {
  activo: boolean;
  /** Momento (ms) desde el que se cumple la condición de cambio; null si no se cumple. */
  desde: number | null;
}

export const ESTADO_INICIAL: EstadoHisteresis = { activo: false, desde: null };

export interface ResultadoHisteresis {
  estado: EstadoHisteresis;
  /** true solo en el fotograma en que el cambio de estado se confirma. */
  cambio: boolean;
}

function cumpleCambio(activo: boolean, valor: number, c: ConfigHisteresis): boolean {
  if (c.direccion === 'bajo') return activo ? valor > c.salir : valor < c.entrar;
  return activo ? valor < c.salir : valor > c.entrar;
}

/** Actualiza el estado con el valor del fotograma tomado en el instante `t` (ms). */
export function actualizarHisteresis(
  estado: EstadoHisteresis,
  valor: number,
  config: ConfigHisteresis,
  t: number,
): ResultadoHisteresis {
  if (!cumpleCambio(estado.activo, valor, config)) {
    return { estado: estado.desde === null ? estado : { activo: estado.activo, desde: null }, cambio: false };
  }
  const desde = estado.desde ?? t;
  if (t - desde >= config.confirmacionMs) {
    return { estado: { activo: !estado.activo, desde: null }, cambio: true };
  }
  return { estado: { activo: estado.activo, desde }, cambio: false };
}

/** Anula un cambio en curso (p. ej., cuando el fotograma no es válido para contar). */
export function interrumpir(estado: EstadoHisteresis): EstadoHisteresis {
  return estado.desde === null ? estado : { activo: estado.activo, desde: null };
}
