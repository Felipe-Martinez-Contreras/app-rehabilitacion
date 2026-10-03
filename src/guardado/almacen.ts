import { validarAjustes, type Ajustes } from './ajustes';
import { validarRegistro, type EntradaRegistro } from './registro';

/**
 * Único lugar que toca `localStorage`, siempre con try/catch (puede no existir o
 * fallar: modo privado, cuota llena, almacenamiento bloqueado). Solo dos claves.
 * La calibración nunca se guarda: se hace en cada sesión.
 */
export const CLAVES = { ajustes: 'mqs:ajustes', registro: 'mqs:registro' } as const;

/** Lo mínimo de `Storage` que se usa (las pruebas pasan uno falso). */
export interface AlmacenSimple {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

function almacenNavegador(): AlmacenSimple | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function leer(clave: string, almacen: AlmacenSimple | null): unknown {
  try {
    const texto = almacen?.getItem(clave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

/** Devuelve true si se pudo guardar. */
function escribir(clave: string, valor: unknown, almacen: AlmacenSimple | null): boolean {
  try {
    if (!almacen) return false;
    almacen.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export function leerAjustes(almacen = almacenNavegador()): Ajustes {
  return validarAjustes(leer(CLAVES.ajustes, almacen));
}

/** Guarda solo los campos conocidos y válidos. */
export function guardarAjustes(ajustes: Ajustes, almacen = almacenNavegador()): boolean {
  return escribir(CLAVES.ajustes, validarAjustes(ajustes), almacen);
}

export function leerRegistro(almacen = almacenNavegador()): EntradaRegistro[] {
  return validarRegistro(leer(CLAVES.registro, almacen));
}

export function guardarRegistro(registro: readonly EntradaRegistro[], almacen = almacenNavegador()): boolean {
  return escribir(CLAVES.registro, validarRegistro(registro), almacen);
}

/** "Borrar mi registro": borra el registro (y con él, el jardín). Los ajustes se mantienen. */
export function borrarRegistro(almacen = almacenNavegador()): boolean {
  try {
    almacen?.removeItem(CLAVES.registro);
    return almacen !== null;
  } catch {
    return false;
  }
}
