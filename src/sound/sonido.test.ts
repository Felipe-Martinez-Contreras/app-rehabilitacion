import { describe, expect, it } from 'vitest';
import { volumenAcorde, VOLUMEN_ACORDE_MINIMO } from './acorde';
import { comprimirMelodia, duracionMelodia, MELODIA, type NotaMelodia } from './melodia';
import {
  ACORDE_DO,
  acordeResolucionFlor,
  ARPEGIO,
  CAMPANA,
  DO,
  DO_AGUDO,
  esDo,
  FA,
  LA,
  MI,
  NOTA_DEDO,
  notaFlor,
  PENTATONICA,
  RE,
  SI,
  SOL,
} from './notas';

const nota = (t: number, frecuencia = DO): NotaMelodia => ({ t, frecuencia, timbre: 'nota' });
const intervalos = (notas: NotaMelodia[]) => notas.slice(1).map((n, i) => n.t - notas[i].t);

describe('qué nota toca cada evento', () => {
  it('la flor sube por la escala mayor de Do: Do, Re, Mi, Fa, Sol, La, Si, Do agudo', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(notaFlor)).toEqual([DO, RE, MI, FA, SOL, LA, SI]);
    expect(notaFlor(8)).toBeCloseTo(DO_AGUDO, 5);
  });

  it('después de la octava sigue subiendo, siempre en orden', () => {
    expect(notaFlor(9)).toBeCloseTo(RE * 2, 5);
    for (let n = 1; n < 12; n++) expect(notaFlor(n + 1)).toBeGreaterThan(notaFlor(n));
  });

  it('con intensidad Suave (5) la flor termina en Sol y resuelve con un acorde de Do', () => {
    expect(notaFlor(5)).toBe(SOL);
    expect(acordeResolucionFlor(5)).toEqual([DO, MI, SOL]);
  });

  it('con intensidad Habitual (8) la flor completa una octava y no necesita resolver', () => {
    expect(esDo(notaFlor(8))).toBe(true);
    expect(acordeResolucionFlor(8)).toBeNull();
  });

  it('el acorde de Do está en registro medio: Do4, Mi4 y Sol4', () => {
    expect(ACORDE_DO).toEqual([DO, MI, SOL]);
    for (const f of ACORDE_DO) {
      expect(f).toBeGreaterThan(250);
      expect(f).toBeLessThan(400);
    }
  });

  it('cada dedo del piano tiene su nota: Do, Mi, Sol y Do agudo', () => {
    expect(NOTA_DEDO).toEqual({ indice: DO, medio: MI, anular: SOL, menique: DO_AGUDO });
    expect(ARPEGIO).toEqual([DO, MI, SOL, DO_AGUDO]);
  });

  it('el piano, el arpegio y los acordes usan notas de la pentatónica de Do', () => {
    const enEscala = (f: number) =>
      PENTATONICA.some((base) => Math.abs(Math.log2(f / base) - Math.round(Math.log2(f / base))) < 1e-9);
    for (const f of [...Object.values(NOTA_DEDO), ...ARPEGIO, ...ACORDE_DO, CAMPANA]) expect(enEscala(f)).toBe(true);
  });
});

describe('curva del acorde del abanico', () => {
  it('crece con el temporizador mientras se sostiene', () => {
    expect(volumenAcorde(0, true)).toBe(VOLUMEN_ACORDE_MINIMO);
    expect(volumenAcorde(1, true)).toBe(1);
    for (let a = 0; a < 1; a += 0.1) expect(volumenAcorde(a + 0.1, true)).toBeGreaterThan(volumenAcorde(a, true));
  });

  it('al soltar es 0 (el motor lo desvanece), y al retomar sigue desde su avance', () => {
    expect(volumenAcorde(0.6, false)).toBe(0);
    expect(volumenAcorde(0.6, true)).toBeCloseTo(VOLUMEN_ACORDE_MINIMO + 0.75 * 0.6, 5);
  });

  it('nunca sale del rango 0–1', () => {
    expect(volumenAcorde(-1, true)).toBe(VOLUMEN_ACORDE_MINIMO);
    expect(volumenAcorde(5, true)).toBe(1);
  });
});

describe('compresión de la melodía del día', () => {
  it('una melodía corta se reproduce con el mismo ritmo, contada desde 0', () => {
    const r = comprimirMelodia([nota(5000, DO), nota(5400, RE), nota(6200, MI)]);
    expect(r.map((n) => n.t)).toEqual([0, 400, 1200]);
    expect(r.map((n) => n.frecuencia)).toEqual([DO, RE, MI]);
  });

  it('recorta los silencios de más de 1,5 s a 1,5 s (descansos y pausas)', () => {
    const r = comprimirMelodia([nota(0), nota(800), nota(25800), nota(26500)]);
    expect(intervalos(r)).toEqual([800, 1500, 700]);
  });

  it('si aún pasa de 20 s, escala los intervalos conservando sus proporciones', () => {
    // 30 notas cada 1 s: 29 s → se escala a 20 s.
    const r = comprimirMelodia(Array.from({ length: 30 }, (_, i) => nota(i * 1000)));
    expect(duracionMelodia(r)).toBeCloseTo(MELODIA.maximoMs, 3);
    for (const x of intervalos(r)) expect(x).toBeCloseTo(20000 / 29, 3);
  });

  it('al escalar, ninguna nota queda a menos de 150 ms de la anterior y el total sigue en 20 s', () => {
    // Tramos rápidos (200 ms) entre silencios largos: al escalar bajarían de 150 ms.
    const tiempos: number[] = [];
    let t = 0;
    for (let bloque = 0; bloque < 16; bloque++) {
      for (let i = 0; i < 6; i++) tiempos.push((t += 200));
      t += 5000;
    }
    const r = comprimirMelodia(tiempos.map((x) => nota(x)));
    expect(duracionMelodia(r)).toBeLessThanOrEqual(MELODIA.maximoMs + 1e-3);
    for (const x of intervalos(r)) expect(x).toBeGreaterThanOrEqual(MELODIA.separacionMinimaMs - 1e-6);
    // Los silencios siguen siendo más largos que los tramos rápidos: se conserva el ritmo.
    expect(Math.max(...intervalos(r))).toBeGreaterThan(MELODIA.separacionMinimaMs * 2);
  });

  it('las notas que ya estaban a menos de 150 ms se quedan como estaban', () => {
    const r = comprimirMelodia([nota(0), nota(100), nota(600)]);
    expect(intervalos(r)).toEqual([100, 500]);
  });

  it('con demasiadas notas conserva las últimas que caben en 20 s', () => {
    const r = comprimirMelodia(Array.from({ length: 300 }, (_, i) => nota(i * 300, 200 + i)));
    expect(duracionMelodia(r)).toBeLessThanOrEqual(MELODIA.maximoMs + 1e-3);
    expect(r.length).toBeLessThan(300);
    expect(r[r.length - 1].frecuencia).toBe(499);
    for (const x of intervalos(r)) expect(x).toBeGreaterThanOrEqual(MELODIA.separacionMinimaMs - 1e-6);
  });

  it('ordena por tiempo, conserva el timbre y acepta una melodía vacía', () => {
    expect(comprimirMelodia([])).toEqual([]);
    const r = comprimirMelodia([nota(900, MI), { t: 300, frecuencia: SOL, timbre: 'campana' }]);
    expect(r).toEqual([
      { t: 0, frecuencia: SOL, timbre: 'campana' },
      { t: 600, frecuencia: MI, timbre: 'nota' },
    ]);
  });
});
