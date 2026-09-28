/**
 * Umbrales de detección en un solo lugar, para ajustarlos con pruebas reales
 * (usa ?debug=1 para ver las métricas en vivo).
 *
 * Todas las distancias están divididas por el tamaño de la palma
 * (muñeca 0 → base del dedo medio 9), así no dependen de la distancia a la cámara.
 */
export const CONFIG = {
  /**
   * Suavizado (media móvil exponencial): peso del valor nuevo, entre 0 y 1.
   * Más alto = responde más rápido pero tiembla más.
   */
  alfaSuavizado: 0.4,

  /** Fotogramas seguidos que deben cumplir la condición antes de cambiar de estado. */
  fotogramasConfirmacion: 3,

  /**
   * Toque pulgar → punta de otro dedo (distancia 3D / palma).
   * Se considera "tocando" por debajo de `entrar` y "soltado" por encima de `salir`.
   * La franja entre ambos evita dobles conteos cuando la mano tiembla.
   */
  toque: {
    entrar: 0.3,
    salir: 0.45,
  },

  /**
   * Si la palma mide menos que esto (en píxeles), la mano está demasiado lejos
   * o la detección es poco fiable: no se calculan métricas.
   */
  palmaMinimaPx: 8,
} as const;
