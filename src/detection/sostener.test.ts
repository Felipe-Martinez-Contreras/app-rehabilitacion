import { describe, expect, it } from 'vitest';
import { actualizarSostener, progreso, SOSTENER_INICIAL, type AlSoltar, type EstadoSostener } from './sostener';

/** Reproduce fotogramas a `fps`; cada elemento indica si se cumple la condición. */
function reproducir(cumple: boolean[], duracionMs: number, alSoltar: AlSoltar = 'pausar', fps = 30) {
  let estado: EstadoSostener = SOSTENER_INICIAL;
  let completoEn: number | null = null;
  cumple.forEach((c, i) => {
    const t = (i * 1000) / fps;
    estado = actualizarSostener(estado, t, c, duracionMs, alSoltar);
    if (estado.completo && completoEn === null) completoEn = t;
  });
  return { estado, completoEn };
}

/** Fotogramas equivalentes a `ms` a 30 fps. */
const ms = (c: boolean, milisegundos: number) => Array<boolean>(Math.round((milisegundos * 30) / 1000)).fill(c);

describe('actualizarSostener', () => {
  it('se completa tras 3 s sostenidos', () => {
    expect(reproducir(ms(true, 2900), 3000).estado.completo).toBe(false);
    const r = reproducir(ms(true, 3200), 3000);
    expect(r.estado.completo).toBe(true);
    expect(r.completoEn).toBeCloseTo(3000, -2);
  });

  it('se pausa al soltar y se retoma sin perder lo acumulado', () => {
    const r = reproducir([...ms(true, 2000), ...ms(false, 1000), ...ms(true, 800)], 3000);
    expect(r.estado.completo).toBe(false);
    expect(progreso(r.estado, 3000)).toBeGreaterThan(0.85);
    // El tiempo soltado no cuenta: completa tras 3 s sostenidos en total.
    const completa = reproducir([...ms(true, 2000), ...ms(false, 1000), ...ms(true, 1200)], 3000);
    expect(completa.estado.completo).toBe(true);
    expect(completa.completoEn).toBeGreaterThan(3900);
  });

  it('con "reiniciar", al soltar vuelve a cero', () => {
    const r = reproducir([...ms(true, 1500), ...ms(false, 100), ...ms(true, 1500)], 2000, 'reiniciar');
    expect(r.estado.completo).toBe(false);
    expect(r.estado.acumuladoMs).toBeLessThan(1600);
  });

  it('cuenta el mismo tiempo a 29 y a 60 fps', () => {
    const a29 = reproducir(Array<boolean>(Math.round(2.5 * 29)).fill(true), 3000, 'pausar', 29);
    const a60 = reproducir(Array<boolean>(Math.round(2.5 * 60)).fill(true), 3000, 'pausar', 60);
    expect(a29.estado.acumuladoMs).toBeCloseTo(a60.estado.acumuladoMs, -2);
  });

  it('un salto largo entre fotogramas (pestaña en segundo plano) suma poco', () => {
    let estado = actualizarSostener(SOSTENER_INICIAL, 0, true, 3000);
    estado = actualizarSostener(estado, 5000, true, 3000);
    expect(estado.completo).toBe(false);
    expect(estado.acumuladoMs).toBeLessThanOrEqual(100);
  });
});
