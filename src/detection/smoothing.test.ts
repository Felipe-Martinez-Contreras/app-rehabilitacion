import { describe, expect, it } from 'vitest';
import { suavizar, suavizarCampos } from './smoothing';

describe('suavizar', () => {
  it('sin valor anterior devuelve el valor nuevo', () => {
    expect(suavizar(null, 5, 0.4)).toBe(5);
  });

  it('avanza una fracción alfa hacia el valor nuevo', () => {
    expect(suavizar(0, 10, 0.4)).toBeCloseTo(4);
  });

  it('converge al valor si se repite', () => {
    let v = suavizar(null, 0, 0.4);
    for (let i = 0; i < 40; i++) v = suavizar(v, 1, 0.4);
    expect(v).toBeCloseTo(1, 5);
  });

  it('amortigua un pico aislado', () => {
    expect(suavizar(1, 3, 0.4)).toBeLessThan(2);
  });
});

describe('suavizarCampos', () => {
  it('suaviza solo los campos indicados', () => {
    const r = suavizarCampos({ a: 0, b: 0 }, { a: 10, b: 10 }, ['a'], 0.5);
    expect(r).toEqual({ a: 5, b: 10 });
  });

  it('sin valor anterior devuelve el valor nuevo', () => {
    expect(suavizarCampos(null, { a: 3 }, ['a'], 0.5)).toEqual({ a: 3 });
  });
});
