import { CONFIG } from './config';
import { ESTADO_INICIAL, type EstadoHisteresis } from './hysteresis';
import { suavizarMetricas, type Metricas } from './metrics';
import { clasificarOrientacion, orientacionValida } from './orientacion';
import { actualizarToque, manoAbiertaParaToque } from './toque';
import type { Calibracion, Orientacion } from './types';

/**
 * Procesamiento de cada fotograma: presencia de la mano, suavizado,
 * orientación y toque. Función pura: recibe el tiempo y las métricas crudas.
 */
export interface EstadoSeguimiento {
  /** Momento en que apareció la mano; null si no se ve. */
  presenteDesde: number | null;
  suavizadas: Metricas | null;
  toque: EstadoHisteresis;
}

export const SEGUIMIENTO_INICIAL: EstadoSeguimiento = { presenteDesde: null, suavizadas: null, toque: ESTADO_INICIAL };

export interface ContextoSeguimiento {
  calibracion: Calibracion | null;
  /** Signo de palma registrado a mano en el panel de depuración, mientras no hay calibración. */
  signoPalmaDepuracion: 1 | -1 | null;
}

export interface ResultadoFotograma {
  estado: EstadoSeguimiento;
  /** La mano se ve desde hace al menos `ignorarAlDetectarMs`. */
  lista: boolean;
  orientacion: Orientacion | null;
  /** Lista y con la palma de frente: se pueden contar toques y repeticiones. */
  puedeContar: boolean;
  abiertaParaToque: boolean;
  /** true solo en el fotograma en que se confirma un toque nuevo. */
  toqueNuevo: boolean;
}

export function procesarFotograma(
  estado: EstadoSeguimiento,
  t: number,
  metricas: Metricas | null,
  contexto: ContextoSeguimiento,
): ResultadoFotograma {
  // Mano perdida: se reinicia todo lo que estaba en curso.
  if (!metricas) {
    return {
      estado: SEGUIMIENTO_INICIAL,
      lista: false,
      orientacion: null,
      puedeContar: false,
      abiertaParaToque: false,
      toqueNuevo: false,
    };
  }

  const presenteDesde = estado.presenteDesde ?? t;
  const suavizadas = suavizarMetricas(estado.suavizadas, metricas, CONFIG.alfaSuavizado);
  const lista = t - presenteDesde >= CONFIG.ignorarAlDetectarMs;
  const signo = contexto.calibracion?.signoPalma ?? contexto.signoPalmaDepuracion;
  const orientacion = clasificarOrientacion(suavizadas.orientacionZ, signo);
  const puedeContar = lista && orientacionValida(orientacion);
  const abiertaParaToque = manoAbiertaParaToque(suavizadas, contexto.calibracion);

  if (!lista) {
    // Primeros milisegundos: se suaviza para estabilizar, pero no se cuenta nada.
    return {
      estado: { presenteDesde, suavizadas, toque: ESTADO_INICIAL },
      lista,
      orientacion,
      puedeContar,
      abiertaParaToque,
      toqueNuevo: false,
    };
  }

  const r = actualizarToque(estado.toque, suavizadas, t, puedeContar && abiertaParaToque);
  return {
    estado: { presenteDesde, suavizadas, toque: r.estado },
    lista,
    orientacion,
    puedeContar,
    abiertaParaToque,
    toqueNuevo: r.cambio && r.estado.activo,
  };
}
