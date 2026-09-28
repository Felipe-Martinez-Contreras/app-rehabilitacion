import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { aPixeles } from './geometry';
import { actualizarHisteresis, ESTADO_INICIAL, type ConfigHisteresis, type EstadoHisteresis } from './hysteresis';
import { manoSintetica } from './manoSintetica';
import { calcularMetricas } from './metrics';
import { suavizar } from './smoothing';

const TOQUE: ConfigHisteresis = {
  direccion: 'bajo',
  entrar: CONFIG.toque.entrar,
  salir: CONFIG.toque.salir,
  fotogramas: CONFIG.fotogramasConfirmacion,
};

/** Cuenta cuántas veces se confirma la entrada al estado activo. */
function contarActivaciones(valores: number[], config: ConfigHisteresis): number {
  let estado: EstadoHisteresis = ESTADO_INICIAL;
  let cuenta = 0;
  for (const v of valores) {
    const r = actualizarHisteresis(estado, v, config);
    estado = r.estado;
    if (r.cambio && estado.activo) cuenta++;
  }
  return cuenta;
}

const repetir = (valor: number, n: number) => Array<number>(n).fill(valor);

describe('actualizarHisteresis', () => {
  it('espera 3 fotogramas seguidos antes de confirmar el cambio', () => {
    let estado = ESTADO_INICIAL;
    for (let i = 0; i < 2; i++) {
      const r = actualizarHisteresis(estado, 0.1, TOQUE);
      expect(r.cambio).toBe(false);
      estado = r.estado;
    }
    const r = actualizarHisteresis(estado, 0.1, TOQUE);
    expect(r.cambio).toBe(true);
    expect(r.estado.activo).toBe(true);
  });

  it('un fotograma fuera reinicia la cuenta', () => {
    expect(contarActivaciones([0.1, 0.1, 0.5, 0.1, 0.1], TOQUE)).toBe(0);
  });

  it('no sale del estado mientras el valor está entre ambos umbrales', () => {
    let estado: EstadoHisteresis = { activo: true, pendientes: 0 };
    for (const v of [0.35, 0.4, 0.44, 0.31, 0.42, 0.38]) {
      const r = actualizarHisteresis(estado, v, TOQUE);
      expect(r.cambio).toBe(false);
      estado = r.estado;
    }
    expect(estado.activo).toBe(true);
  });

  it('no cuenta dobles al temblar cerca del umbral de entrada', () => {
    const temblor = [0.5, 0.29, 0.31, 0.28, 0.32, 0.29, 0.33, 0.28, 0.31];
    expect(contarActivaciones(temblor, TOQUE)).toBe(0);
    const toqueConTemblor = [0.5, 0.25, 0.24, 0.26, 0.31, 0.29, 0.33, 0.28, 0.4, 0.29, 0.25];
    expect(contarActivaciones(toqueConTemblor, TOQUE)).toBe(1);
  });

  it('cuenta un toque nuevo solo después de soltar por encima de "salir"', () => {
    // 0,4 está entre los umbrales: no cuenta como soltar.
    expect(contarActivaciones([...repetir(0.15, 5), ...repetir(0.4, 5), ...repetir(0.15, 5)], TOQUE)).toBe(1);
    expect(contarActivaciones([...repetir(0.15, 5), ...repetir(0.6, 5), ...repetir(0.15, 5)], TOQUE)).toBe(2);
  });

  it('funciona en dirección "alto" (se activa al superar el umbral)', () => {
    const alto: ConfigHisteresis = { direccion: 'alto', entrar: 0.7, salir: 0.3, fotogramas: 3 };
    const ciclos = [0.1, 0.1, 0.1, 0.9, 0.9, 0.9, 0.5, 0.5, 0.1, 0.1, 0.1, 0.9, 0.9, 0.9];
    expect(contarActivaciones(ciclos, alto)).toBe(2);
  });
});

describe('toques con manos sintéticas (métricas + suavizado + histéresis)', () => {
  it('cuenta exactamente 3 toques aunque el pulgar tiemble', () => {
    // Generador pseudoaleatorio con semilla fija para que la prueba sea reproducible.
    let semilla = 7;
    const ruido = () => {
      semilla = (semilla * 16807) % 2147483647;
      return (semilla / 2147483647 - 0.5) * 0.06;
    };
    // null = pulgar en reposo (separado); número = distancia del toque, con temblor.
    const distancias: (number | null)[] = [];
    for (let rep = 0; rep < 3; rep++) {
      for (let i = 0; i < 12; i++) distancias.push(null);
      for (let i = 0; i < 12; i++) distancias.push(0.08 + Math.abs(ruido()));
    }
    let suave: number | null = null;
    const valores = distancias.map((d) => {
      const mano = d === null ? manoSintetica() : manoSintetica({ toqueDedo: 'medio', distanciaToque: d });
      const m = calcularMetricas(aPixeles(mano, 640, 480));
      if (!m) throw new Error('sin métricas');
      suave = suavizar(suave, m.toque, CONFIG.alfaSuavizado);
      return suave;
    });
    expect(contarActivaciones(valores, TOQUE)).toBe(3);
  });
});
