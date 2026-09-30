import { describe, expect, it } from 'vitest';
import { aperturaMinimaParaToque } from './toque';
import type { Calibracion } from './types';
import { aperturaRelativa, umbralesAbanico, umbralesFlor } from './umbrales';

const base: Calibracion = { aperturaMin: 1.1, aperturaMax: 1.3, separacionMax: 0.56, signoPalma: 1, zPalma: 1, ampliado: false };

describe('umbrales relativos al rango calibrado', () => {
  it('la flor usa el 30 % y el 70 % del rango de la persona', () => {
    const { cerrada, abierta } = umbralesFlor(base);
    expect(cerrada).toBeCloseTo(1.16, 5);
    expect(abierta).toBeCloseTo(1.24, 5);
  });

  it('el filtro de toques usa el 60 % del rango calibrado (1,40 solo sin calibrar)', () => {
    expect(aperturaMinimaParaToque(base)).toBeCloseTo(1.22, 5);
    expect(aperturaMinimaParaToque(null)).toBe(1.4);
  });

  it('el abanico usa el rango entre 0,26 (juntos por defecto) y la separación máxima', () => {
    const { juntos, separados } = umbralesAbanico(base);
    expect(juntos).toBeCloseTo(0.26 + 0.35 * 0.3, 5);
    expect(separados).toBeCloseTo(0.26 + 0.7 * 0.3, 5);
  });

  it('la apertura relativa va de 0 a 1 dentro del rango y se limita fuera de él', () => {
    expect(aperturaRelativa(1.2, base)).toBeCloseTo(0.5, 5);
    expect(aperturaRelativa(0.9, base)).toBe(0);
    expect(aperturaRelativa(1.9, base)).toBe(1);
  });
});
