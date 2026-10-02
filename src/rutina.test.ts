import { describe, expect, it } from 'vitest';
import { lineaResumen, lineasResumen } from './rutina';

describe('resumen del cierre', () => {
  it('muestra las repeticiones y vueltas que se hicieron', () => {
    expect(lineasResumen({ flor: 5, piano: 2, abanico: 3 }, [])).toEqual([
      'La flor: 5 repeticiones.',
      'Piano de dedos: 2 vueltas.',
      'El abanico: 3 repeticiones.',
    ]);
    expect(lineaResumen('flor', 1, false)).toBe('La flor: 1 repetición.');
    expect(lineaResumen('piano', 1, false)).toBe('Piano de dedos: 1 vuelta.');
  });

  it('un ejercicio saltado se muestra como saltado, nunca como 0', () => {
    const lineas = lineasResumen({ flor: 5, piano: 0, abanico: 3 }, ['piano']);
    expect(lineas[1]).toBe('Piano de dedos: lo saltaste hoy, y está bien.');
    for (const linea of lineasResumen({ flor: 0, piano: 0, abanico: 0 }, ['flor', 'piano', 'abanico'])) {
      expect(linea).toContain('saltaste');
      expect(linea).not.toMatch(/[0-9]/);
    }
  });

  it('si se saltó a mitad, muestra solo lo que se hizo (no el objetivo)', () => {
    expect(lineaResumen('flor', 2, true)).toBe('La flor: 2 repeticiones.');
  });

  it('si la rutina terminó antes de llegar a un ejercicio, no dice 0 ni "saltado"', () => {
    const lineas = lineasResumen({ flor: 3, piano: 0, abanico: 0 }, []);
    expect(lineas).toEqual([
      'La flor: 3 repeticiones.',
      'Piano de dedos: quedó para otro día.',
      'El abanico: quedó para otro día.',
    ]);
  });
});
