/**
 * Generador de manos sintéticas para las pruebas (no se usa en la app).
 * Construye los 21 landmarks en píxeles y los devuelve normalizados, como
 * los entregaría MediaPipe para una imagen de `ancho` × `alto`.
 */
import type { Dedo, Punto3D } from './types';

export interface OpcionesMano {
  /** 0 = puño cerrado, 1 = mano totalmente abierta. */
  apertura?: number;
  /** Cierre de dedos concretos (0 = recto, 1 = doblado del todo); reemplaza a `apertura` en ese dedo. */
  cierreDedos?: Partial<Record<Dedo, number>>;
  /** Ángulo (grados) entre dedos vecinos. */
  separacionGrados?: number;
  /** Si se indica, la punta del pulgar se coloca junto a la punta de ese dedo. */
  toqueDedo?: Dedo;
  /** Distancia (en palmas) entre el pulgar y el dedo tocado. */
  distanciaToque?: number;
  /**
   * Giro de toda la mano alrededor del eje vertical que pasa por la muñeca (grados):
   * 0 = palma a la cámara, 90 = de canto, 180 = dorso a la cámara.
   */
  giroGrados?: number;
  /** Refleja la mano en x: simula la otra mano (o la imagen sin espejo). */
  espejo?: boolean;
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
    cierreDedos = {},
    separacionGrados = 8,
    toqueDedo,
    distanciaToque = 0.1,
    giroGrados = 0,
    espejo = false,
    palmaPx = 100,
    muneca = { x: 320, y: 400 },
    ancho = 640,
    alto = 480,
  } = opciones;
  const s = palmaPx / 100; // escala: la palma mide 100 unidades
  const giro = (giroGrados * Math.PI) / 180;
  const p = (x: number, y: number, z = 0): Punto3D => {
    const xEspejo = espejo ? -x : x;
    const xGirado = xEspejo * Math.cos(giro) + z * Math.sin(giro);
    const zGirado = -xEspejo * Math.sin(giro) + z * Math.cos(giro);
    return { x: muneca.x + xGirado * s, y: muneca.y + y * s, z: zGirado * s };
  };

  const puntos: Punto3D[] = new Array(21);
  puntos[0] = p(0, 0);

  // Bases de índice, medio, anular y meñique; la del medio está a 100 de la muñeca.
  const bases: { dedo: Dedo; i: number; x: number; y: number; angulo: number }[] = [
    { dedo: 'indice', i: 5, x: -30, y: -95, angulo: -1.5 },
    { dedo: 'medio', i: 9, x: 0, y: -100, angulo: -0.5 },
    { dedo: 'anular', i: 13, x: 30, y: -95, angulo: 0.5 },
    { dedo: 'menique', i: 17, x: 58, y: -85, angulo: 1.5 },
  ];
  // Falanges (MCP→PIP, PIP→DIP, DIP→punta) y flexión máxima de cada articulación.
  const falanges = [40, 25, 20];
  const flexionMaxima = [70, 100, 60];
  for (const b of bases) {
    const rad = (b.angulo * separacionGrados * Math.PI) / 180;
    const cierre = cierreDedos[b.dedo] ?? 1 - apertura;
    // Palma hacia la cámara: al doblarse, el dedo avanza hacia la cámara (z negativo).
    let actual = { x: b.x, y: b.y, z: 0 };
    let doblez = 0;
    puntos[b.i] = p(actual.x, actual.y);
    falanges.forEach((largo, k) => {
      doblez += (cierre * flexionMaxima[k] * Math.PI) / 180;
      actual = {
        x: actual.x + Math.sin(rad) * Math.cos(doblez) * largo,
        y: actual.y - Math.cos(rad) * Math.cos(doblez) * largo,
        z: actual.z - Math.sin(doblez) * largo,
      };
      puntos[b.i + k + 1] = p(actual.x, actual.y, actual.z);
    });
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
