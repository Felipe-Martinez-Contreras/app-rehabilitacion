import { describe, expect, it } from 'vitest';
import { aPixeles } from './geometry';
import { manoSintetica, type OpcionesMano } from './manoSintetica';
import { calcularMetricas, type Metricas } from './metrics';
import { signoDePalma } from './orientacion';
import { procesarFotograma, SEGUIMIENTO_INICIAL, type ContextoSeguimiento, type ResultadoFotograma } from './seguimiento';

/** Fotograma: una postura de mano, o null si la mano no se ve. */
type Fotograma = OpcionesMano | null;

const medir = (o: OpcionesMano): Metricas => {
  const m = calcularMetricas(aPixeles(manoSintetica(o), 640, 480));
  if (!m) throw new Error('sin métricas');
  return m;
};

const SIN_CALIBRAR: ContextoSeguimiento = { calibracion: null, signoPalmaDepuracion: null };
const CALIBRADO: ContextoSeguimiento = {
  calibracion: { aperturaMin: 0.6, aperturaMax: 1.85, separacionMax: 0.56, signoPalma: signoDePalma(medir({}).orientacionZ)! },
  signoPalmaDepuracion: null,
};

/** Reproduce la secuencia a los fps indicados; devuelve los toques y los resultados. */
function reproducir(fotogramas: Fotograma[], contexto = SIN_CALIBRAR, fps = 30) {
  let estado = SEGUIMIENTO_INICIAL;
  let toques = 0;
  const resultados: ResultadoFotograma[] = [];
  fotogramas.forEach((f, i) => {
    const r = procesarFotograma(estado, (i * 1000) / fps, f ? medir(f) : null, contexto);
    estado = r.estado;
    if (r.toqueNuevo) toques++;
    resultados.push(r);
  });
  return { toques, resultados };
}

/** n fotogramas iguales. */
const durante = (f: Fotograma, n: number): Fotograma[] => Array<Fotograma>(n).fill(f);
/** Fotogramas equivalentes a `ms` a 30 fps. */
const ms = (f: Fotograma, milisegundos: number) => durante(f, Math.round((milisegundos * 30) / 1000));

const ABIERTA: OpcionesMano = {};
const TOCANDO: OpcionesMano = { toqueDedo: 'medio', distanciaToque: 0.1 };
const PUNO: OpcionesMano = { apertura: 0, toqueDedo: 'medio', distanciaToque: 0.1 };

describe('procesarFotograma: toques normales', () => {
  it('cuenta 5 toques con la mano abierta', () => {
    const secuencia: Fotograma[] = ms(ABIERTA, 500);
    for (let i = 0; i < 5; i++) secuencia.push(...ms(TOCANDO, 400), ...ms(ABIERTA, 400));
    expect(reproducir(secuencia).toques).toBe(5);
    expect(reproducir(secuencia, CALIBRADO).toques).toBe(5);
  });

  it('cuenta igual a 29 y a 60 fps', () => {
    const porTiempo = (fps: number) => {
      const n = (milisegundos: number) => Math.round((milisegundos * fps) / 1000);
      const secuencia: Fotograma[] = durante(ABIERTA, n(500));
      for (let i = 0; i < 3; i++) secuencia.push(...durante(TOCANDO, n(400)), ...durante(ABIERTA, n(400)));
      return reproducir(secuencia, SIN_CALIBRAR, fps).toques;
    };
    expect(porTiempo(29)).toBe(3);
    expect(porTiempo(60)).toBe(3);
  });
});

describe('procesarFotograma: entrada y salida del cuadro', () => {
  it('ignora los primeros 300 ms después de detectar la mano', () => {
    const { resultados } = reproducir([...ms(null, 200), ...ms(ABIERTA, 500)]);
    const primeroListo = resultados.findIndex((r) => r.lista);
    expect(primeroListo).toBe(6 + 9); // 6 fotogramas sin mano + 9 fotogramas (300 ms) ignorados
  });

  it('la mano que entra y sale del cuadro en menos de 300 ms nunca cuenta, aunque parezca un toque', () => {
    const secuencia: Fotograma[] = [];
    for (let i = 0; i < 6; i++) secuencia.push(...ms(null, 300), ...ms(TOCANDO, 250));
    expect(reproducir(secuencia).toques).toBe(0);
  });

  it('el puño entrando y saliendo del cuadro no cuenta toques', () => {
    const secuencia: Fotograma[] = [];
    for (let i = 0; i < 6; i++) secuencia.push(...ms(null, 300), ...ms(PUNO, 700));
    expect(reproducir(secuencia).toques).toBe(0);
  });

  it('una mano deformada al entrar (apertura hasta 1,29) no cuenta aunque dure más de 300 ms', () => {
    // Postura intermedia con el pulgar junto al medio: apertura ≈1,28, bajo el 1,40 del filtro.
    const deformada: OpcionesMano = { apertura: 0.4, toqueDedo: 'medio', distanciaToque: 0.1 };
    expect(medir(deformada).apertura).toBeGreaterThan(1.2);
    expect(medir(deformada).apertura).toBeLessThan(1.4);
    const secuencia: Fotograma[] = [];
    for (let i = 0; i < 6; i++) secuencia.push(...ms(null, 300), ...ms(deformada, 600));
    expect(reproducir(secuencia).toques).toBe(0);
  });

  it('perder la mano a mitad de la confirmación reinicia el toque', () => {
    // 100 ms tocando, se pierde, vuelve: debe esperar otra vez 300 + 150 ms.
    const secuencia = [...ms(ABIERTA, 500), ...ms(TOCANDO, 100), ...ms(null, 100), ...ms(TOCANDO, 400)];
    expect(reproducir(secuencia).toques).toBe(0);
    expect(reproducir([...secuencia, ...ms(TOCANDO, 200)]).toques).toBe(1);
  });

  it('al perder la mano se reinicia el estado (sin mano no hay toque en curso)', () => {
    const { resultados } = reproducir([...ms(ABIERTA, 500), ...ms(TOCANDO, 400), null]);
    const ultimo = resultados[resultados.length - 1];
    expect(ultimo.estado.toque.activo).toBe(false);
    expect(ultimo.estado.suavizadas).toBeNull();
    expect(ultimo.estado.presenteDesde).toBeNull();
  });
});

describe('procesarFotograma: giro de la mano', () => {
  it('girar el puño hasta mostrar el dorso no cuenta toques', () => {
    for (const contexto of [SIN_CALIBRAR, CALIBRADO]) {
      const secuencia: Fotograma[] = ms(PUNO, 500);
      for (let vuelta = 0; vuelta < 3; vuelta++) {
        for (let g = 0; g <= 180; g += 6) secuencia.push({ ...PUNO, giroGrados: g });
        for (let g = 180; g >= 0; g -= 6) secuencia.push({ ...PUNO, giroGrados: g });
      }
      expect(reproducir(secuencia, contexto).toques).toBe(0);
    }
  });

  it('con la mano abierta mostrando el dorso no cuenta toques (calibrado)', () => {
    const dorsoTocando: OpcionesMano = { ...TOCANDO, giroGrados: 180 };
    const secuencia = [...ms({ giroGrados: 180 }, 500), ...ms(dorsoTocando, 600)];
    const { toques, resultados } = reproducir(secuencia, CALIBRADO);
    expect(toques).toBe(0);
    expect(resultados[resultados.length - 1].orientacion).toBe('dorso');
  });

  it('con la mano de canto no cuenta toques, calibrada o no', () => {
    const cantoTocando: OpcionesMano = { ...TOCANDO, giroGrados: 90 };
    for (const contexto of [SIN_CALIBRAR, CALIBRADO]) {
      const { toques, resultados } = reproducir([...ms({ giroGrados: 90 }, 500), ...ms(cantoTocando, 600)], contexto);
      expect(toques).toBe(0);
      expect(resultados[resultados.length - 1].orientacion).toBe('de-canto');
    }
  });

  it('con la otra mano, calibrada con su propio signo, cuenta normalmente', () => {
    const otra: ContextoSeguimiento = {
      calibracion: { ...CALIBRADO.calibracion!, signoPalma: signoDePalma(medir({ espejo: true }).orientacionZ)! },
      signoPalmaDepuracion: null,
    };
    const secuencia: Fotograma[] = ms({ espejo: true }, 500);
    for (let i = 0; i < 3; i++) secuencia.push(...ms({ ...TOCANDO, espejo: true }, 400), ...ms({ espejo: true }, 400));
    expect(reproducir(secuencia, otra).toques).toBe(3);
    // Con el signo de la otra mano, esa misma palma se ve como dorso y no cuenta.
    expect(reproducir(secuencia, CALIBRADO).toques).toBe(0);
  });

  it('girar la mano a mitad de un toque no suma otro al volver', () => {
    const secuencia: Fotograma[] = [...ms(ABIERTA, 500), ...ms(TOCANDO, 400)];
    for (let g = 0; g <= 180; g += 10) secuencia.push({ ...TOCANDO, giroGrados: g });
    for (let g = 180; g >= 0; g -= 10) secuencia.push({ ...TOCANDO, giroGrados: g });
    secuencia.push(...ms(TOCANDO, 400));
    expect(reproducir(secuencia, CALIBRADO).toques).toBe(1);
  });
});
