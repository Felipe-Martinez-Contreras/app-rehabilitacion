import { describe, expect, it } from 'vitest';
import { aPixeles, distancia3D, tamanoPalma } from './geometry';
import { manoSintetica } from './manoSintetica';

describe('aPixeles', () => {
  it('escala x por el ancho, y por el alto y z por el ancho', () => {
    const [p] = aPixeles([{ x: 0.5, y: 0.5, z: -0.1 }], 640, 480);
    expect(p).toEqual({ x: 320, y: 240, z: -64 });
  });
});

describe('distancia3D', () => {
  it('usa las tres coordenadas', () => {
    expect(distancia3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 12 })).toBe(13);
  });
});

describe('tamanoPalma', () => {
  it('mide la distancia de la muñeca a la base del dedo medio en píxeles', () => {
    const pix = aPixeles(manoSintetica({ palmaPx: 120 }), 640, 480);
    expect(tamanoPalma(pix)).toBeCloseTo(120, 5);
  });

  it('no se deforma con imágenes no cuadradas si se pasa a píxeles primero', () => {
    const ancha = aPixeles(manoSintetica({ ancho: 1280, alto: 480 }), 1280, 480);
    const alta = aPixeles(manoSintetica({ ancho: 480, alto: 1280 }), 480, 1280);
    expect(tamanoPalma(ancha)).toBeCloseTo(tamanoPalma(alta), 5);
  });
});
