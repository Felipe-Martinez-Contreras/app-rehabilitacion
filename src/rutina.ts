/**
 * Datos de la rutina que no son de detección.
 * La intensidad se elegirá en Ajustes (Hito 4); por ahora se usa "Suave", la de por defecto.
 */
export const INTENSIDAD_SUAVE = { flor: 5, pianoVueltas: 2, abanico: 3 } as const;

export type Ejercicio = 'flor' | 'piano' | 'abanico';

/** Repeticiones (o vueltas, en el piano) que la persona hizo de verdad en cada ejercicio. */
export type Resumen = Record<Ejercicio, number>;

const NOMBRE: Record<Ejercicio, string> = { flor: 'La flor', piano: 'Piano de dedos', abanico: 'El abanico' };
const UNIDAD: Record<Ejercicio, [singular: string, plural: string]> = {
  flor: ['repetición', 'repeticiones'],
  piano: ['vuelta', 'vueltas'],
  abanico: ['repetición', 'repeticiones'],
};
const SALTADO: Record<Ejercicio, string> = {
  flor: 'la saltaste hoy, y está bien',
  piano: 'lo saltaste hoy, y está bien',
  abanico: 'lo saltaste hoy, y está bien',
};

/**
 * Línea del resumen del cierre. Solo muestra lo que se hizo de verdad: sin
 * repeticiones nunca dice "0", sino un texto calmado (saltado, o quedó para otro
 * día si la rutina terminó antes de llegar a ese ejercicio).
 */
export function lineaResumen(ejercicio: Ejercicio, hechas: number, saltado: boolean): string {
  if (hechas > 0) {
    const [singular, plural] = UNIDAD[ejercicio];
    return `${NOMBRE[ejercicio]}: ${hechas} ${hechas === 1 ? singular : plural}.`;
  }
  return `${NOMBRE[ejercicio]}: ${saltado ? SALTADO[ejercicio] : 'quedó para otro día'}.`;
}

/** Las tres líneas del resumen, en el orden de la rutina. */
export function lineasResumen(resumen: Resumen, saltados: readonly Ejercicio[]): string[] {
  return (['flor', 'piano', 'abanico'] as const).map((e) => lineaResumen(e, resumen[e], saltados.includes(e)));
}
