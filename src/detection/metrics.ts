import { CONFIG } from './config';
import { distancia3D, MUNECA, PULGAR_PUNTA, PUNTAS_DEDOS, tamanoPalma, TOTAL_LANDMARKS } from './geometry';
import type { Dedo, Landmarks } from './types';

const DEDOS: readonly Dedo[] = ['indice', 'medio', 'anular', 'menique'];

export interface Metricas {
  /** Promedio de la distancia de las puntas (8, 12, 16, 20) a la muñeca. */
  apertura: number;
  /** Distancia de la punta del pulgar (4) a la punta más cercana de los otros dedos. */
  toque: number;
  /** Dedo cuya punta está más cerca del pulgar. */
  dedoMasCercano: Dedo;
  /** Promedio de las distancias entre puntas vecinas (8–12, 12–16, 16–20). */
  separacion: number;
}

/**
 * Calcula las métricas a partir de landmarks en píxeles.
 * Todas se dividen por el tamaño de la palma. Devuelve null si la mano
 * no está completa o es demasiado pequeña para medir con fiabilidad.
 */
export function calcularMetricas(puntos: Landmarks): Metricas | null {
  if (puntos.length < TOTAL_LANDMARKS) return null;
  const palma = tamanoPalma(puntos);
  if (!(palma >= CONFIG.palmaMinimaPx)) return null;

  const muneca = puntos[MUNECA];
  const pulgar = puntos[PULGAR_PUNTA];

  let sumaApertura = 0;
  let toque = Infinity;
  let dedoMasCercano: Dedo = 'indice';
  PUNTAS_DEDOS.forEach((indice, i) => {
    sumaApertura += distancia3D(puntos[indice], muneca);
    const d = distancia3D(puntos[indice], pulgar);
    if (d < toque) {
      toque = d;
      dedoMasCercano = DEDOS[i];
    }
  });

  let sumaSeparacion = 0;
  for (let i = 0; i < PUNTAS_DEDOS.length - 1; i++) {
    sumaSeparacion += distancia3D(puntos[PUNTAS_DEDOS[i]], puntos[PUNTAS_DEDOS[i + 1]]);
  }

  return {
    apertura: sumaApertura / PUNTAS_DEDOS.length / palma,
    toque: toque / palma,
    dedoMasCercano,
    separacion: sumaSeparacion / (PUNTAS_DEDOS.length - 1) / palma,
  };
}
