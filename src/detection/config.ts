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
 * - Orientación z: palma ±0,96–1,00, dorso con el signo contrario. De canto, en dos pruebas
 *   distintas: con la mano quieta, −0,39 a 0,13; al intentar tocar de canto, −0,24 a 0,31.
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
   * Calibración del rango cómodo: dos posturas (mano abierta y cerrada).
   * Los umbrales de los ejercicios salen siempre del rango de la persona, nunca
   * de valores fijos: los medidos arriba son de una sola mano.
   */
  calibracion: {
    /** Tiempo que se sostiene cada postura (con la mano visible y la palma de frente). */
    sostenerMs: 3000,
    /** Espera antes de empezar a medir cada postura, para dar tiempo a moverse hacia ella. */
    esperaAntesMs: 1500,
    /**
     * Rango mínimo de apertura (abierta − cerrada). Con la mano quieta la apertura
     * varía 0,01–0,02; bajo este valor se invita a repetir la calibración y, si en
     * el segundo intento sigue bajo, se amplía hasta este valor alrededor del punto medio.
     */
    rangoMinimo: 0.15,
    /**
     * |z| de la palma por debajo del cual se avisa con calma que puede acercar la
     * palma a la cámara (quienes salen de un yeso pueden tener limitado el giro).
     */
    zPalmaComoda: 0.65,
  },

  /** La flor: cerrada bajo el 30 % y abierta sobre el 70 % del rango calibrado. */
  flor: {
    fraccionCerrada: 0.3,
    fraccionAbierta: 0.7,
  },

  /**
   * Inicio con gesto en "¿Todo listo?": mano abierta (sobre el umbral de "abierta"
   * de la flor) sostenida `sostenerMs`, que empieza a contar `esperaMs` después de
   * que aparece la pantalla. Si la mano se cierra o se pierde, vuelve a cero.
   */
  gestoInicio: {
    esperaMs: 1000,
    sostenerMs: 2000,
  },

  /**
   * Avisos a la persona (tiempo que una situación debe mantenerse antes de mostrarla).
   * - sinManoMs: "No alcanzo a ver tu mano" y pausa de temporizadores.
   * - cambioMs: palma girada, o volver a "lista" desde "girada" (evita parpadeos).
   *   Al aparecer la mano, el aviso de mano perdida se quita de inmediato.
   * - estableMs: mano vista sin interrupción para decir "Te veo".
   */
  avisos: {
    sinManoMs: 1500,
    cambioMs: 400,
    estableMs: 1000,
  },

  /**
   * Temporizadores: si entre dos fotogramas pasa más que esto (pestaña en segundo
   * plano, equipo lento), solo se suma este máximo.
   */
  maximoPasoMs: 100,

  /**
   * El abanico: separar los dedos hasta el rango cómodo y sostener.
   * Al empezar tiene su propia minicalibración (dedos juntos y separados), porque la
   * separación máxima de la calibración inicial depende de cuánto se abre la mano
   * (0,397 abriéndola al mínimo, 0,513 abierta normal; relajada ya marca 0,34–0,44).
   * Solo se evalúa dentro del abanico, con la apertura sobre el filtro de toques y
   * la palma de frente: al tocar el meñique la separación sube hasta 0,62.
   */
  abanico: {
    /** "Separados" sobre el 70 % y "juntos" bajo el 35 % del rango de la minicalibración. */
    fraccionSeparados: 0.7,
    fraccionJuntos: 0.35,
    /** Tiempo que se sostiene cada repetición; si suelta antes, se pausa sin penalización. */
    sostenerMs: 3000,
    /** Minicalibración: cada postura se sostiene este tiempo, tras una espera para llegar a ella. */
    calibracionSostenerMs: 3000,
    calibracionEsperaAntesMs: 1500,
    /**
     * Rango mínimo de separación (separados − juntos), igual que con la apertura: bajo
     * este valor se invita a repetir y, al segundo intento, se amplía alrededor del
     * punto medio. Con los dedos quietos la separación varía 0,02–0,03 en 5 s, así que
     * 0,10 es de 3 a 5 veces el ruido. Medido: juntos 0,255 y separados 0,428 (rango 0,173).
     */
    rangoMinimo: 0.1,
  },

  /** Descanso entre ejercicios. */
  descansoMs: 20000,

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
