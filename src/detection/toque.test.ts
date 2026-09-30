import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { aPixeles } from './geometry';
import { ESTADO_INICIAL, type EstadoHisteresis } from './hysteresis';
import { manoSintetica, type OpcionesMano } from './manoSintetica';
import { calcularMetricas, type Metricas } from './metrics';
import { actualizarToque, aperturaMinimaParaToque, manoAbiertaParaToque } from './toque';
import type { Calibracion } from './types';

const medir = (o: OpcionesMano = {}): Metricas => {
  const m = calcularMetricas(aPixeles(manoSintetica(o), 640, 480));
  if (!m) throw new Error('sin métricas');
  return m;
};

const CALIBRACION: Calibracion = { aperturaMin: 0.6, aperturaMax: 1.8, separacionMax: 0.56, signoPalma: 1, zPalma: 1, ampliado: false };

describe('aperturaMinimaParaToque', () => {
  it('sin calibración usa 1,40', () => {
    expect(aperturaMinimaParaToque(null)).toBe(1.4);
  });

  it('con calibración usa cerrado + 0,6 × (abierto − cerrado)', () => {
    expect(aperturaMinimaParaToque(CALIBRACION)).toBeCloseTo(0.6 + 0.6 * 1.2, 10);
  });
});

describe('filtro de puño cerrado (apertura)', () => {
  // Valores medidos con la cámara: puño 0,51–0,74 (hasta 1,29 al entrar al cuadro); toques 1,56–1,67.
  const conApertura = (apertura: number): Metricas => ({ ...medir(), apertura });

  it('los toques medidos pasan el filtro y el puño no, con o sin calibración', () => {
    for (const calibracion of [null, CALIBRACION]) {
      for (const a of [1.56, 1.61, 1.67, 1.82]) expect(manoAbiertaParaToque(conApertura(a), calibracion)).toBe(true);
      for (const a of [0.51, 0.74, 1.29]) expect(manoAbiertaParaToque(conApertura(a), calibracion)).toBe(false);
    }
  });

  it('con la mano sintética: abierta tocando pasa, puño con el pulgar junto a las puntas no', () => {
    expect(manoAbiertaParaToque(medir({ toqueDedo: 'anular' }), null)).toBe(true);
    const puno = medir({ apertura: 0, toqueDedo: 'medio' });
    expect(puno.toque).toBeLessThan(CONFIG.toque.entrar);
    expect(manoAbiertaParaToque(puno, null)).toBe(false);
  });

  it('tocar el anular con el medio doblado a 40° sigue pasando (ya no depende de la flexión)', () => {
    const m = medir({ toqueDedo: 'anular', cierreDedos: { medio: 0.4, anular: 0.5, menique: 0.5 } });
    expect(m.flexionDedos.medio).toBeCloseTo(40, 5);
    expect(manoAbiertaParaToque(m, null)).toBe(true);
  });
});

describe('actualizarToque', () => {
  const tocando = medir({ toqueDedo: 'medio', distanciaToque: 0.1 });

  it('no empieza un toque si no se puede (puño o palma girada), aunque el pulgar toque', () => {
    let estado: EstadoHisteresis = ESTADO_INICIAL;
    for (let t = 0; t <= 1000; t += 33) {
      const r = actualizarToque(estado, tocando, t, false);
      expect(r.cambio).toBe(false);
      estado = r.estado;
    }
    expect(estado.activo).toBe(false);
  });

  it('si deja de poder empezar a mitad de la confirmación, la anula', () => {
    let estado = actualizarToque(ESTADO_INICIAL, tocando, 0, true).estado;
    estado = actualizarToque(estado, tocando, 100, false).estado;
    // Vuelve a poder: la confirmación empieza de cero (150 ms desde t = 133).
    estado = actualizarToque(estado, tocando, 133, true).estado;
    expect(actualizarToque(estado, tocando, 200, true).cambio).toBe(false);
    expect(actualizarToque(estado, tocando, 283, true).cambio).toBe(true);
  });

  it('suelta el toque si el pulgar se separa, aunque la mano esté cerrada o girada', () => {
    let estado: EstadoHisteresis = { activo: true, desde: null };
    const pulgarLejos = { ...medir({ apertura: 0 }), toque: 0.8 };
    for (let t = 0; t <= 200; t += 33) estado = actualizarToque(estado, pulgarLejos, t, false).estado;
    expect(estado.activo).toBe(false);
  });
});
