import { describe, expect, it } from 'vitest';
import {
  ABANICO_INICIAL,
  actualizarAbanico,
  actualizarCalibracionAbanico,
  CALIBRACION_ABANICO_INICIAL,
  evaluarCalibracionAbanico,
  manoValidaAbanico,
  type EstadoCalibracionAbanico,
} from './abanico';
import { CONFIG } from './config';
import { aPixeles } from './geometry';
import { manoSintetica, type OpcionesMano } from './manoSintetica';
import { calcularMetricas, type Metricas } from './metrics';
import { procesarFotograma, SEGUIMIENTO_INICIAL, type ResultadoFotograma } from './seguimiento';
import type { Calibracion, RangoSeparacion } from './types';
import { umbralesAbanico } from './umbrales';

type Fotograma = OpcionesMano | null;

const medir = (o: OpcionesMano): Metricas => {
  const m = calcularMetricas(aPixeles(manoSintetica(o), 640, 480));
  if (!m) throw new Error('sin métricas');
  return m;
};

const CALIBRACION: Calibracion = {
  aperturaMin: medir({ apertura: 0.2 }).apertura,
  aperturaMax: medir({ apertura: 1 }).apertura,
  separacionMax: 0.42,
  signoPalma: 1,
  zPalma: 1,
  ampliado: false,
};

// Manos sintéticas: dedos juntos ≈ 0,30; abierta relajada ≈ 0,42; separados ≈ 0,54.
const JUNTOS: OpcionesMano = { separacionGrados: 0 };
const RELAJADA: OpcionesMano = { separacionGrados: 8 };
const SEPARADOS: OpcionesMano = { separacionGrados: 16 };

/** Pasa los fotogramas (30 fps) por el seguimiento y llama a `paso` con cada resultado. */
function recorrer(fotogramas: Fotograma[], paso: (t: number, r: ResultadoFotograma) => void) {
  let seguimiento = SEGUIMIENTO_INICIAL;
  fotogramas.forEach((f, i) => {
    const t = (i * 1000) / 30;
    const r = procesarFotograma(seguimiento, t, f ? medir(f) : null, { calibracion: CALIBRACION, signoPalmaDepuracion: null });
    seguimiento = r.estado;
    paso(t, r);
  });
}

const ms = (f: Fotograma, milisegundos: number) => Array<Fotograma>(Math.round((milisegundos * 30) / 1000)).fill(f);

function minicalibrar(fotogramas: Fotograma[]): EstadoCalibracionAbanico {
  let estado = CALIBRACION_ABANICO_INICIAL;
  recorrer(fotogramas, (t, r) => {
    const m = r.estado.suavizadas;
    estado = actualizarCalibracionAbanico(estado, t, m, manoValidaAbanico(m, r.puedeContar, CALIBRACION));
  });
  return estado;
}

const POSTURA_MS = CONFIG.abanico.calibracionEsperaAntesMs + CONFIG.abanico.calibracionSostenerMs + 200;

function repeticiones(fotogramas: Fotograma[], rango: RangoSeparacion) {
  let estado = ABANICO_INICIAL;
  let total = 0;
  recorrer(fotogramas, (t, r) => {
    const m = r.estado.suavizadas;
    const ra = actualizarAbanico(estado, t, m, manoValidaAbanico(m, r.puedeContar, CALIBRACION), rango);
    estado = ra.estado;
    if (ra.repeticion) total++;
  });
  return { total, estado };
}

const RANGO: RangoSeparacion = { juntos: medir(JUNTOS).separacion, separados: medir(SEPARADOS).separacion, ampliado: false };

describe('minicalibración del abanico', () => {
  it('mide la separación con los dedos juntos y separados', () => {
    const estado = minicalibrar([...ms(JUNTOS, POSTURA_MS), ...ms(SEPARADOS, POSTURA_MS)]);
    expect(estado.postura).toBe('terminada');
    const r = evaluarCalibracionAbanico(estado, 1);
    if (r.tipo !== 'lista') throw new Error('se esperaba una minicalibración lista');
    expect(r.rango.juntos).toBeCloseTo(RANGO.juntos, 2);
    expect(r.rango.separados).toBeCloseTo(RANGO.separados, 2);
    expect(r.rango.ampliado).toBe(false);
  });

  it('no mide con la mano cerrada, de canto o de dorso', () => {
    for (const f of [{ ...JUNTOS, apertura: 0.2 }, { ...JUNTOS, giroGrados: 80 }, { ...JUNTOS, giroGrados: 180 }]) {
      const estado = minicalibrar(ms(f, POSTURA_MS));
      expect(estado.postura).toBe('juntos');
      expect(estado.sostener.acumuladoMs).toBe(0);
    }
  });

  it('con un rango de separación pequeño invita a repetir y, al segundo intento, lo amplía', () => {
    const estado = minicalibrar([...ms(RELAJADA, POSTURA_MS), ...ms({ separacionGrados: 10 }, POSTURA_MS)]);
    expect(evaluarCalibracionAbanico(estado, 1).tipo).toBe('repetir');
    const r = evaluarCalibracionAbanico(estado, 2);
    if (r.tipo !== 'lista') throw new Error('se esperaba una minicalibración lista');
    expect(r.rango.ampliado).toBe(true);
    expect(r.rango.separados - r.rango.juntos).toBeCloseTo(CONFIG.abanico.rangoMinimo, 5);
    const medio = (medir(RELAJADA).separacion + medir({ separacionGrados: 10 }).separacion) / 2;
    expect((r.rango.juntos + r.rango.separados) / 2).toBeCloseTo(medio, 2);
  });
});

describe('el abanico', () => {
  const sostener = CONFIG.abanico.sostenerMs;

  it('la mano simplemente abierta (relajada) no cuenta: hay que separar los dedos', () => {
    expect(medir(RELAJADA).separacion).toBeLessThan(umbralesAbanico(RANGO).separados);
    expect(repeticiones([...ms(JUNTOS, 500), ...ms(RELAJADA, sostener + 1000)], RANGO).total).toBe(0);
  });

  it('juntar los dedos prepara la repetición; separar y sostener 3 s la cuenta', () => {
    const r = repeticiones([...ms(JUNTOS, 500), ...ms(SEPARADOS, sostener + 500)], RANGO);
    expect(r.total).toBe(1);
  });

  it('al empezar con los dedos separados, primero hay que juntarlos', () => {
    expect(repeticiones(ms(SEPARADOS, sostener + 1000), RANGO).total).toBe(0);
  });

  it('seguir separados después de completar no cuenta otra vez; juntar prepara la siguiente', () => {
    const una = [...ms(JUNTOS, 500), ...ms(SEPARADOS, sostener * 2 + 1000)];
    expect(repeticiones(una, RANGO).total).toBe(1);
    const tres: Fotograma[] = [];
    for (let i = 0; i < 3; i++) tres.push(...ms(JUNTOS, 500), ...ms(SEPARADOS, sostener + 500));
    expect(repeticiones(tres, RANGO).total).toBe(3);
  });

  it('si suelta antes, el tiempo se pausa sin penalización y se retoma', () => {
    const inicio = [...ms(JUNTOS, 500), ...ms(SEPARADOS, 2000)];
    const pausa = repeticiones([...inicio, ...ms(RELAJADA, 1000)], RANGO);
    expect(pausa.total).toBe(0);
    expect(pausa.estado.sostener.acumuladoMs).toBeGreaterThan(1500);
    // Retoma: con ~1,5 s más separados se completa (no vuelve a empezar desde cero).
    expect(repeticiones([...inicio, ...ms(RELAJADA, 1000), ...ms(SEPARADOS, 1500)], RANGO).total).toBe(1);
    // También si en la pausa junta los dedos.
    expect(repeticiones([...inicio, ...ms(JUNTOS, 1000), ...ms(SEPARADOS, 1500)], RANGO).total).toBe(1);
  });

  it('se pausa con la mano girada, cerrada o al tocar el meñique, y no cuenta mientras tanto', () => {
    const inicio = [...ms(JUNTOS, 500), ...ms(SEPARADOS, 1000)];
    for (const f of [{ ...SEPARADOS, giroGrados: 80 }, { ...SEPARADOS, apertura: 0.2 }]) {
      expect(repeticiones([...inicio, ...ms(f, sostener + 1000)], RANGO).total).toBe(0);
    }
  });

  it('no cuenta dobles al temblar cerca del umbral de "separados"', () => {
    const temblor: Fotograma[] = [];
    for (let i = 0; i < 60; i++) temblor.push({ separacionGrados: 12 }, { separacionGrados: 13 });
    const { separados } = umbralesAbanico(RANGO);
    expect(medir({ separacionGrados: 12 }).separacion).toBeLessThan(separados + 0.03);
    const r = repeticiones([...ms(JUNTOS, 500), ...ms(SEPARADOS, sostener + 500), ...temblor], RANGO);
    expect(r.total).toBe(1);
  });
});
