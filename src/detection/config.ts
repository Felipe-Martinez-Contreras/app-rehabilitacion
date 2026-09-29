/**
 * Umbrales de detección en un solo lugar, para ajustarlos con pruebas reales
 * (usa ?debug=1 para ver las métricas en vivo).
 *
 * Todas las distancias están divididas por el tamaño de la palma
 * (muñeca 0 → base del dedo medio 9), así no dependen de la distancia a la cámara.
 *
 * Mediciones reales (palma hacia la cámara), Hito 1:
 * - Apertura: mano abierta ~1,82; puño cerrado 0,51–0,74. Durante un toque, mínimo 1,56–1,67.
 * - Flexión (ángulos): abierta ~6°, puño ~130° pero con saltos momentáneos a 21–29°:
 *   no sirve como filtro, queda solo como dato informativo en el panel.
 * - Toque: mínimo 0,14–0,15; el anular oscilaba entre 0,20 y 0,30.
 * - Separación: dedos juntos 0,25–0,26; separados 0,55–0,57; al tocar el meñique sube a 0,62.
 * - Orientación z: palma ±0,96–1,00, dorso con el signo contrario, de canto −0,39 a 0,13.
 *   Con la palma de frente, los toques midieron apertura 1,54–1,61 (margen 0,14 sobre 1,40).
 * - fps entre 29 y 60: por eso los cambios de estado se confirman por tiempo, no por fotogramas.
 */
export const CONFIG = {
  /**
   * Suavizado (media móvil exponencial): peso del valor nuevo, entre 0 y 1.
   * Más alto = responde más rápido pero tiembla más.
   */
  alfaSuavizado: 0.4,

  /** Tiempo que una condición debe mantenerse sin interrupción antes de confirmar un cambio de estado. */
  confirmacionMs: 150,

  /**
   * Al aparecer la mano se ignoran estos milisegundos: al entrar al cuadro los
   * puntos llegan incompletos o deformados. Al perderla, se reinicia el estado.
   */
  ignorarAlDetectarMs: 300,

  /**
   * Toque pulgar → punta de otro dedo (distancia 3D / palma).
   * Se considera "tocando" por debajo de `entrar` y "soltado" por encima de `salir`.
   * La franja entre ambos evita dobles conteos cuando la mano tiembla.
   */
  toque: {
    entrar: 0.33,
    salir: 0.45,
    /**
     * Filtro de puño cerrado: un toque solo puede empezar si la apertura supera
     * cerrado + fraccion × (abierto − cerrado) del rango calibrado.
     */
    fraccionAperturaMinima: 0.6,
    /** Apertura mínima mientras no exista calibración. */
    aperturaMinimaSinCalibrar: 1.4,
  },

  /**
   * Orientación: normal de la palma con muñeca (0), base del índice (5) y base
   * del meñique (17). Se usa su componente z normalizada (−1 a 1).
   * Si |z| es menor que `minimoDeFrente`, la mano está de canto.
   * El signo que corresponde a "palma de frente" depende de la mano (y del espejo),
   * por eso se registra en la calibración y nunca se usa la etiqueta izquierda/derecha.
   */
  orientacion: {
    minimoDeFrente: 0.5,
  },

  /**
   * Abanico (Hito 2). Umbrales como porcentaje del rango entre dedos juntos y la
   * separación máxima calibrada. La calibración no mide los dedos juntos, así que
   * se usa `separacionJuntosPorDefecto` como base. Solo se evalúa dentro del
   * ejercicio del abanico, con la apertura sobre el umbral y la palma de frente.
   */
  abanico: {
    fraccionSeparados: 0.7,
    fraccionJuntos: 0.35,
    separacionJuntosPorDefecto: 0.26,
  },

  /**
   * Si la palma mide menos que esto (en píxeles), la mano está demasiado lejos
   * o la detección es poco fiable: no se calculan métricas.
   */
  palmaMinimaPx: 8,

  /**
   * Confianzas del detector de MediaPipe (0–1; por defecto 0,5 las tres).
   * - detección: para encontrar una mano nueva en la imagen.
   * - presencia: para dar por buena la mano en cada fotograma; más alto = descarta
   *   fotogramas dudosos (menos temblor, pero la mano "se pierde" más seguido).
   * - seguimiento: por debajo, vuelve a buscar la mano desde cero en vez de seguirla.
   * Con ?debug=1 se pueden probar otros valores: &det=0.6&pres=0.6&seg=0.6
   */
  detector: {
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },

  /** Ventana del mínimo y máximo que muestra el panel de depuración. */
  ventanaDepuracionMs: 5000,
} as const;
