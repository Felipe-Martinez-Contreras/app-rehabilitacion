import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import {
  actualizarAviso,
  avisoInicial,
  manoEstable,
  temporizadoresEnPausa,
  type AvisoMano,
  type EstadoAviso,
  type ObservacionMano,
} from '../detection/aviso';
import { CONFIG } from '../detection/config';
import { aPixeles } from '../detection/geometry';
import { calcularMetricas, type Metricas } from '../detection/metrics';
import { orientacionValida } from '../detection/orientacion';
import {
  procesarFotograma,
  SEGUIMIENTO_INICIAL,
  type ContextoSeguimiento,
  type EstadoSeguimiento,
  type ResultadoFotograma,
} from '../detection/seguimiento';
import { aperturaMinimaParaToque } from '../detection/toque';
import type { Orientacion } from '../detection/types';
import { VentanaMinMax } from '../detection/ventana';
import { dibujarMano, type ColoresTrazo } from './dibujarMano';
import { CONEXIONES_MANO, obtenerDetectorMano } from './handLandmarker';

export const METRICAS_CON_VENTANA = ['apertura', 'flexion', 'separacion', 'toque', 'orientacionZ'] as const;
export type MetricaConVentana = (typeof METRICAS_CON_VENTANA)[number];

/** Datos en vivo para el panel de depuración. Se escriben por fotograma sin re-renderizar React. */
export interface DatosDepuracion {
  fps: number;
  manoDetectada: boolean;
  /** La mano se ve desde hace más de `ignorarAlDetectarMs`. */
  lista: boolean;
  metricas: Metricas | null;
  orientacion: Orientacion | null;
  tocando: boolean;
  abiertaParaToque: boolean;
  aperturaMinima: number;
  toquesContados: number;
  /** Mínimo y máximo de cada métrica suavizada en los últimos segundos. */
  ventanas: Record<MetricaConVentana, VentanaMinMax>;
  /** Líneas que escribe la pantalla actual (calibración, gesto o ejercicio). */
  pantalla: string[];
}

export type EstadoModelo = 'cargando' | 'listo' | 'error';

export type { AvisoMano };

/** Lo que recibe cada pantalla en cada fotograma (sin re-renderizar React). */
export interface Fotograma {
  t: number;
  resultado: ResultadoFotograma;
  /** "No alcanzo a ver tu mano" está visible: los temporizadores del ejercicio se pausan. */
  enPausa: boolean;
}

export type OyenteFotograma = (f: Fotograma) => void;

function crearDatosDepuracion(): DatosDepuracion {
  const ventana = () => new VentanaMinMax(CONFIG.ventanaDepuracionMs);
  return {
    fps: 0,
    manoDetectada: false,
    lista: false,
    metricas: null,
    orientacion: null,
    tocando: false,
    abiertaParaToque: false,
    aperturaMinima: aperturaMinimaParaToque(null),
    toquesContados: 0,
    ventanas: {
      apertura: ventana(),
      flexion: ventana(),
      separacion: ventana(),
      toque: ventana(),
      orientacionZ: ventana(),
    },
    pantalla: [],
  };
}

function leerColores(elemento: Element): ColoresTrazo {
  const estilos = getComputedStyle(elemento);
  return {
    linea: estilos.getPropertyValue('--trazo-linea').trim() || '#8B7FC7',
    contorno: estilos.getPropertyValue('--trazo-contorno').trim() || '#FFFFFF',
    punto: estilos.getPropertyValue('--trazo-punto').trim() || '#F2B89B',
  };
}

export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  activo: boolean,
) {
  const [detector, setDetector] = useState<HandLandmarker | null>(null);
  const [estadoModelo, setEstadoModelo] = useState<EstadoModelo>('cargando');
  const [aviso, setAviso] = useState<AvisoMano>('esperando');
  const [estable, setEstable] = useState(false);
  const oyentes = useRef(new Set<OyenteFotograma>());
  const [intento, setIntento] = useState(0);
  const depuracion = useRef<DatosDepuracion>(crearDatosDepuracion());
  // Mientras no hay calibración, el signo de palma se puede registrar desde el panel.
  const contexto = useRef<ContextoSeguimiento>({ calibracion: null, signoPalmaDepuracion: null });

  useEffect(() => {
    if (!activo) return;
    let cancelado = false;
    setEstadoModelo('cargando');
    obtenerDetectorMano().then(
      (d) => {
        if (cancelado) return;
        setDetector(d);
        setEstadoModelo('listo');
      },
      () => {
        if (!cancelado) setEstadoModelo('error');
      },
    );
    return () => {
      cancelado = true;
    };
  }, [activo, intento]);

  const reintentarModelo = useCallback(() => setIntento((n) => n + 1), []);

  /** Recibe cada fotograma procesado; devuelve la función para dejar de escuchar. */
  const suscribir = useCallback((oyente: OyenteFotograma) => {
    oyentes.current.add(oyente);
    return () => {
      oyentes.current.delete(oyente);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!activo || !detector || !video || !canvas || !ctx) return;

    const colores = leerColores(canvas);
    const datos = depuracion.current;
    let raf = 0;
    let ocupado = false;
    let ultimoTiempoVideo = -1;
    let seguimiento: EstadoSeguimiento = SEGUIMIENTO_INICIAL;
    let aviso: EstadoAviso = avisoInicial(performance.now());
    let estableMostrado = false;
    let cuadros = 0;
    let inicioFps = performance.now();

    const procesar = () => {
      const ahora = performance.now();
      const ancho = video.videoWidth;
      const alto = video.videoHeight;
      if (canvas.width !== ancho || canvas.height !== alto) {
        canvas.width = ancho;
        canvas.height = alto;
      }

      const resultado = detector.detectForVideo(video, ahora);
      const landmarks = resultado.landmarks[0];
      const puntos = landmarks ? aPixeles(landmarks, ancho, alto) : null;
      dibujarMano(ctx, puntos, CONEXIONES_MANO, colores);

      const r = procesarFotograma(seguimiento, ahora, puntos ? calcularMetricas(puntos) : null, contexto.current);
      seguimiento = r.estado;
      const suavizadas = seguimiento.suavizadas;
      if (r.toqueNuevo) datos.toquesContados++;
      if (suavizadas && r.lista) {
        for (const nombre of METRICAS_CON_VENTANA) datos.ventanas[nombre].agregar(ahora, suavizadas[nombre]);
      }

      // El estado de React cambia solo cuando el aviso cambia (ver detection/aviso.ts).
      const observado: ObservacionMano = !suavizadas
        ? 'sin-mano'
        : r.orientacion && !orientacionValida(r.orientacion)
          ? 'girada'
          : 'lista';
      const anterior = aviso;
      aviso = actualizarAviso(aviso, ahora, observado);
      if (aviso.mostrado !== anterior.mostrado) setAviso(aviso.mostrado);
      const esEstable = manoEstable(aviso, ahora);
      if (esEstable !== estableMostrado) {
        estableMostrado = esEstable;
        setEstable(esEstable);
      }

      const fotograma: Fotograma = { t: ahora, resultado: r, enPausa: temporizadoresEnPausa(aviso) };
      for (const oyente of oyentes.current) oyente(fotograma);

      cuadros++;
      if (ahora - inicioFps >= 1000) {
        datos.fps = (cuadros * 1000) / (ahora - inicioFps);
        cuadros = 0;
        inicioFps = ahora;
      }
      datos.manoDetectada = suavizadas !== null;
      datos.lista = r.lista;
      datos.metricas = suavizadas;
      datos.orientacion = r.orientacion;
      datos.tocando = seguimiento.toque.activo;
      datos.abiertaParaToque = r.abiertaParaToque;
      datos.aperturaMinima = aperturaMinimaParaToque(contexto.current.calibracion);
    };

    const paso = () => {
      raf = requestAnimationFrame(paso);
      // Una detección por fotograma nuevo, sin acumular llamadas.
      if (ocupado || video.readyState < 2 || video.currentTime === ultimoTiempoVideo) return;
      ultimoTiempoVideo = video.currentTime;
      ocupado = true;
      try {
        procesar();
      } finally {
        ocupado = false;
      }
    };
    raf = requestAnimationFrame(paso);

    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      datos.manoDetectada = false;
      datos.lista = false;
      datos.metricas = null;
      datos.orientacion = null;
      setAviso('esperando');
      setEstable(false);
    };
  }, [activo, detector, videoRef, canvasRef]);

  return { estadoModelo, aviso, estable, reintentarModelo, depuracion, contexto, suscribir };
}

export type SeguimientoMano = ReturnType<typeof useHandTracking>;

/** Escucha los fotogramas mientras la pantalla está montada. El oyente se lee de un ref: puede cambiar sin volver a suscribirse. */
export function useFotograma(seguimiento: SeguimientoMano, oyente: OyenteFotograma) {
  const actual = useRef(oyente);
  useLayoutEffect(() => {
    actual.current = oyente;
  });
  const { suscribir } = seguimiento;
  useEffect(() => suscribir((f) => actual.current(f)), [suscribir]);
}
