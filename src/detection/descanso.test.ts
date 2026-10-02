import { describe, expect, it } from 'vitest';
import { actualizarDescanso, descansoInicial, descansoTerminado, segundosRestantes } from './descanso';

/** Actualiza cada 250 ms; `pausa(t)` indica si está en pausa en ese instante. */
function correr(hastaMs: number, pausa: (t: number) => boolean = () => false) {
  let estado = descansoInicial(20000);
  for (let t = 0; t <= hastaMs; t += 250) estado = actualizarDescanso(estado, t, pausa(t));
  return estado;
}

describe('descanso de 20 s', () => {
  it('cuenta hacia atrás y termina a los 20 s', () => {
    expect(segundosRestantes(correr(0))).toBe(20);
    expect(segundosRestantes(correr(5000))).toBe(15);
    expect(descansoTerminado(correr(19750))).toBe(false);
    expect(descansoTerminado(correr(20000))).toBe(true);
  });

  it('en pausa no avanza y al reanudar sigue desde donde quedó', () => {
    const conPausa = (t: number) => t > 5000 && t <= 15000;
    expect(segundosRestantes(correr(14000, conPausa))).toBe(15);
    expect(descansoTerminado(correr(29750, conPausa))).toBe(false);
    expect(descansoTerminado(correr(30250, conPausa))).toBe(true);
  });
});
