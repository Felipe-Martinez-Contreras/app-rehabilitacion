import { describe, expect, it } from 'vitest';
import { aPixeles } from './geometry';
import { actualizarGestoInicio } from './gestoInicio';
import { manoSintetica, type OpcionesMano } from './manoSintetica';
import { calcularMetricas, type Metricas } from './metrics';
import { procesarFotograma, SEGUIMIENTO_INICIAL } from './seguimiento';
import { SOSTENER_INICIAL, type EstadoSostener } from './sostener';
import type { Calibracion } from './types';

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

/** Reproduce a 30 fps desde que aparece la pantalla (t = 0); devuelve cuándo se completó el gesto. */
function gesto(fotogramas: Fotograma[]) {
  let seguimiento = SEGUIMIENTO_INICIAL;
  let estado: EstadoSostener = SOSTENER_INICIAL;
  let completoEn: number | null = null;
  fotogramas.forEach((f, i) => {
    const t = (i * 1000) / 30;
    const r = procesarFotograma(seguimiento, t, f ? medir(f) : null, { calibracion: CALIBRACION, signoPalmaDepuracion: null });
    seguimiento = r.estado;
    estado = actualizarGestoInicio(estado, t, 0, r.estado.suavizadas, r.puedeContar, CALIBRACION);
    if (estado.completo && completoEn === null) completoEn = t;
  });
  return completoEn;
}

const ms = (f: Fotograma, milisegundos: number) => Array<Fotograma>(Math.round((milisegundos * 30) / 1000)).fill(f);

describe('inicio con gesto de mano abierta', () => {
  it('empieza a contar 1 s después de que aparece la pantalla y se completa a los 2 s sostenidos', () => {
    const completoEn = gesto(ms({ apertura: 1 }, 3500));
    expect(completoEn).not.toBeNull();
    expect(completoEn!).toBeGreaterThanOrEqual(3000);
  });

  it('no se completa con la mano cerrada, de canto o de dorso', () => {
    expect(gesto(ms({ apertura: 0.2 }, 4000))).toBeNull();
    expect(gesto(ms({ giroGrados: 80 }, 4000))).toBeNull();
    expect(gesto(ms({ giroGrados: 180 }, 4000))).toBeNull();
  });

  it('si la mano se cierra antes de tiempo, vuelve a cero', () => {
    const s = [...ms({ apertura: 1 }, 2500), ...ms({ apertura: 0.2 }, 400), ...ms({ apertura: 1 }, 1500)];
    expect(gesto(s)).toBeNull();
  });
});
