import { describe, expect, it } from 'vitest';
import { elegirVoz, vocesEspanolLocales, type VozBasica } from '../voz/voces';
import { AJUSTES_POR_DEFECTO, validarAjustes, type Ajustes } from './ajustes';
import {
  borrarRegistro,
  CLAVES,
  guardarAjustes,
  guardarRegistro,
  leerAjustes,
  leerRegistro,
  type AlmacenSimple,
} from './almacen';
import { floresDelJardin, floresDibujadas, MAXIMO_FLORES_DIBUJADAS, rutinaDaFlor } from './jardin';
import {
  agregarEntrada,
  crearEntrada,
  fasesCompletadas,
  fechaLocal,
  validarEntrada,
  validarRegistro,
  type DatosRutina,
  type EntradaRegistro,
} from './registro';

/** Almacenamiento falso en memoria (como localStorage). */
function almacenFalso(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  const almacen: AlmacenSimple = {
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
  return { almacen, datos };
}

/** Almacenamiento que siempre falla (modo privado, cuota llena, bloqueado). */
const almacenQueFalla: AlmacenSimple = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('cuota llena');
  },
  removeItem: () => {
    throw new Error('bloqueado');
  },
};

const OBJETIVOS_SUAVE = { flor: 5, piano: 2, abanico: 3 };
const rutina = (parcial: Partial<DatosRutina> = {}): DatosRutina => ({
  calibrada: true,
  repeticiones: { flor: 5, piano: 2, abanico: 3 },
  objetivos: OBJETIVOS_SUAVE,
  sensacion: 'comoda',
  ...parcial,
});
const entrada = (repeticiones = { flor: 5, piano: 2, abanico: 3 }): EntradaRegistro => ({
  fecha: '2026-10-03',
  fases: [1, 2, 3, 4, 5],
  repeticiones,
  sensacion: 'comoda',
});

describe('ajustes', () => {
  it('sin nada guardado usa los valores por defecto (sonido sí, voz no, Suave, gesto sí)', () => {
    expect(validarAjustes(null)).toEqual(AJUSTES_POR_DEFECTO);
    expect(AJUSTES_POR_DEFECTO).toMatchObject({ sonido: true, voz: false, intensidad: 'suave', inicioConGesto: true, soloTrazo: false });
    expect(AJUSTES_POR_DEFECTO.altoContraste).toBeNull();
  });

  it('valida campo a campo: lo inválido vuelve a su valor por defecto y lo desconocido se descarta', () => {
    const a = validarAjustes({ sonido: false, intensidad: 'extrema', tamanoTexto: 9, altoContraste: true, nombre: 'Ana', landmarks: [1] });
    expect(a).toEqual({ ...AJUSTES_POR_DEFECTO, sonido: false, altoContraste: true });
    expect(Object.keys(a).sort()).toEqual(Object.keys(AJUSTES_POR_DEFECTO).sort());
    expect(validarAjustes({ tamanoTexto: 1.5 }).tamanoTexto).toBe(0);
    expect(validarAjustes({ tamanoTexto: 4 }).tamanoTexto).toBe(4);
  });
});

describe('registro', () => {
  it('la fecha es local y en formato AAAA-MM-DD, sin hora', () => {
    expect(fechaLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('fases completadas: calibración, ejercicios que llegaron a su objetivo y la pregunta final', () => {
    expect(fasesCompletadas(rutina())).toEqual([1, 2, 3, 4, 5]);
    // Piano saltado, abanico a medias y sin responder: se registran sus repeticiones, pero no como completados.
    const parcial = rutina({ repeticiones: { flor: 5, piano: 0, abanico: 1 }, sensacion: null });
    expect(fasesCompletadas(parcial)).toEqual([1, 2]);
    // El objetivo es el de la intensidad con la que se hizo el ejercicio.
    expect(fasesCompletadas(rutina({ objetivos: { flor: 8, piano: 3, abanico: 5 } }))).toEqual([1, 5]);
  });

  it('crea una entrada solo con los campos permitidos', () => {
    const e = crearEntrada(new Date(2026, 9, 3), rutina({ sensacion: 'molestia' }));
    expect(e).toEqual({ fecha: '2026-10-03', fases: [1, 2, 3, 4, 5], repeticiones: { flor: 5, piano: 2, abanico: 3 }, sensacion: 'molestia' });
  });

  it('descarta entradas inválidas y campos que no son del registro', () => {
    const datos = [
      entrada(),
      { ...entrada(), fecha: '3 de octubre' },
      { ...entrada(), repeticiones: { flor: -1, piano: 0, abanico: 0 } },
      { ...entrada(), fases: [0, 9] },
      { ...entrada(), imagen: 'data:image/png…', landmarks: [[0, 0, 0]], rangoApertura: 1.2 },
      'basura',
    ];
    const r = validarRegistro(datos);
    expect(r).toHaveLength(2);
    for (const e of r) expect(Object.keys(e).sort()).toEqual(['fases', 'fecha', 'repeticiones', 'sensacion']);
    expect(validarRegistro({ no: 'es lista' })).toEqual([]);
    expect(validarEntrada({ ...entrada(), sensacion: 'dolor intenso' })?.sensacion).toBeNull();
  });

  it('agregar una entrada no modifica el registro anterior', () => {
    const antes: EntradaRegistro[] = [entrada()];
    const despues = agregarEntrada(antes, entrada({ flor: 1, piano: 0, abanico: 0 }));
    expect(antes).toHaveLength(1);
    expect(despues).toHaveLength(2);
  });
});

describe('jardín', () => {
  it('nace una flor por cada rutina con al menos una repetición', () => {
    expect(rutinaDaFlor({ flor: 1, piano: 0, abanico: 0 })).toBe(true);
    expect(rutinaDaFlor({ flor: 0, piano: 0, abanico: 0 })).toBe(false);
    const registro = [entrada(), entrada({ flor: 0, piano: 0, abanico: 0 }), entrada({ flor: 2, piano: 0, abanico: 0 })];
    expect(floresDelJardin(registro)).toBe(2);
  });

  it('"Terminar por hoy" con alguna repetición también da flor (las flores no dependen de completar)', () => {
    const terminadaAntes = crearEntrada(new Date(), rutina({ repeticiones: { flor: 2, piano: 0, abanico: 0 }, sensacion: 'molestia' }));
    expect(floresDelJardin([terminadaAntes])).toBe(1);
  });

  it('las flores nunca se marchitan: no dependen de fechas seguidas', () => {
    const espaciadas = ['2025-01-01', '2026-06-15', '2026-10-03'].map((fecha) => ({ ...entrada(), fecha }));
    expect(floresDelJardin(espaciadas)).toBe(3);
  });

  it('dibuja hasta un máximo y cuenta el resto en texto', () => {
    expect(floresDibujadas(3)).toEqual({ dibujadas: 3, mas: 0 });
    expect(floresDibujadas(75)).toEqual({ dibujadas: MAXIMO_FLORES_DIBUJADAS, mas: 75 - MAXIMO_FLORES_DIBUJADAS });
  });
});

describe('almacén local', () => {
  it('guarda y lee ajustes y registro solo con las claves mqs:ajustes y mqs:registro', () => {
    const { almacen, datos } = almacenFalso();
    const ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO, intensidad: 'habitual', voz: true };
    expect(guardarAjustes(ajustes, almacen)).toBe(true);
    expect(guardarRegistro([entrada()], almacen)).toBe(true);
    expect([...datos.keys()].sort()).toEqual([CLAVES.ajustes, CLAVES.registro].sort());
    expect(leerAjustes(almacen)).toEqual(ajustes);
    expect(leerRegistro(almacen)).toEqual([entrada()]);
  });

  it('nunca guarda la calibración ni campos ajenos', () => {
    const { almacen, datos } = almacenFalso();
    guardarAjustes({ ...AJUSTES_POR_DEFECTO, aperturaMin: 0.7 } as Ajustes, almacen);
    expect(datos.get(CLAVES.ajustes)).not.toContain('apertura');
    expect([...datos.keys()]).not.toContain('mqs:calibracion');
  });

  it('con datos corruptos usa los valores por defecto sin fallar', () => {
    const { almacen } = almacenFalso({ [CLAVES.ajustes]: '{no es json', [CLAVES.registro]: '"texto"' });
    expect(leerAjustes(almacen)).toEqual(AJUSTES_POR_DEFECTO);
    expect(leerRegistro(almacen)).toEqual([]);
  });

  it('si el almacenamiento falla o no existe, la app sigue (sin excepciones)', () => {
    expect(leerAjustes(almacenQueFalla)).toEqual(AJUSTES_POR_DEFECTO);
    expect(leerRegistro(almacenQueFalla)).toEqual([]);
    expect(guardarAjustes(AJUSTES_POR_DEFECTO, almacenQueFalla)).toBe(false);
    expect(guardarRegistro([entrada()], almacenQueFalla)).toBe(false);
    expect(borrarRegistro(almacenQueFalla)).toBe(false);
    expect(leerAjustes(null)).toEqual(AJUSTES_POR_DEFECTO);
    expect(guardarRegistro([], null)).toBe(false);
  });

  it('"Borrar mi registro" borra el registro (y el jardín) pero mantiene los ajustes', () => {
    const { almacen, datos } = almacenFalso();
    guardarAjustes({ ...AJUSTES_POR_DEFECTO, sonido: false }, almacen);
    guardarRegistro([entrada()], almacen);
    expect(borrarRegistro(almacen)).toBe(true);
    expect(datos.has(CLAVES.registro)).toBe(false);
    expect(floresDelJardin(leerRegistro(almacen))).toBe(0);
    expect(leerAjustes(almacen).sonido).toBe(false);
  });
});

describe('voces para la guía por voz', () => {
  const voz = (name: string, lang: string, localService: boolean, def = false): VozBasica => ({ name, lang, localService, default: def });

  it('solo voces en español instaladas en el dispositivo', () => {
    const voces = [voz('Remota', 'es-ES', false), voz('Inglés', 'en-US', true), voz('Local', 'es-MX', true), voz('Estonio', 'et-EE', true)];
    expect(vocesEspanolLocales(voces).map((v) => v.name)).toEqual(['Local']);
  });

  it('sin voces locales en español no hay voz (y la opción no se muestra)', () => {
    expect(elegirVoz([voz('Remota', 'es-ES', false), voz('Inglés', 'en-US', true)])).toBeNull();
    expect(elegirVoz([])).toBeNull();
  });

  it('prefiere el español de América y, entre iguales, la voz por defecto', () => {
    const voces = [voz('España', 'es-ES', true), voz('México', 'es-MX', true), voz('EE. UU.', 'es-US', true, true), voz('EE. UU. 2', 'es_US', true)];
    expect(elegirVoz(voces)?.name).toBe('EE. UU.');
  });
});
