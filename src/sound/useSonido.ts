import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dedo } from '../detection/types';
import { comprimirMelodia, type NotaMelodia } from './melodia';
import { MotorSonido } from './motor';
import { acordeResolucionFlor, ARPEGIO_PASO_MS, CAMPANA, NOTA_DEDO, notaFlor } from './notas';

/** El arpegio empieza un poco después de la última nota de la vuelta. */
const MS_ANTES_DEL_ARPEGIO = 3 * ARPEGIO_PASO_MS;
/** El acorde que resuelve la flor llega después de la última nota. */
const MS_ANTES_DE_RESOLVER = 450;

/**
 * Sonido de la rutina. Cada evento suena (si el sonido está activo) y, si es una
 * nota de la flor, un toque del piano o una campana, se guarda en la melodía del
 * día: solo en memoria, durante la sesión; nunca se guarda ni se envía.
 */
export function useSonido() {
  const [activado, setActivado] = useState(true);
  const motor = useRef<MotorSonido | null>(null);
  motor.current ??= new MotorSonido();
  const melodia = useRef<NotaMelodia[]>([]);

  useEffect(() => {
    const m = motor.current!;
    // El AudioContext se crea o reanuda en el primer clic de la persona (y en los siguientes, si quedó suspendido).
    const alClic = () => m.activar();
    // Al ocultar la pestaña, el sonido se silencia (igual que la cámara se apaga).
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'hidden') m.silenciar();
    };
    document.addEventListener('click', alClic, true);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      document.removeEventListener('click', alClic, true);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      m.silenciar();
    };
  }, []);

  useEffect(() => {
    motor.current!.setActivado(activado);
  }, [activado]);

  const acciones = useMemo(() => {
    const m = motor.current!;
    const registrar = (frecuencia: number, timbre: NotaMelodia['timbre']) => {
      melodia.current.push({ t: performance.now(), frecuencia, timbre });
    };
    return {
      /** Repetición `n` de la flor: la siguiente nota ascendente de la escala mayor de Do. */
      notaFlor(repeticion: number) {
        const f = notaFlor(repeticion);
        m.tocarNota(f);
        registrar(f, 'nota');
      },
      /** Al completar la flor: acorde suave de Do si la última nota no fue un Do (no entra en la melodía). */
      resolverFlor(objetivo: number) {
        const acorde = acordeResolucionFlor(objetivo);
        if (acorde) m.tocarAcorde(acorde, MS_ANTES_DE_RESOLVER / 1000);
      },
      /** Toque de un dedo en el piano (suena aunque no sea el que sigue). */
      notaDedo(dedo: Dedo) {
        m.tocarNota(NOTA_DEDO[dedo]);
        registrar(NOTA_DEDO[dedo], 'nota');
      },
      /** Arpegio al completar una vuelta del piano (no entra en la melodía). */
      arpegio() {
        m.tocarArpegio(MS_ANTES_DEL_ARPEGIO / 1000);
      },
      /** Acorde del abanico: volumen 0–1 en cada fotograma (no entra en la melodía). */
      acorde(volumen: number) {
        m.setVolumenAcorde(volumen);
      },
      /** Campana al completar una repetición del abanico. */
      campana() {
        m.tocarCampana();
        registrar(CAMPANA, 'campana');
      },
      /** "Detener": desvanece todo y suspende el audio hasta el próximo clic. */
      silenciar() {
        m.silenciar();
      },
      /** Cantidad de notas de la melodía del día. */
      notasMelodia() {
        return melodia.current.length;
      },
      /** Reproduce la melodía del día comprimida; devuelve su duración en ms (0 si no puede sonar). */
      reproducirMelodia() {
        return m.reproducirMelodia(comprimirMelodia(melodia.current));
      },
      detenerMelodia() {
        m.detenerMelodia();
      },
      /** Al volver al inicio, la melodía del día se borra. */
      borrarMelodia() {
        m.detenerMelodia();
        melodia.current = [];
      },
    };
  }, []);

  return { ...acciones, activado, setActivado };
}

export type Sonido = ReturnType<typeof useSonido>;
