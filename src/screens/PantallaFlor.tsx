import { useEffect, useRef, useState } from 'react';
import { useFotograma, type SeguimientoMano } from '../camera/useHandTracking';
import type { Anunciar } from '../components/Anunciador';
import { Flor, pintarFlor } from '../components/Flor';
import { Titulo } from '../components/Titulo';
import { actualizarFlor, FLOR_INICIAL } from '../detection/flor';
import type { Calibracion } from '../detection/types';
import { aperturaRelativa, umbralesFlor } from '../detection/umbrales';

interface Props {
  seguimiento: SeguimientoMano;
  calibracion: Calibracion;
  anunciar: Anunciar;
  objetivo: number;
  /** Repeticiones ya hechas (al retomar después de "Detener"). */
  inicial: number;
  onRepeticion: (total: number) => void;
  onSeguir: () => void;
  onDetener: () => void;
  onSaltar: () => void;
}

/** La flor (fase 2): abrir y cerrar la mano. Cada ciclo cerrada → abierta enciende un pétalo. */
export function PantallaFlor(props: Props) {
  const { seguimiento, calibracion, anunciar, objetivo, inicial, onRepeticion, onSeguir, onDetener, onSaltar } = props;
  const [hechas, setHechas] = useState(inicial);
  const total = useRef(inicial);
  const flor = useRef<SVGSVGElement>(null);
  const estado = useRef(FLOR_INICIAL);
  const datos = seguimiento.depuracion;
  const completa = hechas >= objetivo;

  useFotograma(seguimiento, ({ t, resultado: r }) => {
    const suavizadas = r.estado.suavizadas;
    if (suavizadas) pintarFlor(flor.current, aperturaRelativa(suavizadas.apertura, calibracion));
    if (total.current >= objetivo) return;

    const rf = actualizarFlor(estado.current, t, suavizadas, r.puedeContar, calibracion);
    estado.current = rf.estado;
    const { cerrada, abierta } = umbralesFlor(calibracion);
    datos.current.pantalla = [
      `flor          ${rf.estado.activo ? 'abierta' : 'cerrada'}${rf.estado.desde !== null ? ' (confirmando cambio)' : ''} · ${total.current} de ${objetivo}`,
      `umbral flor   cerrada < ${cerrada.toFixed(3)} · abierta > ${abierta.toFixed(3)}${r.puedeContar ? '' : ' · sin contar (mano no lista o girada)'}`,
    ];
    if (!rf.repeticion) return;
    total.current++;
    setHechas(total.current);
    onRepeticion(total.current);
    anunciar(`Repetición ${total.current} de ${objetivo}`, true);
    if (total.current >= objetivo) anunciar('La flor está completa.', true);
  });

  // Esc equivale a "Detener" durante el ejercicio.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDetener();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [onDetener]);

  useEffect(() => {
    const d = datos.current;
    return () => {
      d.pantalla = [];
    };
  }, [datos]);

  return (
    <section className="pantalla">
      <Titulo>La flor</Titulo>
      <p className="destacado">
        {completa
          ? 'La flor está completa. Cuando quieras, seguimos.'
          : 'Cuando quieras, abre la mano despacio… y ciérrala con suavidad.'}
      </p>
      <Flor florRef={flor} petalos={objetivo} encendidos={hechas} etiqueta={`Flor con ${hechas} de ${objetivo} pétalos encendidos`} />
      <div className="contador">
        <p className="contador__texto" aria-hidden="true">
          {hechas} de {objetivo}
        </p>
        <progress className="contador__barra" max={objetivo} value={hechas} aria-label={`Repeticiones: ${hechas} de ${objetivo}`} />
      </div>
      <div className="acciones">
        {completa && (
          <button type="button" className="boton" onClick={onSeguir}>
            Seguir
          </button>
        )}
        <button type="button" className="boton boton--secundario" onClick={onDetener}>
          Detener
        </button>
        {!completa && (
          <button type="button" className="boton boton--secundario" onClick={onSaltar}>
            Saltar este ejercicio
          </button>
        )}
      </div>
    </section>
  );
}
