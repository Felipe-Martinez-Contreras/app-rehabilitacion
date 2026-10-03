/**
 * Guía por voz: solo voces en español instaladas en el dispositivo
 * (`localService === true`). Las voces remotas envían el texto a un servidor,
 * así que nunca se usan. Si no hay ninguna, la opción no se muestra.
 */
export interface VozBasica {
  name: string;
  lang: string;
  localService: boolean;
  default?: boolean;
}

export function vocesEspanolLocales<V extends VozBasica>(voces: readonly V[]): V[] {
  return voces.filter((v) => v.localService === true && /^es([-_]|$)/i.test(v.lang));
}

/** Variantes en orden de preferencia: español neutro de América primero. */
const PREFERENCIA = ['es-419', 'es-us', 'es-mx', 'es-cl', 'es-ar', 'es-co', 'es-es'];

/** Elige la voz: la variante preferida disponible y, entre iguales, la del sistema por defecto. */
export function elegirVoz<V extends VozBasica>(voces: readonly V[]): V | null {
  const locales = vocesEspanolLocales(voces);
  if (locales.length === 0) return null;
  const rango = (v: V) => {
    const i = PREFERENCIA.indexOf(v.lang.toLowerCase().replace('_', '-'));
    return (i === -1 ? PREFERENCIA.length : i) * 2 + (v.default ? 0 : 1);
  };
  return [...locales].sort((a, b) => rango(a) - rango(b))[0];
}
