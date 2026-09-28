import type { Landmarks, Punto3D } from './types';

/** Índices de MediaPipe Hand Landmarker usados en la app. */
export const MUNECA = 0;
export const PULGAR_PUNTA = 4;
export const INDICE_PUNTA = 8;
export const MEDIO_BASE = 9;
export const MEDIO_PUNTA = 12;
export const ANULAR_PUNTA = 16;
export const MENIQUE_PUNTA = 20;

/** Puntas de índice, medio, anular y meñique (en ese orden). */
export const PUNTAS_DEDOS = [INDICE_PUNTA, MEDIO_PUNTA, ANULAR_PUNTA, MENIQUE_PUNTA] as const;

export const TOTAL_LANDMARKS = 21;

/**
 * Pasa landmarks normalizados a píxeles. x e y vienen normalizados con escalas
 * distintas (ancho y alto); z usa aproximadamente la escala de x, por eso se
 * multiplica por el ancho.
 */
export function aPixeles(landmarks: Landmarks, ancho: number, alto: number): Punto3D[] {
  return landmarks.map((p) => ({ x: p.x * ancho, y: p.y * alto, z: p.z * ancho }));
}

export function distancia3D(a: Punto3D, b: Punto3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Tamaño de la palma: distancia de la muñeca (0) a la base del dedo medio (9). */
export function tamanoPalma(puntos: Landmarks): number {
  return distancia3D(puntos[MUNECA], puntos[MEDIO_BASE]);
}
