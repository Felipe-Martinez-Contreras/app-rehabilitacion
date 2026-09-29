import type { Landmarks, Punto3D } from './types';

/** Índices de MediaPipe Hand Landmarker usados en la app. */
export const MUNECA = 0;
export const PULGAR_PUNTA = 4;
export const INDICE_BASE = 5;
export const INDICE_PUNTA = 8;
export const MEDIO_BASE = 9;
export const MEDIO_PUNTA = 12;
export const ANULAR_PUNTA = 16;
export const MENIQUE_BASE = 17;
export const MENIQUE_PUNTA = 20;

/** Puntas de índice, medio, anular y meñique (en ese orden). */
export const PUNTAS_DEDOS = [INDICE_PUNTA, MEDIO_PUNTA, ANULAR_PUNTA, MENIQUE_PUNTA] as const;

/** Articulaciones de cada dedo: base (MCP), media (PIP) y distal (DIP). */
export const ARTICULACIONES = {
  indice: [5, 6, 7],
  medio: [9, 10, 11],
  anular: [13, 14, 15],
  menique: [17, 18, 19],
} as const;

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

/** Ángulo en grados formado en `b` por los segmentos b→a y b→c (180° = en línea recta). */
export function anguloEn(a: Punto3D, b: Punto3D, c: Punto3D): number {
  const u = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const largo = Math.hypot(u.x, u.y, u.z) * Math.hypot(v.x, v.y, v.z);
  if (largo === 0) return 180;
  const coseno = (u.x * v.x + u.y * v.y + u.z * v.z) / largo;
  return (Math.acos(Math.min(1, Math.max(-1, coseno))) * 180) / Math.PI;
}

/**
 * Componente z (−1 a 1) de la normal de la palma, calculada con la muñeca (0),
 * la base del índice (5) y la base del meñique (17), en píxeles.
 * ±1 = palma o dorso de frente a la cámara; cerca de 0 = mano de canto.
 * El signo que corresponde a la palma depende de la mano y del espejo.
 */
export function normalPalmaZ(puntos: Landmarks): number {
  const o = puntos[MUNECA];
  const a = puntos[INDICE_BASE];
  const b = puntos[MENIQUE_BASE];
  const u = { x: a.x - o.x, y: a.y - o.y, z: a.z - o.z };
  const v = { x: b.x - o.x, y: b.y - o.y, z: b.z - o.z };
  const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
  const largo = Math.hypot(n.x, n.y, n.z);
  return largo === 0 ? 0 : n.z / largo;
}

/** Tamaño de la palma: distancia de la muñeca (0) a la base del dedo medio (9). */
export function tamanoPalma(puntos: Landmarks): number {
  return distancia3D(puntos[MUNECA], puntos[MEDIO_BASE]);
}
