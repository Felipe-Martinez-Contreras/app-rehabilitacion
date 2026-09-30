import { describe, expect, it } from 'vitest';
import {
  actualizarCalibracion,
  CALIBRACION_INICIAL,
  evaluarCalibracion,
  type EstadoCalibracion,
} from './calibracion';
import { CONFIG } from './config';
import { aPixeles } from './geometry';
import { manoSintetica, type OpcionesMano } from './manoSintetica';
import { calcularMetricas, type Metricas } from './metrics';
import { procesarFotograma, SEGUIMIENTO_INICIAL } from './seguimiento';

type Fotograma = OpcionesMano | null;

const medir = (o: OpcionesMano): Metricas => {
  const m = calcularMetricas(aPixeles(manoSintetica(o), 640, 480));
  if (!m) throw new Error('sin métricas');
  return m;
};

/** Pasa los fotogramas (30 fps) por el seguimiento y la calibración, como en la app. */
function calibrar(fotogramas: Fotograma[]): EstadoCalibracion {
  let seguimiento = SEGUIMIENTO_INICIAL;
  let estado = CALIBRACION_INICIAL;
  fotogramas.forEach((f, i) => {
    const t = (i * 1000) / 30;
    const r = procesarFotograma(seguimiento, t, f ? medir(f) : null, { calibracion: null, signoPalmaDepuracion: null });
    seguimiento = r.estado;
    estado = actualizarCalibracion(estado, t, r.estado.suavizadas, r.lista);
  });
  return estado;
}

const ms = (f: Fotograma, milisegundos: number) => Array<Fotograma>(Math.round((milisegundos * 30) / 1000)).fill(f);

/** Tiempo de una postura completa: espera + sostener, con un margen. */
const POSTURA_MS = CONFIG.calibracion.esperaAntesMs + CONFIG.calibracion.sostenerMs + 200;

/** Calibración típica: mano abierta y luego cerrada, cada una el tiempo necesario. */
const posturas = (abierta: OpcionesMano, cerrada: OpcionesMano) => [...ms(abierta, POSTURA_MS), ...ms(cerrada, POSTURA_MS)];

describe('calibración del rango cómodo', () => {
  it('mide la apertura abierta y cerrada, la separación, el signo y el |z| de la palma', () => {
    const estado = calibrar(posturas({ apertura: 1 }, { apertura: 0.2 }));
    expect(estado.postura).toBe('terminada');
    const r = evaluarCalibracion(estado, 1);
    if (r.tipo !== 'lista') throw new Error('se esperaba una calibración lista');
    expect(r.calibracion.aperturaMax).toBeCloseTo(medir({ apertura: 1 }).apertura, 2);
    expect(r.calibracion.aperturaMin).toBeCloseTo(medir({ apertura: 0.2 }).apertura, 1);
    expect(r.calibracion.separacionMax).toBeCloseTo(medir({ apertura: 1 }).separacion, 2);
    expect(r.calibracion.signoPalma).toBe(1);
    expect(r.calibracion.zPalma).toBeGreaterThan(0.95);
    expect(r.calibracion.ampliado).toBe(false);
    expect(r.zBaja).toBe(false);
  });

  it('registra el signo contrario con la otra mano, sin usar la etiqueta izquierda/derecha', () => {
    const r = evaluarCalibracion(calibrar(posturas({ espejo: true }, { espejo: true, apertura: 0.2 })), 1);
    if (r.tipo !== 'lista') throw new Error('se esperaba una calibración lista');
    expect(r.calibracion.signoPalma).toBe(-1);
  });

  it('no avanza con la mano de canto ni con el dorso en la postura cerrada', () => {
    const deCanto = calibrar(ms({ giroGrados: 80 }, POSTURA_MS * 2));
    expect(deCanto.postura).toBe('abierta');
    expect(deCanto.sostener.acumuladoMs).toBe(0);

    const dorsoAlCerrar = calibrar([...ms({}, POSTURA_MS), ...ms({ giroGrados: 180, apertura: 0.2 }, POSTURA_MS)]);
    expect(dorsoAlCerrar.postura).toBe('cerrada');
    expect(dorsoAlCerrar.sostener.acumuladoMs).toBe(0);
  });

  it('se pausa si la mano se pierde y se retoma sin perder lo sostenido', () => {
    const espera = CONFIG.calibracion.esperaAntesMs;
    const estado = calibrar([...ms({}, espera + 2000), ...ms(null, 1000), ...ms({}, 800)]);
    expect(estado.postura).toBe('abierta');
    // 2 s antes de perderla + lo sostenido al volver (menos los 300 ms que se ignoran).
    expect(estado.sostener.acumuladoMs).toBeGreaterThan(2300);
    const completa = calibrar([...ms({}, espera + 2000), ...ms(null, 1000), ...ms({}, 1500)]);
    expect(completa.postura).toBe('cerrada');
  });

  it('no mide durante la espera inicial de cada postura', () => {
    const estado = calibrar(ms({}, CONFIG.calibracion.esperaAntesMs - 100));
    expect(estado.abierta).toHaveLength(0);
  });

  it('avisa si el |z| de la palma queda bajo 0,65, sin impedir la calibración', () => {
    const girada = { giroGrados: 52 }; // |z| ≈ 0,62: de frente, pero con poco giro
    const r = evaluarCalibracion(calibrar(posturas(girada, { ...girada, apertura: 0.2 })), 1);
    if (r.tipo !== 'lista') throw new Error('se esperaba una calibración lista');
    expect(r.calibracion.zPalma).toBeLessThan(0.65);
    expect(r.zBaja).toBe(true);
  });
});

describe('calibración con rango pequeño', () => {
  // Apertura ≈ 1,50 abierta y ≈ 1,59 "más abierta": rango ≈ 0,09, bajo el mínimo de 0,15.
  const pequeno = () => calibrar(posturas({ apertura: 0.62 }, { apertura: 0.55 }));

  it('en el primer intento invita a repetir', () => {
    const r = evaluarCalibracion(pequeno(), 1);
    expect(r.tipo).toBe('repetir');
    if (r.tipo === 'repetir') expect(r.rango).toBeLessThan(CONFIG.calibracion.rangoMinimo);
  });

  it('en el segundo intento amplía su propio rango a 0,15 alrededor del punto medio', () => {
    const estado = pequeno();
    const r = evaluarCalibracion(estado, 2);
    if (r.tipo !== 'lista') throw new Error('se esperaba una calibración lista');
    const medioMedido = (medir({ apertura: 0.62 }).apertura + medir({ apertura: 0.55 }).apertura) / 2;
    const { aperturaMin, aperturaMax, ampliado } = r.calibracion;
    expect(ampliado).toBe(true);
    expect(aperturaMax - aperturaMin).toBeCloseTo(CONFIG.calibracion.rangoMinimo, 5);
    expect((aperturaMax + aperturaMin) / 2).toBeCloseTo(medioMedido, 1);
  });

  it('un rango de 0,20 (1,10–1,30, con rigidez) se usa tal cual, sin valores por defecto', () => {
    const cerrada = medir({ apertura: 0.28 }).apertura;
    const abierta = medir({ apertura: 0.42 }).apertura;
    expect(abierta - cerrada).toBeGreaterThan(0.15);
    const r = evaluarCalibracion(calibrar(posturas({ apertura: 0.42 }, { apertura: 0.28 })), 1);
    if (r.tipo !== 'lista') throw new Error('se esperaba una calibración lista');
    expect(r.calibracion.ampliado).toBe(false);
    expect(r.calibracion.aperturaMax).toBeCloseTo(abierta, 2);
    expect(r.calibracion.aperturaMin).toBeCloseTo(cerrada, 1);
  });
});
