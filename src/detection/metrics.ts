import { CONFIG } from './config';
import {
  anguloEn,
  ARTICULACIONES,
  distancia3D,
  MUNECA,
  normalPalmaZ,
  PULGAR_PUNTA,
  PUNTAS_DEDOS,
  tamanoPalma,
  TOTAL_LANDMARKS,
} from './geometry';
import { suavizar, suavizarCampos } from './smoothing';
import type { Dedo, Landmarks } from './types';

export const DEDOS: readonly Dedo[] = ['indice', 'medio', 'anular', 'menique'];

export interface Metricas {
  /** Promedio de la distancia de las puntas (8, 12, 16, 20) a la muñeca. */
  apertura: number;
  /** Distancia de la punta del pulgar (4) a la punta más cercana de los otros dedos. */
  toque: number;
  /** Dedo cuya punta está más cerca del pulgar. */
  dedoMasCercano: Dedo;
  /** Promedio de las distancias entre puntas vecinas (8–12, 12–16, 16–20). */
  separacion: number;
  /** Flexión de cada dedo en grados: 180° − ángulo MCP-PIP-DIP (0° = recto). */
  flexionDedos: Record<Dedo, number>;
  /** Promedio de la flexión de los cuatro dedos, en grados. Solo informativo (tiene saltos). */
  flexion: number;
  /** Componente z de la normal de la palma (−1 a 1); ver `normalPalmaZ`. */
  orientacionZ: number;
}

/**
 * Calcula las métricas a partir de landmarks en píxeles.
 * Las distancias se dividen por el tamaño de la palma; los ángulos no dependen
 * de la escala. Devuelve null si la mano no está completa o es demasiado
 * pequeña para medir con fiabilidad.
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

  const flexionDedos = {} as Record<Dedo, number>;
  let sumaFlexion = 0;
  for (const dedo of DEDOS) {
    const [mcp, pip, dip] = ARTICULACIONES[dedo];
    flexionDedos[dedo] = 180 - anguloEn(puntos[mcp], puntos[pip], puntos[dip]);
    sumaFlexion += flexionDedos[dedo];
  }

  return {
    apertura: sumaApertura / PUNTAS_DEDOS.length / palma,
    toque: toque / palma,
    dedoMasCercano,
    separacion: sumaSeparacion / (PUNTAS_DEDOS.length - 1) / palma,
    flexionDedos,
    flexion: sumaFlexion / DEDOS.length,
    orientacionZ: normalPalmaZ(puntos),
  };
}

const CAMPOS_SUAVIZADOS = ['apertura', 'toque', 'separacion', 'flexion', 'orientacionZ'] as const;

/** Suaviza todas las métricas numéricas, incluida la flexión de cada dedo. */
export function suavizarMetricas(anterior: Metricas | null, nuevo: Metricas, alfa: number): Metricas {
  if (anterior === null) return nuevo;
  const resultado = suavizarCampos(anterior, nuevo, CAMPOS_SUAVIZADOS, alfa);
  const flexionDedos = {} as Record<Dedo, number>;
  for (const dedo of DEDOS) {
    flexionDedos[dedo] = suavizar(anterior.flexionDedos[dedo], nuevo.flexionDedos[dedo], alfa);
  }
  return { ...resultado, flexionDedos };
}
