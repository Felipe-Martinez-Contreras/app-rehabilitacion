import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { aPixeles } from './geometry';
import { actualizarHisteresis, ESTADO_INICIAL, interrumpir, type ConfigHisteresis, type EstadoHisteresis } from './hysteresis';
import { manoSintetica } from './manoSintetica';
import { calcularMetricas } from './metrics';
import { suavizar } from './smoothing';

const TOQUE: ConfigHisteresis = {
  direccion: 'bajo',
  entrar: CONFIG.toque.entrar,
  salir: CONFIG.toque.salir,
  confirmacionMs: CONFIG.confirmacionMs,
};

/** Cuenta cuántas veces se confirma la entrada al estado activo, con fotogramas cada `msPorFotograma`. */
function contarActivaciones(valores: number[], config: ConfigHisteresis, msPorFotograma = 1000 / 30): number {
  let estado: EstadoHisteresis = ESTADO_INICIAL;
  let cuenta = 0;
  valores.forEach((v, i) => {
    const r = actualizarHisteresis(estado, v, config, i * msPorFotograma);
    estado = r.estado;
    if (r.cambio && estado.activo) cuenta++;
  });
  return cuenta;
}

/** n fotogramas a 30 fps con el mismo valor. */
const repetir = (valor: number, n: number) => Array<number>(n).fill(valor);

describe('actualizarHisteresis', () => {
  it('confirma el cambio cuando la condición se mantiene 150 ms', () => {
    let estado = ESTADO_INICIAL;
    for (const t of [0, 50, 100, 149]) {
      const r = actualizarHisteresis(estado, 0.1, TOQUE, t);
      expect(r.cambio).toBe(false);
      estado = r.estado;
    }
    const r = actualizarHisteresis(estado, 0.1, TOQUE, 150);
    expect(r.cambio).toBe(true);
    expect(r.estado.activo).toBe(true);
  });

  it('tarda lo mismo a 29 fps que a 60 fps', () => {
    const tiempoHastaConfirmar = (fps: number) => {
      let estado = ESTADO_INICIAL;
      for (let i = 0; i < 100; i++) {
        const t = (i * 1000) / fps;
        const r = actualizarHisteresis(estado, 0.1, TOQUE, t);
        estado = r.estado;
        if (r.cambio) return t;
      }
      return Infinity;
    };
    const a29 = tiempoHastaConfirmar(29);
    const a60 = tiempoHastaConfirmar(60);
    expect(a29).toBeGreaterThanOrEqual(150);
    expect(a60).toBeGreaterThanOrEqual(150);
    expect(Math.abs(a29 - a60)).toBeLessThan(1000 / 29);
  });

  it('un fotograma fuera reinicia el tiempo', () => {
    // 4 fotogramas (≈100 ms), uno fuera, otros 4: nunca llega a 150 ms seguidos.
    expect(contarActivaciones([...repetir(0.1, 4), 0.5, ...repetir(0.1, 4)], TOQUE)).toBe(0);
  });

  it('interrumpir anula el cambio en curso', () => {
    let estado = actualizarHisteresis(ESTADO_INICIAL, 0.1, TOQUE, 0).estado;
    estado = interrumpir(estado);
    expect(actualizarHisteresis(estado, 0.1, TOQUE, 160).cambio).toBe(false);
  });

  it('no sale del estado mientras el valor está entre ambos umbrales', () => {
    let estado: EstadoHisteresis = { activo: true, desde: null };
    [0.35, 0.4, 0.44, 0.34, 0.42, 0.38, 0.4, 0.41].forEach((v, i) => {
      const r = actualizarHisteresis(estado, v, TOQUE, i * 100);
      expect(r.cambio).toBe(false);
      estado = r.estado;
    });
    expect(estado.activo).toBe(true);
  });

  it('no cuenta dobles al temblar cerca del umbral de entrada', () => {
    // Valores relativos al umbral de entrada: e = entrar, alternando justo por debajo y por encima.
    const e = TOQUE.entrar;
    const temblor = [0.5, e - 0.01, e + 0.01, e - 0.02, e + 0.02, e - 0.01, e + 0.03, e - 0.02, e + 0.01];
    expect(contarActivaciones(temblor, TOQUE)).toBe(0);
    const toqueConTemblor = [0.5, ...repetir(e - 0.05, 6), e + 0.01, e - 0.01, e + 0.03, e - 0.02, 0.4, ...repetir(e - 0.03, 6)];
    expect(contarActivaciones(toqueConTemblor, TOQUE)).toBe(1);
  });

  it('cuenta un toque nuevo solo después de soltar por encima de "salir"', () => {
    // 0,4 está entre los umbrales: no cuenta como soltar.
    expect(contarActivaciones([...repetir(0.15, 8), ...repetir(0.4, 8), ...repetir(0.15, 8)], TOQUE)).toBe(1);
    expect(contarActivaciones([...repetir(0.15, 8), ...repetir(0.6, 8), ...repetir(0.15, 8)], TOQUE)).toBe(2);
  });

  it('funciona en dirección "alto" (se activa al superar el umbral)', () => {
    const alto: ConfigHisteresis = { direccion: 'alto', entrar: 0.7, salir: 0.3, confirmacionMs: 150 };
    const ciclos = [...repetir(0.1, 8), ...repetir(0.9, 8), ...repetir(0.5, 4), ...repetir(0.1, 8), ...repetir(0.9, 8)];
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
