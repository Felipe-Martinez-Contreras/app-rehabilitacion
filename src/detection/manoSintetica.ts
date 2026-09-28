/**
 * Generador de manos sintéticas para las pruebas (no se usa en la app).
 * Construye los 21 landmarks en píxeles y los devuelve normalizados, como
 * los entregaría MediaPipe para una imagen de `ancho` × `alto`.
 */
import type { Dedo, Punto3D } from './types';

export interface OpcionesMano {
  /** 0 = puño cerrado, 1 = mano totalmente abierta. */
  apertura?: number;
  /** Ángulo (grados) entre dedos vecinos. */
  separacionGrados?: number;
  /** Si se indica, la punta del pulgar se coloca junto a la punta de ese dedo. */
  toqueDedo?: Dedo;
  /** Distancia (en palmas) entre el pulgar y el dedo tocado. */
  distanciaToque?: number;
  /** Tamaño de la palma en píxeles (simula la distancia a la cámara). */
  palmaPx?: number;
  /** Centro de la muñeca en píxeles. */
  muneca?: { x: number; y: number };
  ancho?: number;
  alto?: number;
}

const INDICE_BASE_DEDO: Record<Dedo, number> = { indice: 5, medio: 9, anular: 13, menique: 17 };

export function manoSintetica(opciones: OpcionesMano = {}): Punto3D[] {
  const {
    apertura = 1,
    separacionGrados = 8,
    toqueDedo,
    distanciaToque = 0.1,
    palmaPx = 100,
    muneca = { x: 320, y: 400 },
    ancho = 640,
    alto = 480,
  } = opciones;
  const s = palmaPx / 100; // escala: la palma mide 100 unidades
  const p = (x: number, y: number, z = 0): Punto3D => ({ x: muneca.x + x * s, y: muneca.y + y * s, z: z * s });

  const puntos: Punto3D[] = new Array(21);
  puntos[0] = p(0, 0);

  // Bases de índice, medio, anular y meñique; la del medio está a 100 de la muñeca.
  const bases = [
    { i: 5, x: -30, y: -95, angulo: -1.5 },
    { i: 9, x: 0, y: -100, angulo: -0.5 },
    { i: 13, x: 30, y: -95, angulo: 0.5 },
    { i: 17, x: 58, y: -85, angulo: 1.5 },
  ];
  const centroPalma = { x: 0, y: -45 };
  const largo = 80;
  for (const b of bases) {
    const rad = (b.angulo * separacionGrados * Math.PI) / 180;
    const abierta = { x: b.x + Math.sin(rad) * largo, y: b.y - Math.cos(rad) * largo };
    // Al cerrar, la punta se acerca al centro de la palma.
    const punta = {
      x: centroPalma.x + (abierta.x - centroPalma.x) * apertura,
      y: centroPalma.y + (abierta.y - centroPalma.y) * apertura,
    };
    puntos[b.i] = p(b.x, b.y);
    for (let k = 1; k <= 3; k++) {
      const t = k / 3;
      puntos[b.i + k] = p(b.x + (punta.x - b.x) * t, b.y + (punta.y - b.y) * t, -5 * t);
    }
  }

  // Pulgar: hacia el costado del índice.
  puntos[1] = p(-25, -20);
  puntos[2] = p(-45, -40);
  puntos[3] = p(-60, -60);
  puntos[4] = p(-70, -80);
  if (toqueDedo) {
    const punta = puntos[INDICE_BASE_DEDO[toqueDedo] + 3];
    puntos[4] = { x: punta.x + distanciaToque * palmaPx, y: punta.y, z: punta.z };
  }

  return puntos.map((q) => ({ x: q.x / ancho, y: q.y / alto, z: q.z / ancho }));
}
