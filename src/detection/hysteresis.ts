/**
 * Máquina de estados con histéresis: un umbral para entrar al estado activo,
 * otro para salir, y un mínimo de fotogramas seguidos antes de confirmar el
 * cambio. Así el temblor cerca de un umbral no produce dobles conteos.
 */
export interface ConfigHisteresis {
  /** 'bajo': se activa cuando el valor baja del umbral (p. ej., toque). 'alto': cuando sube. */
  direccion: 'bajo' | 'alto';
  entrar: number;
  salir: number;
  fotogramas: number;
}

export interface EstadoHisteresis {
  activo: boolean;
  /** Fotogramas seguidos que ya cumplen la condición de cambio. */
  pendientes: number;
}

export const ESTADO_INICIAL: EstadoHisteresis = { activo: false, pendientes: 0 };

export interface ResultadoHisteresis {
  estado: EstadoHisteresis;
  /** true solo en el fotograma en que el cambio de estado se confirma. */
  cambio: boolean;
}

function cumpleCambio(activo: boolean, valor: number, c: ConfigHisteresis): boolean {
  if (c.direccion === 'bajo') return activo ? valor > c.salir : valor < c.entrar;
  return activo ? valor < c.salir : valor > c.entrar;
}

export function actualizarHisteresis(
  estado: EstadoHisteresis,
  valor: number,
  config: ConfigHisteresis,
): ResultadoHisteresis {
  if (!cumpleCambio(estado.activo, valor, config)) {
    return { estado: estado.pendientes === 0 ? estado : { activo: estado.activo, pendientes: 0 }, cambio: false };
  }
  const pendientes = estado.pendientes + 1;
  if (pendientes >= config.fotogramas) {
    return { estado: { activo: !estado.activo, pendientes: 0 }, cambio: true };
  }
  return { estado: { activo: estado.activo, pendientes }, cambio: false };
}
