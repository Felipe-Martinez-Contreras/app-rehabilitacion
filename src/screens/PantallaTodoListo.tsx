import { useEffect, useRef, type ReactNode } from 'react';
import { useFotograma, type SeguimientoMano } from '../camera/useHandTracking';
import { AnilloProgreso, pintarAnillo } from '../components/AnilloProgreso';
import { Titulo } from '../components/Titulo';
import { CONFIG } from '../detection/config';
import { actualizarGestoInicio } from '../detection/gestoInicio';
import { progreso, SOSTENER_INICIAL } from '../detection/sostener';
import type { Calibracion } from '../detection/types';

interface Props {
  seguimiento: SeguimientoMano;
  calibracion: Calibracion;
  /** Frase sobre lo que viene. */
  frase: string;
  ilustracion: ReactNode;
  onComenzar: () => void;
}

/**
 * "¿Todo listo?", antes de cada ejercicio. Se empieza con el botón o sosteniendo
 * la mano abierta 2 s (el gesto empieza a contar 1 s después de que aparece la pantalla).
 */
export function PantallaTodoListo({ seguimiento, calibracion, frase, ilustracion, onComenzar }: Props) {
  const anillo = useRef<SVGSVGElement>(null);
  const gesto = useRef(SOSTENER_INICIAL);
  const inicio = useRef<number | null>(null);
  const comenzado = useRef(false);
  const datos = seguimiento.depuracion;

  useFotograma(seguimiento, ({ t, resultado: r }) => {
    if (comenzado.current) return;
    inicio.current ??= t;
    gesto.current = actualizarGestoInicio(gesto.current, t, inicio.current, r.estado.suavizadas, r.puedeContar, calibracion);
    pintarAnillo(anillo.current, progreso(gesto.current, CONFIG.gestoInicio.sostenerMs));
    datos.current.pantalla = [
      `gesto inicio  ${t - inicio.current < CONFIG.gestoInicio.esperaMs ? 'esperando 1 s' : 'contando'} · ${Math.round(gesto.current.acumuladoMs)} de ${CONFIG.gestoInicio.sostenerMs} ms`,
    ];
    if (gesto.current.completo) {
      comenzado.current = true;
      onComenzar();
    }
  });

  useEffect(() => {
    const d = datos.current;
    return () => {
      d.pantalla = [];
    };
  }, [datos]);

  const comenzar = () => {
    comenzado.current = true;
    onComenzar();
  };

  return (
    <section className="pantalla">
      <Titulo>¿Todo listo?</Titulo>
      <p className="destacado">{frase}</p>
      <div className="ilustracion">{ilustracion}</div>
      <button type="button" className="boton" onClick={comenzar}>
        Comenzar
      </button>
      <div className="progreso-postura">
        <AnilloProgreso anilloRef={anillo} etiqueta="Mano abierta sostenida para comenzar" />
        <p>También puedes comenzar sosteniendo la mano abierta unos 2 segundos.</p>
      </div>
    </section>
  );
}
