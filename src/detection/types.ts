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

/** Rango cómodo medido en la calibración (solo números; se guarda en mqs:calibracion). */
export interface Calibracion {
  aperturaMin: number;
  aperturaMax: number;
  separacionMax: number;
  /** Signo de la normal de la palma (componente z) cuando la persona muestra la palma. */
  signoPalma: 1 | -1;
  /** |z| de la normal de la palma que alcanzó la persona con la mano abierta. */
  zPalma: number;
  /** El rango medido era menor que el mínimo y se amplió alrededor de su punto medio. */
  ampliado: boolean;
}

/**
 * Orientación de la mano respecto de la cámara. Sin calibración no se puede
 * distinguir palma de dorso, así que se informa 'de-frente'.
 */
export type Orientacion = 'palma' | 'dorso' | 'de-frente' | 'de-canto';
