import { CONFIG } from './config';
import type { Metricas } from './metrics';
import { signoDePalma } from './orientacion';
import { actualizarSostener, SOSTENER_INICIAL, type EstadoSostener } from './sostener';
import type { Calibracion } from './types';

/**
 * Calibración del rango cómodo: la persona sostiene la mano abierta y luego
 * cerrada, cada postura durante `sostenerMs`. Se toma la mediana de cada
 * postura (resiste mejor que el máximo a un fotograma deformado) y el signo de
 * la palma se registra con la mano abierta, sin usar la etiqueta izquierda/derecha.
 */
export type PosturaCalibracion = 'abierta' | 'cerrada' | 'terminada';

interface Muestra {
  apertura: number;
  separacion: number;
  orientacionZ: number;
}

export interface EstadoCalibracion {
  postura: PosturaCalibracion;
  /** Momento en que empezó la postura actual; null hasta el primer fotograma. */
  inicioPostura: number | null;
  sostener: EstadoSostener;
  abierta: Muestra[];
  cerrada: Muestra[];
  /** Signo de la palma registrado al terminar la postura abierta. */
  signoPalma: 1 | -1 | null;
}

export const CALIBRACION_INICIAL: EstadoCalibracion = {
  postura: 'abierta',
  inicioPostura: null,
  sostener: SOSTENER_INICIAL,
  abierta: [],
  cerrada: [],
  signoPalma: null,
};

export function mediana(valores: number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
}

export type RangoPersonal =
  | { tipo: 'repetir'; rango: number }
  | { tipo: 'lista'; min: number; max: number; ampliado: boolean };

/**
 * Siempre el rango de la persona: si es menor que `rangoMinimo`, en el primer
 * intento se invita a repetir y desde el segundo se amplía hasta el mínimo
 * alrededor de su punto medio. Se usa en la calibración inicial y en la del abanico.
 */
export function rangoPersonal(min: number, max: number, rangoMinimo: number, intento: number): RangoPersonal {
  const rango = max - min;
  if (rango >= rangoMinimo) return { tipo: 'lista', min, max, ampliado: false };
  if (intento < 2) return { tipo: 'repetir', rango };
  const medio = (max + min) / 2;
  return { tipo: 'lista', min: medio - rangoMinimo / 2, max: medio + rangoMinimo / 2, ampliado: true };
}

/** La postura se puede medir: mano lista y palma de frente (en la cerrada, con el signo ya registrado). */
function posturaValida(estado: EstadoCalibracion, m: Metricas | null, lista: boolean): m is Metricas {
  if (!m || !lista) return false;
  const signo = signoDePalma(m.orientacionZ);
  if (signo === null) return false;
  return estado.postura !== 'cerrada' || signo === estado.signoPalma;
}

/** Esperando que la persona llegue a la postura: todavía no se mide. */
export function esperandoPostura(estado: EstadoCalibracion, t: number): boolean {
  return estado.inicioPostura === null || t - estado.inicioPostura < CONFIG.calibracion.esperaAntesMs;
}

export function actualizarCalibracion(
  estado: EstadoCalibracion,
  t: number,
  m: Metricas | null,
  lista: boolean,
): EstadoCalibracion {
  if (estado.postura === 'terminada') return estado;
  if (estado.inicioPostura === null) estado = { ...estado, inicioPostura: t };
  if (esperandoPostura(estado, t)) return estado;

  const valida = posturaValida(estado, m, lista);
  const sostener = actualizarSostener(estado.sostener, t, valida, CONFIG.calibracion.sostenerMs);
  const muestras = estado.postura === 'abierta' ? estado.abierta : estado.cerrada;
  const nuevas = valida
    ? [...muestras, { apertura: m.apertura, separacion: m.separacion, orientacionZ: m.orientacionZ }]
    : muestras;
  const siguiente: EstadoCalibracion =
    estado.postura === 'abierta' ? { ...estado, sostener, abierta: nuevas } : { ...estado, sostener, cerrada: nuevas };

  if (!sostener.completo) return siguiente;
  if (siguiente.postura === 'abierta') {
    return {
      ...siguiente,
      postura: 'cerrada',
      inicioPostura: t,
      sostener: SOSTENER_INICIAL,
      signoPalma: mediana(siguiente.abierta.map((x) => x.orientacionZ)) > 0 ? 1 : -1,
    };
  }
  return { ...siguiente, postura: 'terminada' };
}

export type ResultadoCalibracion =
  /** Rango bajo el mínimo en el primer intento: se invita a repetir. */
  | { tipo: 'repetir'; rango: number }
  | {
      tipo: 'lista';
      calibracion: Calibracion;
      /** La palma no llegó a |z| ≥ `zPalmaComoda`: se avisa con calma, sin forzar el giro. */
      zBaja: boolean;
    };

/**
 * Resultado de una calibración terminada. Siempre usa el rango de la persona:
 * si es menor que el mínimo, en el primer intento se invita a repetir y desde
 * el segundo se amplía hasta el mínimo alrededor de su punto medio.
 */
export function evaluarCalibracion(estado: EstadoCalibracion, intento: number): ResultadoCalibracion {
  if (estado.postura !== 'terminada' || estado.signoPalma === null) {
    throw new Error('La calibración no ha terminado');
  }
  const { rangoMinimo, zPalmaComoda } = CONFIG.calibracion;
  const rango = rangoPersonal(
    mediana(estado.cerrada.map((x) => x.apertura)),
    mediana(estado.abierta.map((x) => x.apertura)),
    rangoMinimo,
    intento,
  );
  if (rango.tipo === 'repetir') return rango;
  const zPalma = mediana(estado.abierta.map((x) => Math.abs(x.orientacionZ)));
  return {
    tipo: 'lista',
    calibracion: {
      aperturaMin: rango.min,
      aperturaMax: rango.max,
      separacionMax: mediana(estado.abierta.map((x) => x.separacion)),
      signoPalma: estado.signoPalma,
      zPalma,
      ampliado: rango.ampliado,
    },
    zBaja: zPalma < zPalmaComoda,
  };
}
