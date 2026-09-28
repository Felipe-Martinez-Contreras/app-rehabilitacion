import { describe, expect, it } from 'vitest';
import { aPixeles } from './geometry';
import { manoSintetica, type OpcionesMano } from './manoSintetica';
import { calcularMetricas } from './metrics';

const medir = (o: OpcionesMano = {}) => {
  const m = calcularMetricas(aPixeles(manoSintetica(o), o.ancho ?? 640, o.alto ?? 480));
  if (!m) throw new Error('sin métricas');
  return m;
};

describe('calcularMetricas', () => {
  it('la apertura es mayor con la mano abierta que cerrada', () => {
    expect(medir({ apertura: 1 }).apertura).toBeGreaterThan(medir({ apertura: 0.2 }).apertura + 0.5);
  });

  it('no depende de la distancia a la cámara (tamaño de la palma)', () => {
    const cerca = medir({ palmaPx: 160, muneca: { x: 320, y: 440 } });
    const lejos = medir({ palmaPx: 60 });
    expect(cerca.apertura).toBeCloseTo(lejos.apertura, 5);
    expect(cerca.separacion).toBeCloseTo(lejos.separacion, 5);
    expect(cerca.toque).toBeCloseTo(lejos.toque, 5);
  });

  it('detecta el toque y el dedo más cercano', () => {
    for (const dedo of ['indice', 'medio', 'anular', 'menique'] as const) {
      const m = medir({ toqueDedo: dedo, distanciaToque: 0.1 });
      expect(m.dedoMasCercano).toBe(dedo);
      expect(m.toque).toBeCloseTo(0.1, 5);
    }
  });

  it('sin toque, el pulgar queda lejos de las puntas', () => {
    expect(medir({ apertura: 1 }).toque).toBeGreaterThan(0.45);
  });

  it('la separación crece al abrir los dedos en abanico', () => {
    expect(medir({ separacionGrados: 20 }).separacion).toBeGreaterThan(medir({ separacionGrados: 2 }).separacion);
  });

  it('devuelve null si faltan puntos o la mano es demasiado pequeña', () => {
    expect(calcularMetricas([])).toBeNull();
    expect(calcularMetricas(aPixeles(manoSintetica({ palmaPx: 2 }), 640, 480))).toBeNull();
  });
});
