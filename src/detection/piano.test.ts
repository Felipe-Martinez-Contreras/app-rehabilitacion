import { describe, expect, it } from 'vitest';
import { aPixeles } from './geometry';
import { manoSintetica, type OpcionesMano } from './manoSintetica';
import { calcularMetricas, type Metricas } from './metrics';
import { dedoSiguiente, PIANO_INICIAL, registrarToque, reiniciarVuelta, type EstadoPiano } from './piano';
import { procesarFotograma, SEGUIMIENTO_INICIAL } from './seguimiento';
import type { Calibracion, Dedo } from './types';

type Fotograma = OpcionesMano | null;

const medir = (o: OpcionesMano): Metricas => {
  const m = calcularMetricas(aPixeles(manoSintetica(o), 640, 480));
  if (!m) throw new Error('sin métricas');
  return m;
};

const CALIBRACION: Calibracion = {
  aperturaMin: medir({ apertura: 0.2 }).apertura,
  aperturaMax: medir({ apertura: 1 }).apertura,
  separacionMax: 0.42,
  signoPalma: 1,
  zPalma: 1,
  ampliado: false,
};

/** Reproduce los fotogramas (30 fps): cada toque confirmado se registra con el dedo más cercano. */
function tocar(fotogramas: Fotograma[], inicial: EstadoPiano = PIANO_INICIAL) {
  let seguimiento = SEGUIMIENTO_INICIAL;
  let piano = inicial;
  const dedosTocados: Dedo[] = [];
  let vueltasCompletas = 0;
  fotogramas.forEach((f, i) => {
    const r = procesarFotograma(seguimiento, (i * 1000) / 30, f ? medir(f) : null, {
      calibracion: CALIBRACION,
      signoPalmaDepuracion: null,
    });
    seguimiento = r.estado;
    if (!r.toqueNuevo || !r.estado.suavizadas) return;
    const dedo = r.estado.suavizadas.dedoMasCercano;
    dedosTocados.push(dedo);
    const rp = registrarToque(piano, dedo);
    piano = rp.estado;
    if (rp.vueltaCompleta) vueltasCompletas++;
  });
  return { piano, dedosTocados, vueltasCompletas };
}

const ms = (f: Fotograma, milisegundos: number) => Array<Fotograma>(Math.round((milisegundos * 30) / 1000)).fill(f);
const ABIERTA: OpcionesMano = {};
const toque = (dedo: Dedo) => [...ms({ toqueDedo: dedo }, 400), ...ms(ABIERTA, 400)];
const vuelta = () => (['indice', 'medio', 'anular', 'menique'] as const).flatMap(toque);

describe('piano de dedos', () => {
  it('reconoce el dedo tocado y avanza índice → medio → anular → meñique', () => {
    const r = tocar([...ms(ABIERTA, 500), ...vuelta()]);
    expect(r.dedosTocados).toEqual(['indice', 'medio', 'anular', 'menique']);
    expect(r.vueltasCompletas).toBe(1);
    expect(r.piano).toEqual({ siguiente: 0, vueltas: 1 });
  });

  it('si toca otro dedo, no avanza: solo se repite la invitación', () => {
    const r = tocar([...ms(ABIERTA, 500), ...toque('indice'), ...toque('anular'), ...toque('menique')]);
    expect(r.dedosTocados).toEqual(['indice', 'anular', 'menique']);
    expect(dedoSiguiente(r.piano)).toBe('medio');
    expect(r.piano.vueltas).toBe(0);
  });

  it('cuenta dos vueltas seguidas', () => {
    const r = tocar([...ms(ABIERTA, 500), ...vuelta(), ...vuelta()]);
    expect(r.vueltasCompletas).toBe(2);
  });

  it('un toque sostenido cuenta una sola vez', () => {
    const r = tocar([...ms(ABIERTA, 500), ...ms({ toqueDedo: 'indice' }, 2000), ...ms(ABIERTA, 400)]);
    expect(r.dedosTocados).toEqual(['indice']);
  });

  it('con el puño cerrado no cuenta ningún toque', () => {
    const r = tocar([...ms(ABIERTA, 500), ...ms({ apertura: 0, toqueDedo: 'medio' }, 1000), ...ms({ apertura: 0 }, 400)]);
    expect(r.dedosTocados).toEqual([]);
  });

  it('al perder la mano se reinicia la vuelta en curso, pero se mantienen las vueltas completas', () => {
    const estado = registrarToque(registrarToque({ siguiente: 0, vueltas: 1 }, 'indice').estado, 'medio').estado;
    expect(reiniciarVuelta(estado)).toEqual({ siguiente: 0, vueltas: 1 });
  });
});
