import { CONFIG } from './config';
import type { Calibracion } from './types';

/** Valor en la fracción `f` del rango entre `min` y `max`. */
const enRango = (min: number, max: number, f: number) => min + f * (max - min);

/** Umbrales de apertura de la flor, como porcentaje del rango calibrado. */
export function umbralesFlor(c: Calibracion): { cerrada: number; abierta: number } {
  return {
    cerrada: enRango(c.aperturaMin, c.aperturaMax, CONFIG.flor.fraccionCerrada),
    abierta: enRango(c.aperturaMin, c.aperturaMax, CONFIG.flor.fraccionAbierta),
  };
}

/**
 * Umbrales de separación del abanico: porcentaje del rango entre los dedos
 * juntos (la calibración no los mide: se usa la base por defecto) y la
 * separación máxima calibrada.
 */
export function umbralesAbanico(c: Calibracion): { juntos: number; separados: number } {
  const base = CONFIG.abanico.separacionJuntosPorDefecto;
  return {
    juntos: enRango(base, c.separacionMax, CONFIG.abanico.fraccionJuntos),
    separados: enRango(base, c.separacionMax, CONFIG.abanico.fraccionSeparados),
  };
}

/** Apertura como fracción del rango calibrado (0 = cerrada, 1 = abierta), limitada a 0–1. */
export function aperturaRelativa(apertura: number, c: Calibracion): number {
  const rango = c.aperturaMax - c.aperturaMin;
  if (!(rango > 0)) return 0;
  return Math.min(Math.max((apertura - c.aperturaMin) / rango, 0), 1);
}
