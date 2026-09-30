import { describe, expect, it } from 'vitest';
import { actualizarAviso, avisoInicial, manoEstable, temporizadoresEnPausa, type ObservacionMano } from './aviso';

/** Reproduce observaciones a 30 fps; devuelve el estado final y los avisos mostrados en orden. */
function reproducir(observaciones: ObservacionMano[]) {
  let estado = avisoInicial(0);
  const mostrados: string[] = [];
  let t = 0;
  observaciones.forEach((o, i) => {
    t = (i * 1000) / 30;
    estado = actualizarAviso(estado, t, o);
    if (mostrados[mostrados.length - 1] !== estado.mostrado) mostrados.push(estado.mostrado);
  });
  return { estado, mostrados, t };
}

const ms = (o: ObservacionMano, milisegundos: number) =>
  Array<ObservacionMano>(Math.round((milisegundos * 30) / 1000)).fill(o);

describe('avisos de la mano', () => {
  it('"No alcanzo a ver tu mano" aparece tras 1,5 s sin mano y pausa los temporizadores', () => {
    expect(reproducir(ms('sin-mano', 1400)).estado.mostrado).toBe('esperando');
    const r = reproducir(ms('sin-mano', 1600));
    expect(r.estado.mostrado).toBe('sin-mano');
    expect(temporizadoresEnPausa(r.estado)).toBe(true);
  });

  it('al entrar la mano, el aviso de mano perdida se quita de inmediato', () => {
    const r = reproducir([...ms('sin-mano', 2000), 'lista']);
    expect(r.estado.mostrado).toBe('lista');
  });

  it('una pérdida breve (menos de 1,5 s) no muestra el aviso', () => {
    const r = reproducir([...ms('lista', 500), ...ms('sin-mano', 1000), ...ms('lista', 100)]);
    expect(r.mostrados).toEqual(['lista']);
  });

  it('la palma girada se avisa tras 400 ms, sin parpadear', () => {
    expect(reproducir([...ms('lista', 500), ...ms('girada', 300)]).estado.mostrado).toBe('lista');
    const r = reproducir([...ms('lista', 500), ...ms('girada', 500), 'lista', ...ms('girada', 300)]);
    expect(r.mostrados).toEqual(['lista', 'girada']);
  });

  it('"Te veo" solo con la mano estable durante 1 s', () => {
    const casi = reproducir([...ms('sin-mano', 300), ...ms('lista', 900)]);
    expect(manoEstable(casi.estado, casi.t)).toBe(false);
    const estable = reproducir([...ms('sin-mano', 300), ...ms('lista', 1100)]);
    expect(manoEstable(estable.estado, estable.t)).toBe(true);
    const girada = reproducir([...ms('lista', 1100), ...ms('girada', 500)]);
    expect(manoEstable(girada.estado, girada.t)).toBe(false);
  });
});
