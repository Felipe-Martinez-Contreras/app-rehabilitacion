import { describe, expect, it } from 'vitest';
import { aPixeles, normalPalmaZ } from './geometry';
import { manoSintetica, type OpcionesMano } from './manoSintetica';
import { clasificarOrientacion, orientacionValida, signoDePalma } from './orientacion';

const z = (o: OpcionesMano = {}) => normalPalmaZ(aPixeles(manoSintetica(o), 640, 480));

describe('normalPalmaZ', () => {
  it('vale ±1 con la mano de frente y cambia de signo al mostrar el dorso', () => {
    expect(Math.abs(z())).toBeCloseTo(1, 5);
    expect(Math.sign(z({ giroGrados: 180 }))).toBe(-Math.sign(z()));
  });

  it('se acerca a 0 con la mano de canto', () => {
    expect(Math.abs(z({ giroGrados: 90 }))).toBeLessThan(0.05);
  });

  it('la otra mano tiene el signo contrario (por eso se calibra el signo)', () => {
    expect(Math.sign(z({ espejo: true }))).toBe(-Math.sign(z()));
  });

  it('no depende de la distancia a la cámara ni de si la mano está cerrada', () => {
    expect(z({ palmaPx: 60 })).toBeCloseTo(z({ palmaPx: 160 }), 5);
    expect(z({ apertura: 0 })).toBeCloseTo(z({ apertura: 1 }), 5);
  });
});

describe('clasificarOrientacion', () => {
  it('sin calibrar solo distingue de frente y de canto', () => {
    expect(clasificarOrientacion(0.9, null)).toBe('de-frente');
    expect(clasificarOrientacion(-0.9, null)).toBe('de-frente');
    expect(clasificarOrientacion(0.2, null)).toBe('de-canto');
  });

  it('con el signo calibrado distingue palma y dorso, para cualquiera de las dos manos', () => {
    for (const espejo of [false, true]) {
      const signo = signoDePalma(z({ espejo }));
      expect(signo).not.toBeNull();
      expect(clasificarOrientacion(z({ espejo }), signo)).toBe('palma');
      expect(clasificarOrientacion(z({ espejo, giroGrados: 180 }), signo)).toBe('dorso');
      expect(clasificarOrientacion(z({ espejo, giroGrados: 90 }), signo)).toBe('de-canto');
    }
  });

  it('solo la palma (o de frente sin calibrar) permite contar', () => {
    expect(orientacionValida('palma')).toBe(true);
    expect(orientacionValida('de-frente')).toBe(true);
    expect(orientacionValida('dorso')).toBe(false);
    expect(orientacionValida('de-canto')).toBe(false);
  });

  it('no se puede registrar el signo con la mano de canto', () => {
    expect(signoDePalma(z({ giroGrados: 90 }))).toBeNull();
  });
});
