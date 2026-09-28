/** Punto 3D. Según el contexto está normalizado (0–1) o en píxeles. */
export interface Punto3D {
  x: number;
  y: number;
  z: number;
}

/** Los 21 puntos de una mano, en el orden de MediaPipe. */
export type Landmarks = readonly Punto3D[];

/** Dedos que el pulgar puede tocar, en el orden del piano. */
export type Dedo = 'indice' | 'medio' | 'anular' | 'menique';
