import { describe, expect, it } from 'vitest';
import { VentanaMinMax } from './ventana';

describe('VentanaMinMax', () => {
  it('sin muestras devuelve null', () => {
    expect(new VentanaMinMax(5000).minMax(0)).toBeNull();
  });

  it('devuelve el mínimo y el máximo de la ventana', () => {
    const v = new VentanaMinMax(5000);
    [3, 1, 4, 1.5, 9].forEach((valor, i) => v.agregar(i * 100, valor));
    expect(v.minMax(400)).toEqual({ min: 1, max: 9 });
  });

  it('olvida las muestras de hace más de 5 s', () => {
    const v = new VentanaMinMax(5000);
    v.agregar(0, 10);
    v.agregar(1000, 2);
    v.agregar(5500, 5);
    expect(v.minMax(5500)).toEqual({ min: 2, max: 5 });
    expect(v.minMax(6500)).toEqual({ min: 5, max: 5 });
    expect(v.minMax(20000)).toBeNull();
  });

  it('reiniciar borra todo', () => {
    const v = new VentanaMinMax(5000);
    v.agregar(0, 1);
    v.reiniciar();
    expect(v.minMax(0)).toBeNull();
  });
});
