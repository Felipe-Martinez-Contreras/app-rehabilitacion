/**
 * Registro simple de cada rutina (clave `mqs:registro`): solo la fecha
 * (AAAA-MM-DD), las fases completadas, las repeticiones y cómo se sintió la mano.
 * Nunca imágenes, landmarks, medidas de la mano ni datos personales.
 */
export type Sensacion = 'comoda' | 'esfuerzo' | 'molestia';

export interface Repeticiones {
  flor: number;
  /** Vueltas del piano. */
  piano: number;
  abanico: number;
}

export interface EntradaRegistro {
  fecha: string;
  /** Fases completadas (1 a 5). */
  fases: number[];
  repeticiones: Repeticiones;
  sensacion: Sensacion | null;
}

/** Fecha local en formato AAAA-MM-DD (sin hora). */
export function fechaLocal(d: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const SENSACIONES: readonly Sensacion[] = ['comoda', 'esfuerzo', 'molestia'];
const conteo = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 1000 ? x : null);

/** Valida una entrada; devuelve null si no es válida. Solo conserva los campos permitidos. */
export function validarEntrada(x: unknown): EntradaRegistro | null {
  if (typeof x !== 'object' || x === null) return null;
  const e = x as Record<string, unknown>;
  if (typeof e.fecha !== 'string' || !FECHA.test(e.fecha)) return null;
  if (!Array.isArray(e.fases) || !e.fases.every((f) => Number.isInteger(f) && f >= 1 && f <= 5)) return null;
  const r = e.repeticiones as Record<string, unknown> | null;
  if (typeof r !== 'object' || r === null) return null;
  const flor = conteo(r.flor);
  const piano = conteo(r.piano);
  const abanico = conteo(r.abanico);
  if (flor === null || piano === null || abanico === null) return null;
  const sensacion = SENSACIONES.includes(e.sensacion as Sensacion) ? (e.sensacion as Sensacion) : null;
  return { fecha: e.fecha, fases: [...new Set(e.fases as number[])].sort((a, b) => a - b), repeticiones: { flor, piano, abanico }, sensacion };
}

/** Valida el registro completo: descarta las entradas que no sean válidas. */
export function validarRegistro(x: unknown): EntradaRegistro[] {
  if (!Array.isArray(x)) return [];
  return x.map(validarEntrada).filter((e): e is EntradaRegistro => e !== null);
}

export function agregarEntrada(registro: readonly EntradaRegistro[], entrada: EntradaRegistro): EntradaRegistro[] {
  const valida = validarEntrada(entrada);
  return valida ? [...registro, valida] : [...registro];
}

export interface DatosRutina {
  /** Se calibró el rango cómodo en esta rutina (fase 1). */
  calibrada: boolean;
  repeticiones: Repeticiones;
  /** Objetivo con el que se hizo cada ejercicio (según la intensidad de ese momento). */
  objetivos: Repeticiones;
  sensacion: Sensacion | null;
}

/**
 * Fases completadas: 1 si se calibró; 2, 3 y 4 si el ejercicio llegó a su
 * objetivo (saltado o a medias no cuenta como completado, aunque sus repeticiones
 * se registran); 5 si respondió cómo se sintió.
 */
export function fasesCompletadas(d: DatosRutina): number[] {
  const fases: number[] = [];
  if (d.calibrada) fases.push(1);
  if (d.repeticiones.flor >= d.objetivos.flor) fases.push(2);
  if (d.repeticiones.piano >= d.objetivos.piano) fases.push(3);
  if (d.repeticiones.abanico >= d.objetivos.abanico) fases.push(4);
  if (d.sensacion !== null) fases.push(5);
  return fases;
}

export function crearEntrada(fecha: Date, d: DatosRutina): EntradaRegistro {
  return { fecha: fechaLocal(fecha), fases: fasesCompletadas(d), repeticiones: { ...d.repeticiones }, sensacion: d.sensacion };
}
