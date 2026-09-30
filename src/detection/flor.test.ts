import { describe, expect, it } from 'vitest';
import { actualizarFlor, FLOR_INICIAL } from './flor';
import { aPixeles } from './geometry';
import { manoSintetica, type OpcionesMano } from './manoSintetica';
import { calcularMetricas, type Metricas } from './metrics';
import { procesarFotograma, SEGUIMIENTO_INICIAL } from './seguimiento';
import type { Calibracion } from './types';
import { umbralesFlor } from './umbrales';

type Fotograma = OpcionesMano | null;

const medir = (o: OpcionesMano): Metricas => {
  const m = calcularMetricas(aPixeles(manoSintetica(o), 640, 480));
  if (!m) throw new Error('sin métricas');
  return m;
};

const calibracionEntre = (cerrada: number, abierta: number, ampliado = false): Calibracion => ({
  aperturaMin: medir({ apertura: cerrada }).apertura,
  aperturaMax: medir({ apertura: abierta }).apertura,
  separacionMax: 0.42,
  signoPalma: 1,
  zPalma: 1,
  ampliado,
});

const CALIBRACION = calibracionEntre(0.2, 1);

/** Reproduce los fotogramas (a `fps`) por el seguimiento y la flor; devuelve las repeticiones. */
function repeticiones(fotogramas: Fotograma[], calibracion = CALIBRACION, fps = 30): number {
  let seguimiento = SEGUIMIENTO_INICIAL;
  let flor = FLOR_INICIAL;
  let total = 0;
  fotogramas.forEach((f, i) => {
    const t = (i * 1000) / fps;
    const r = procesarFotograma(seguimiento, t, f ? medir(f) : null, { calibracion, signoPalmaDepuracion: null });
    seguimiento = r.estado;
    const rf = actualizarFlor(flor, t, r.estado.suavizadas, r.puedeContar, calibracion);
    flor = rf.estado;
    if (rf.repeticion) total++;
  });
  return total;
}

const ms = (f: Fotograma, milisegundos: number, fps = 30) =>
  Array<Fotograma>(Math.round((milisegundos * fps) / 1000)).fill(f);

const ABIERTA: OpcionesMano = { apertura: 1 };
const CERRADA: OpcionesMano = { apertura: 0.2 };

/** n ciclos cerrada → abierta, empezando con la mano abierta (tras el gesto de inicio). */
const ciclos = (n: number, abierta = ABIERTA, cerrada = CERRADA, fps = 30) => {
  const s: Fotograma[] = ms(abierta, 600, fps);
  for (let i = 0; i < n; i++) s.push(...ms(cerrada, 500, fps), ...ms(abierta, 500, fps));
  return s;
};

describe('la flor', () => {
  it('cuenta cada ciclo cerrada → abierta', () => {
    expect(repeticiones(ciclos(5))).toBe(5);
  });

  it('el estado inicial no cuenta: la mano abierta al empezar no es una repetición', () => {
    expect(repeticiones(ms(ABIERTA, 2000))).toBe(0);
    // La primera repetición exige pasar por "cerrada" y luego por "abierta".
    expect(repeticiones([...ms(ABIERTA, 1000), ...ms(CERRADA, 500)])).toBe(0);
    expect(repeticiones([...ms(ABIERTA, 1000), ...ms(CERRADA, 500), ...ms(ABIERTA, 500)])).toBe(1);
  });

  it('si empieza con la mano cerrada, la primera apertura sí cuenta', () => {
    expect(repeticiones([...ms(CERRADA, 800), ...ms(ABIERTA, 500)])).toBe(1);
  });

  it('cuenta igual a 29 y a 60 fps', () => {
    expect(repeticiones(ciclos(3, ABIERTA, CERRADA, 29), CALIBRACION, 29)).toBe(3);
    expect(repeticiones(ciclos(3, ABIERTA, CERRADA, 60), CALIBRACION, 60)).toBe(3);
  });

  it('no cuenta dobles al temblar cerca del umbral de "abierta"', () => {
    const { abierta } = umbralesFlor(CALIBRACION);
    // Posturas sintéticas justo por encima y por debajo del umbral de abierta.
    const justoArriba: OpcionesMano = { apertura: 0.75 };
    const justoAbajo: OpcionesMano = { apertura: 0.6 };
    expect(medir(justoArriba).apertura).toBeGreaterThan(abierta);
    expect(medir(justoAbajo).apertura).toBeLessThan(abierta);
    const temblor: Fotograma[] = [];
    for (let i = 0; i < 30; i++) temblor.push(justoArriba, justoAbajo);
    expect(repeticiones([...ms(CERRADA, 600), ...ms(ABIERTA, 500), ...temblor])).toBe(1);
  });

  it('no cuenta con la mano de canto ni con el dorso', () => {
    expect(repeticiones(ciclos(3, { giroGrados: 80 }, { giroGrados: 80, apertura: 0.2 }))).toBe(0);
    expect(repeticiones(ciclos(3, { giroGrados: 180 }, { giroGrados: 180, apertura: 0.2 }))).toBe(0);
  });

  it('al perder la mano se reinicia el ciclo en curso', () => {
    // Cerró, se perdió la mano y volvió abierta: no cuenta; debe cerrar de nuevo.
    expect(repeticiones([...ms(ABIERTA, 600), ...ms(CERRADA, 500), ...ms(null, 500), ...ms(ABIERTA, 800)])).toBe(0);
    expect(
      repeticiones([...ms(ABIERTA, 600), ...ms(CERRADA, 500), ...ms(null, 500), ...ms(ABIERTA, 800), ...ms(CERRADA, 500), ...ms(ABIERTA, 500)]),
    ).toBe(1);
  });
});

describe('la flor con rango pequeño', () => {
  it('una persona con rigidez que se mueve entre ~1,10 y ~1,30 cuenta con su propio rango', () => {
    const calibracion = calibracionEntre(0.28, 0.42);
    const abierta = { apertura: 0.42 };
    const cerrada = { apertura: 0.28 };
    expect(repeticiones(ciclos(5, abierta, cerrada), calibracion)).toBe(5);
  });

  it('con el rango ampliado a 0,15 cuenta movimientos pequeños sin contar el temblor', () => {
    // Rango medido ≈ 0,09 (1,50–1,59), ampliado a 0,15 alrededor de su punto medio.
    const medio = (medir({ apertura: 0.55 }).apertura + medir({ apertura: 0.62 }).apertura) / 2;
    const calibracion: Calibracion = { ...CALIBRACION, aperturaMin: medio - 0.075, aperturaMax: medio + 0.075, ampliado: true };
    const { cerrada, abierta } = umbralesFlor(calibracion);
    // Sus posturas cómodas (≈ 0,53 y 0,65 en la mano sintética) cruzan ambos umbrales.
    expect(medir({ apertura: 0.53 }).apertura).toBeLessThan(cerrada);
    expect(medir({ apertura: 0.65 }).apertura).toBeGreaterThan(abierta);
    expect(repeticiones(ciclos(4, { apertura: 0.65 }, { apertura: 0.53 }), calibracion)).toBe(4);
    // Quieta en el punto medio (con el ruido de 0,01–0,02) no cuenta nada.
    const quieta: Fotograma[] = [];
    for (let i = 0; i < 60; i++) quieta.push({ apertura: 0.58 }, { apertura: 0.59 });
    expect(repeticiones(quieta, calibracion)).toBe(0);
  });
});
