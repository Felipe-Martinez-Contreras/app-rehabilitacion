import { CONFIG } from './config';
import type { Calibracion, RangoSeparacion } from './types';

/** Valor en la fracción `f` del rango entre `min` y `max`. */
const enRango = (min: number, max: number, f: number) => min + f * (max - min);

/** Umbrales de apertura de la flor, como porcentaje del rango calibrado. */
export function umbralesFlor(c: Calibracion): { cerrada: number; abierta: number } {
  return {
    cerrada: enRango(c.aperturaMin, c.aperturaMax, CONFIG.flor.fraccionCerrada),
    abierta: enRango(c.aperturaMin, c.aperturaMax, CONFIG.flor.fraccionAbierta),
  };
}

/** Umbrales de separación del abanico: porcentaje del rango de su minicalibración. */
export function umbralesAbanico(r: RangoSeparacion): { juntos: number; separados: number } {
  return {
    juntos: enRango(r.juntos, r.separados, CONFIG.abanico.fraccionJuntos),
    separados: enRango(r.juntos, r.separados, CONFIG.abanico.fraccionSeparados),
  };
}

/** Apertura como fracción del rango calibrado (0 = cerrada, 1 = abierta), limitada a 0–1. */
export function aperturaRelativa(apertura: number, c: Calibracion): number {
  const rango = c.aperturaMax - c.aperturaMin;
  if (!(rango > 0)) return 0;
  return Math.min(Math.max((apertura - c.aperturaMin) / rango, 0), 1);
}
