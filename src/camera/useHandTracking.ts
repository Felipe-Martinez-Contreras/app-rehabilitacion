import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { CONFIG } from '../detection/config';
import { aPixeles } from '../detection/geometry';
import { actualizarHisteresis, ESTADO_INICIAL, type ConfigHisteresis, type EstadoHisteresis } from '../detection/hysteresis';
import { calcularMetricas, type Metricas } from '../detection/metrics';
import { suavizarCampos } from '../detection/smoothing';
import { dibujarMano, type ColoresTrazo } from './dibujarMano';
import { CONEXIONES_MANO, obtenerDetectorMano } from './handLandmarker';

/** Datos en vivo para el panel de depuración. Se escriben por fotograma sin re-renderizar React. */
export interface DatosDepuracion {
  fps: number;
  manoDetectada: boolean;
  metricas: Metricas | null;
  tocando: boolean;
}

export type EstadoModelo = 'cargando' | 'listo' | 'error';

const CAMPOS_SUAVIZADOS = ['apertura', 'toque', 'separacion'] as const;

const HISTERESIS_TOQUE: ConfigHisteresis = {
  direccion: 'bajo',
  entrar: CONFIG.toque.entrar,
  salir: CONFIG.toque.salir,
  fotogramas: CONFIG.fotogramasConfirmacion,
};

/** Tiempo que un cambio de visibilidad debe mantenerse antes de avisarlo (evita parpadeos). */
const MS_CAMBIO_VISIBILIDAD = 400;

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
  const [manoVisible, setManoVisible] = useState(false);
  const [intento, setIntento] = useState(0);
  const depuracion = useRef<DatosDepuracion>({ fps: 0, manoDetectada: false, metricas: null, tocando: false });

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
    let raf = 0;
    let ocupado = false;
    let ultimoTiempoVideo = -1;
    let suavizadas: Metricas | null = null;
    let toque: EstadoHisteresis = ESTADO_INICIAL;
    let visibleAvisado = false;
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

      const metricas = puntos ? calcularMetricas(puntos) : null;
      if (metricas) {
        suavizadas = suavizarCampos(suavizadas, metricas, CAMPOS_SUAVIZADOS, CONFIG.alfaSuavizado);
        toque = actualizarHisteresis(toque, suavizadas.toque, HISTERESIS_TOQUE).estado;
      } else {
        suavizadas = null;
        toque = ESTADO_INICIAL;
      }

      // Solo se actualiza el estado de React cuando la visibilidad cambia de forma estable.
      const visible = metricas !== null;
      if (visible === visibleAvisado) {
        desdeCambio = ahora;
      } else if (ahora - desdeCambio >= MS_CAMBIO_VISIBILIDAD) {
        visibleAvisado = visible;
        desdeCambio = ahora;
        setManoVisible(visible);
      }

      cuadros++;
      if (ahora - inicioFps >= 1000) {
        depuracion.current.fps = (cuadros * 1000) / (ahora - inicioFps);
        cuadros = 0;
        inicioFps = ahora;
      }
      depuracion.current.manoDetectada = visible;
      depuracion.current.metricas = suavizadas;
      depuracion.current.tocando = toque.activo;
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
      depuracion.current.manoDetectada = false;
      depuracion.current.metricas = null;
      setManoVisible(false);
    };
  }, [activo, detector, videoRef, canvasRef]);

  return { estadoModelo, manoVisible, reintentarModelo, depuracion };
}
