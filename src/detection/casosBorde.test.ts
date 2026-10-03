import { describe, expect, it } from 'vitest';
import {
  ABANICO_INICIAL,
  actualizarAbanico,
  CALIBRACION_ABANICO_INICIAL,
  evaluarCalibracionAbanico,
  manoValidaAbanico,
} from './abanico';
import { CALIBRACION_INICIAL, evaluarCalibracion, mediana, rangoPersonal } from './calibracion';
import { CONFIG } from './config';
import { actualizarDescanso, descansoInicial, descansoTerminado, segundosRestantes } from './descanso';
import { actualizarFlor, FLOR_INICIAL } from './flor';
import { aPixeles, normalPalmaZ } from './geometry';
import { actualizarHisteresis, ESTADO_INICIAL, type ConfigHisteresis } from './hysteresis';
import { manoSintetica } from './manoSintetica';
import { calcularMetricas, type Metricas } from './metrics';
import { clasificarOrientacion, signoDePalma } from './orientacion';
import { PIANO_INICIAL, registrarToque, reiniciarVuelta } from './piano';
import { actualizarSostener, progreso, SOSTENER_INICIAL } from './sostener';
import type { Calibracion, RangoSeparacion } from './types';
import { aperturaRelativa, umbralesAbanico, umbralesFlor } from './umbrales';

const medir = (o = {}): Metricas => {
  const m = calcularMetricas(aPixeles(manoSintetica(o), 640, 480));
  if (!m) throw new Error('sin métricas');
  return m;
};

const CALIBRACION: Calibracion = { aperturaMin: 0.8, aperturaMax: 1.8, separacionMax: 0.42, signoPalma: 1, zPalma: 1, ampliado: false };

describe('casos borde: geometría y orientación', () => {
  it('con los tres puntos de la palma en línea, la normal es 0 (de canto), sin dividir por cero', () => {
    const puntos = Array.from({ length: 21 }, (_, i) => ({ x: i, y: 0, z: 0 }));
    expect(normalPalmaZ(puntos)).toBe(0);
    expect(clasificarOrientacion(0, 1)).toBe('de-canto');
  });

  it('justo en el límite |z| = 0,5 la mano ya cuenta como de frente', () => {
    const limite = CONFIG.orientacion.minimoDeFrente;
    expect(clasificarOrientacion(limite, null)).toBe('de-frente');
    expect(clasificarOrientacion(-limite, -1)).toBe('palma');
    expect(clasificarOrientacion(limite - 0.001, 1)).toBe('de-canto');
    expect(signoDePalma(limite)).toBe(1);
    expect(signoDePalma(-limite + 0.001)).toBeNull();
  });

  it('una mano con todos los puntos en el mismo lugar no produce métricas', () => {
    const punto = { x: 0.5, y: 0.5, z: 0 };
    expect(calcularMetricas(aPixeles(Array(21).fill(punto), 640, 480))).toBeNull();
    expect(calcularMetricas([])).toBeNull();
  });
});

describe('casos borde: histéresis', () => {
  const toque: ConfigHisteresis = { direccion: 'bajo', entrar: 0.33, salir: 0.45, confirmacionMs: 150 };

  it('un valor exactamente en el umbral no inicia el cambio (la comparación es estricta)', () => {
    expect(actualizarHisteresis(ESTADO_INICIAL, 0.33, toque, 0).estado.desde).toBeNull();
    expect(actualizarHisteresis({ activo: true, desde: null }, 0.45, toque, 0).estado.desde).toBeNull();
  });

  it('confirma exactamente al cumplirse el tiempo, no antes', () => {
    const inicio = actualizarHisteresis(ESTADO_INICIAL, 0.1, toque, 1000).estado;
    expect(actualizarHisteresis(inicio, 0.1, toque, 1149).cambio).toBe(false);
    expect(actualizarHisteresis(inicio, 0.1, toque, 1150).cambio).toBe(true);
  });
});

describe('casos borde: temporizadores', () => {
  it('sostener: si el tiempo retrocede no resta, y una vez completo no cambia', () => {
    let e = actualizarSostener(SOSTENER_INICIAL, 1000, true, 3000);
    e = actualizarSostener(e, 1050, true, 3000);
    const antes = e.acumuladoMs;
    e = actualizarSostener(e, 900, true, 3000);
    expect(e.acumuladoMs).toBe(antes);

    const completo = { acumuladoMs: 3000, ultimoT: 5000, completo: true };
    expect(actualizarSostener(completo, 6000, false, 3000, 'reiniciar')).toBe(completo);
    expect(progreso(completo, 3000)).toBe(1);
  });

  it('sostener: soltar sin haber empezado no cambia el estado', () => {
    expect(actualizarSostener(SOSTENER_INICIAL, 100, false, 3000)).toBe(SOSTENER_INICIAL);
    expect(actualizarSostener(SOSTENER_INICIAL, 100, false, 3000, 'reiniciar')).toBe(SOSTENER_INICIAL);
  });

  it('descanso: nunca baja de 0, no resta si el tiempo retrocede y en pausa no cambia', () => {
    let e = actualizarDescanso(descansoInicial(20000), 0, false);
    e = actualizarDescanso(e, 60000, false);
    expect(e.restanteMs).toBe(0);
    expect(descansoTerminado(e)).toBe(true);
    expect(segundosRestantes(e)).toBe(0);

    let atras = actualizarDescanso(descansoInicial(20000), 5000, false);
    atras = actualizarDescanso(atras, 4000, false);
    expect(atras.restanteMs).toBe(20000);

    const inicial = descansoInicial(20000);
    expect(actualizarDescanso(inicial, 1000, true)).toBe(inicial);
  });
});

describe('casos borde: rango personal y calibración', () => {
  it('un rango exactamente igual al mínimo se acepta tal cual', () => {
    expect(rangoPersonal(0, 0.15, 0.15, 1)).toEqual({ tipo: 'lista', min: 0, max: 0.15, ampliado: false });
    expect(rangoPersonal(0, 0.1, 0.1, 1).tipo).toBe('lista');
  });

  it('justo bajo el mínimo: invita a repetir y, al segundo intento, amplía alrededor del punto medio', () => {
    expect(rangoPersonal(1.2, 1.3, 0.15, 1)).toEqual({ tipo: 'repetir', rango: expect.closeTo(0.1, 10) });
    const r = rangoPersonal(1.2, 1.3, 0.15, 2);
    if (r.tipo !== 'lista') throw new Error('se esperaba lista');
    expect(r.ampliado).toBe(true);
    expect(r.min).toBeCloseTo(1.175, 10);
    expect(r.max).toBeCloseTo(1.325, 10);
    // Un tercer intento se comporta como el segundo: nunca se queda sin poder seguir.
    expect(rangoPersonal(1.2, 1.3, 0.15, 3).tipo).toBe('lista');
  });

  it('si la postura "cerrada" midió más que la "abierta", el rango ampliado queda en orden', () => {
    const r = rangoPersonal(1.4, 1.3, 0.15, 2);
    if (r.tipo !== 'lista') throw new Error('se esperaba lista');
    expect(r.min).toBeLessThan(r.max);
    expect(r.max - r.min).toBeCloseTo(0.15, 10);
    expect((r.min + r.max) / 2).toBeCloseTo(1.35, 10);
  });

  it('la mediana resiste un fotograma deformado y promedia con cantidad par', () => {
    expect(mediana([1.8, 1.82, 9.9, 1.81, 1.79])).toBe(1.81);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });

  it('no se puede evaluar una calibración que no ha terminado', () => {
    expect(() => evaluarCalibracion(CALIBRACION_INICIAL, 1)).toThrow();
    expect(() => evaluarCalibracionAbanico(CALIBRACION_ABANICO_INICIAL, 1)).toThrow();
  });

  it('los umbrales siguen en orden con el rango mínimo (ampliado)', () => {
    const minima: Calibracion = { ...CALIBRACION, aperturaMin: 1.175, aperturaMax: 1.325, ampliado: true };
    const flor = umbralesFlor(minima);
    expect(flor.cerrada).toBeLessThan(flor.abierta);
    expect(flor.abierta - flor.cerrada).toBeCloseTo(0.06, 10);
    const rango: RangoSeparacion = { juntos: 0.3, separados: 0.4, ampliado: true };
    const abanico = umbralesAbanico(rango);
    expect(abanico.juntos).toBeLessThan(abanico.separados);
  });

  it('la apertura relativa con un rango nulo o invertido es 0 (sin dividir por cero)', () => {
    expect(aperturaRelativa(1.5, { ...CALIBRACION, aperturaMin: 1.2, aperturaMax: 1.2 })).toBe(0);
    expect(aperturaRelativa(1.5, { ...CALIBRACION, aperturaMin: 1.4, aperturaMax: 1.2 })).toBe(0);
  });
});

describe('casos borde: ejercicios', () => {
  it('la flor sin mano vuelve al estado inicial y nunca cuenta', () => {
    const r = actualizarFlor({ activo: false, desde: 100 }, 200, null, false, CALIBRACION);
    expect(r).toEqual({ estado: FLOR_INICIAL, repeticion: false });
  });

  it('el abanico sin mano mantiene lo sostenido y el estado de preparado (pausa sin penalización)', () => {
    const rango: RangoSeparacion = { juntos: 0.3, separados: 0.54, ampliado: false };
    const enCurso = { separados: { activo: true, desde: null }, armado: true, sostener: { acumuladoMs: 1800, ultimoT: 1000, completo: false } };
    const r = actualizarAbanico(enCurso, 1033, null, false, rango);
    expect(r.repeticion).toBe(false);
    expect(r.estado.armado).toBe(true);
    expect(r.estado.sostener.acumuladoMs).toBe(1800);
    expect(r.estado.sostener.ultimoT).toBeNull();
    expect(manoValidaAbanico(null, true, CALIBRACION)).toBe(false);
    expect(actualizarAbanico(ABANICO_INICIAL, 0, null, false, rango).estado.armado).toBe(false);
  });

  it('el abanico no valida la mano bajo el filtro de apertura, aunque los dedos estén separados', () => {
    const cerrada = medir({ apertura: 0, separacionGrados: 16 });
    expect(manoValidaAbanico(cerrada, true, CALIBRACION)).toBe(false);
    expect(manoValidaAbanico(medir({ separacionGrados: 16 }), false, CALIBRACION)).toBe(false);
    expect(manoValidaAbanico(medir({ separacionGrados: 16 }), true, CALIBRACION)).toBe(true);
  });

  it('en el piano, un dedo fuera de orden devuelve el mismo estado, y reiniciar al inicio de la vuelta no cambia nada', () => {
    const r = registrarToque(PIANO_INICIAL, 'menique');
    expect(r.estado).toBe(PIANO_INICIAL);
    expect(r.correcto).toBe(false);
    expect(reiniciarVuelta(PIANO_INICIAL)).toBe(PIANO_INICIAL);
  });
});
