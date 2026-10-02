import { mediana, rangoPersonal } from './calibracion';
import { CONFIG } from './config';
import { actualizarHisteresis, interrumpir, type EstadoHisteresis } from './hysteresis';
import type { Metricas } from './metrics';
import { actualizarSostener, SOSTENER_INICIAL, type EstadoSostener } from './sostener';
import { manoAbiertaParaToque } from './toque';
import type { Calibracion, RangoSeparacion } from './types';
import { umbralesAbanico } from './umbrales';

/**
 * La separación solo se evalúa con la palma de frente y la apertura sobre el
 * filtro de toques (60 % del rango calibrado): con la mano cerrada o al tocar
 * un dedo con el pulgar, la separación no mide lo que buscamos.
 */
export function manoValidaAbanico(m: Metricas | null, puedeContar: boolean, calibracion: Calibracion): m is Metricas {
  return m !== null && puedeContar && manoAbiertaParaToque(m, calibracion);
}

/* ─── Minicalibración: 3 s con los dedos juntos y 3 s separados ─── */

export type PosturaAbanico = 'juntos' | 'separados' | 'terminada';

export interface EstadoCalibracionAbanico {
  postura: PosturaAbanico;
  /** Momento en que empezó la postura actual; null hasta el primer fotograma. */
  inicioPostura: number | null;
  sostener: EstadoSostener;
  juntos: number[];
  separados: number[];
}

export const CALIBRACION_ABANICO_INICIAL: EstadoCalibracionAbanico = {
  postura: 'juntos',
  inicioPostura: null,
  sostener: SOSTENER_INICIAL,
  juntos: [],
  separados: [],
};

/** Esperando que la persona llegue a la postura: todavía no se mide. */
export function esperandoPosturaAbanico(estado: EstadoCalibracionAbanico, t: number): boolean {
  return estado.inicioPostura === null || t - estado.inicioPostura < CONFIG.abanico.calibracionEsperaAntesMs;
}

export function actualizarCalibracionAbanico(
  estado: EstadoCalibracionAbanico,
  t: number,
  m: Metricas | null,
  valida: boolean,
): EstadoCalibracionAbanico {
  if (estado.postura === 'terminada') return estado;
  if (estado.inicioPostura === null) estado = { ...estado, inicioPostura: t };
  if (esperandoPosturaAbanico(estado, t)) return estado;

  const cumple = valida && m !== null;
  const sostener = actualizarSostener(estado.sostener, t, cumple, CONFIG.abanico.calibracionSostenerMs);
  const siguiente: EstadoCalibracionAbanico =
    estado.postura === 'juntos'
      ? { ...estado, sostener, juntos: cumple ? [...estado.juntos, m.separacion] : estado.juntos }
      : { ...estado, sostener, separados: cumple ? [...estado.separados, m.separacion] : estado.separados };

  if (!sostener.completo) return siguiente;
  if (siguiente.postura === 'juntos') {
    return { ...siguiente, postura: 'separados', inicioPostura: t, sostener: SOSTENER_INICIAL };
  }
  return { ...siguiente, postura: 'terminada' };
}

export type ResultadoCalibracionAbanico = { tipo: 'repetir'; rango: number } | { tipo: 'lista'; rango: RangoSeparacion };

/** Rango personal de separación, con la misma regla del rango mínimo que la apertura. */
export function evaluarCalibracionAbanico(estado: EstadoCalibracionAbanico, intento: number): ResultadoCalibracionAbanico {
  if (estado.postura !== 'terminada') throw new Error('La minicalibración no ha terminado');
  const r = rangoPersonal(mediana(estado.juntos), mediana(estado.separados), CONFIG.abanico.rangoMinimo, intento);
  if (r.tipo === 'repetir') return r;
  return { tipo: 'lista', rango: { juntos: r.min, separados: r.max, ampliado: r.ampliado } };
}

/* ─── Ejercicio: separar y sostener 3 s ─── */

/**
 * - `separados`: histéresis sobre la separación (activo = separados), confirmada por tiempo.
 * - `armado`: juntar los dedos prepara la siguiente repetición. Al empezar no está
 *   armado (la minicalibración termina con los dedos separados).
 * - `sostener`: avanza mientras está armado y separado; si suelta antes (o la mano
 *   se gira o se pierde), se pausa sin penalización y se retoma.
 */
export interface EstadoAbanico {
  separados: EstadoHisteresis;
  armado: boolean;
  sostener: EstadoSostener;
}

export const ABANICO_INICIAL: EstadoAbanico = {
  separados: { activo: true, desde: null },
  armado: false,
  sostener: SOSTENER_INICIAL,
};

export interface ResultadoAbanico {
  estado: EstadoAbanico;
  /** true solo en el fotograma en que se completa una repetición. */
  repeticion: boolean;
}

export function actualizarAbanico(
  estado: EstadoAbanico,
  t: number,
  m: Metricas | null,
  valida: boolean,
  rango: RangoSeparacion,
): ResultadoAbanico {
  const duracion = CONFIG.abanico.sostenerMs;
  if (!valida || m === null) {
    return {
      estado: { ...estado, separados: interrumpir(estado.separados), sostener: actualizarSostener(estado.sostener, t, false, duracion) },
      repeticion: false,
    };
  }

  const { juntos, separados } = umbralesAbanico(rango);
  const h = actualizarHisteresis(
    estado.separados,
    m.separacion,
    { direccion: 'alto', entrar: separados, salir: juntos, confirmacionMs: CONFIG.confirmacionMs },
    t,
  );
  const armado = estado.armado || !h.estado.activo;
  const sostener = actualizarSostener(estado.sostener, t, armado && h.estado.activo, duracion);
  if (!sostener.completo) return { estado: { separados: h.estado, armado, sostener }, repeticion: false };
  return { estado: { separados: h.estado, armado: false, sostener: SOSTENER_INICIAL }, repeticion: true };
}
