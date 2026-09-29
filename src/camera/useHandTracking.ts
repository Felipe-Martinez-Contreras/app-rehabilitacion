import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { CONFIG } from '../detection/config';
import { aPixeles } from '../detection/geometry';
import { calcularMetricas, type Metricas } from '../detection/metrics';
import { orientacionValida } from '../detection/orientacion';
import {
  procesarFotograma,
  SEGUIMIENTO_INICIAL,
  type ContextoSeguimiento,
  type EstadoSeguimiento,
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
}

export type EstadoModelo = 'cargando' | 'listo' | 'error';

/** Aviso para la persona; cambia solo en eventos, no por fotograma. */
export type AvisoMano = 'sin-mano' | 'girada' | 'lista';

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
  };
}

/** Tiempo que un cambio de aviso debe mantenerse antes de mostrarlo (evita parpadeos). */
const MS_CAMBIO_AVISO = 400;

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
  const [aviso, setAviso] = useState<AvisoMano>('sin-mano');
  const [intento, setIntento] = useState(0);
  const depuracion = useRef<DatosDepuracion>(crearDatosDepuracion());
  // La calibración llega en el Hito 2; por ahora el signo de palma se puede registrar desde el panel.
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
    let avisoMostrado: AvisoMano = 'sin-mano';
    let desdeCambio = performance.now();
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

      // Solo se actualiza el estado de React cuando el aviso cambia de forma estable.
      // Excepción: al aparecer la mano, "No alcanzo a ver tu mano" se quita de inmediato
      // (el conteo igual espera los primeros ms en procesarFotograma).
      const avisoActual: AvisoMano = !suavizadas
        ? 'sin-mano'
        : r.orientacion && !orientacionValida(r.orientacion)
          ? 'girada'
          : 'lista';
      const manoRecienDetectada = avisoMostrado === 'sin-mano' && avisoActual !== 'sin-mano';
      if (avisoActual === avisoMostrado) {
        desdeCambio = ahora;
      } else if (manoRecienDetectada || ahora - desdeCambio >= MS_CAMBIO_AVISO) {
        avisoMostrado = avisoActual;
        desdeCambio = ahora;
        setAviso(avisoActual);
      }

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
      setAviso('sin-mano');
    };
  }, [activo, detector, videoRef, canvasRef]);

  return { estadoModelo, aviso, reintentarModelo, depuracion, contexto };
}
