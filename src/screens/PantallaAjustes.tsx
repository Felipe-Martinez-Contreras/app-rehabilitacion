import { useEffect, useRef, useState } from 'react';
import { Titulo } from '../components/Titulo';
import type { Ajustes, Intensidad } from '../guardado/ajustes';
import { INTENSIDADES } from '../rutina';

interface Props {
  ajustes: Ajustes;
  onCambiar: (cambios: Partial<Ajustes>) => void;
  /** Hay al menos una voz en español instalada en el dispositivo. */
  vozDisponible: boolean;
  /** Hay una calibración en esta sesión (se puede repetir). */
  puedeRecalibrar: boolean;
  onRecalibrar: () => void;
  /** Devuelve true si se pudo borrar. */
  onBorrarRegistro: () => boolean;
  onVolver: () => void;
}

const DESCRIPCION_INTENSIDAD: Record<Intensidad, string> = {
  suave: `flor ${INTENSIDADES.suave.flor}, piano ${INTENSIDADES.suave.piano} vueltas, abanico ${INTENSIDADES.suave.abanico}`,
  habitual: `flor ${INTENSIDADES.habitual.flor}, piano ${INTENSIDADES.habitual.piano} vueltas, abanico ${INTENSIDADES.habitual.abanico}`,
};

/** Ajustes: cada cambio se aplica y se guarda en este dispositivo al momento. */
export function PantallaAjustes(props: Props) {
  const { ajustes, onCambiar, vozDisponible, puedeRecalibrar, onRecalibrar, onBorrarRegistro, onVolver } = props;
  const [borrado, setBorrado] = useState<'inicial' | 'confirmar' | 'listo' | 'error'>('inicial');
  const pregunta = useRef<HTMLParagraphElement>(null);
  const botonBorrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (borrado === 'confirmar') pregunta.current?.focus();
  }, [borrado]);

  const confirmarBorrado = () => {
    setBorrado(onBorrarRegistro() ? 'listo' : 'error');
    // El botón "Borrar mi registro" vuelve a aparecer: el foco regresa a él.
    requestAnimationFrame(() => botonBorrar.current?.focus());
  };

  const cancelarBorrado = () => {
    setBorrado('inicial');
    requestAnimationFrame(() => botonBorrar.current?.focus());
  };

  return (
    <section className="pantalla ajustes">
      <Titulo>Ajustes</Titulo>
      <p>Los cambios se aplican al momento y se guardan solo en este dispositivo.</p>

      <fieldset className="ajustes__grupo">
        <legend>Intensidad</legend>
        {(['suave', 'habitual'] as const).map((valor) => (
          <label key={valor} className="opcion">
            <input
              type="radio"
              name="intensidad"
              checked={ajustes.intensidad === valor}
              onChange={() => onCambiar({ intensidad: valor })}
            />
            <span>
              {valor === 'suave' ? 'Suave' : 'Habitual'}
              <span className="opcion__detalle">{DESCRIPCION_INTENSIDAD[valor]}</span>
            </span>
          </label>
        ))}
        <p className="ajustes__nota">Si cambias la intensidad durante la rutina, se aplica desde el siguiente ejercicio.</p>
      </fieldset>

      <fieldset className="ajustes__grupo">
        <legend>Sonido y voz</legend>
        <label className="opcion">
          <input type="checkbox" checked={ajustes.sonido} onChange={(e) => onCambiar({ sonido: e.target.checked })} />
          <span>
            Sonido
            <span className="opcion__detalle">Las notas y la música de los ejercicios. La guía por voz se controla aparte.</span>
          </span>
        </label>
        {vozDisponible && (
          <label className="opcion">
            <input type="checkbox" checked={ajustes.voz} onChange={(e) => onCambiar({ voz: e.target.checked })} />
            <span>
              Guía por voz
              <span className="opcion__detalle">
                Lee cada instrucción en voz alta, con una voz de este dispositivo. Funciona aparte del sonido: puede
                hablar aunque las notas estén apagadas.
              </span>
            </span>
          </label>
        )}
      </fieldset>

      <fieldset className="ajustes__grupo">
        <legend>Vista de la cámara</legend>
        <label className="opcion">
          <input type="radio" name="vista" checked={!ajustes.soloTrazo} onChange={() => onCambiar({ soloTrazo: false })} />
          <span>Ver mi imagen</span>
        </label>
        <label className="opcion">
          <input type="radio" name="vista" checked={ajustes.soloTrazo} onChange={() => onCambiar({ soloTrazo: true })} />
          <span>
            Ver solo el trazo de mi mano
            <span className="opcion__detalle">La imagen se oculta y queda el dibujo de la mano sobre un fondo suave.</span>
          </span>
        </label>
      </fieldset>

      <fieldset className="ajustes__grupo">
        <legend>Comenzar cada ejercicio</legend>
        <label className="opcion">
          <input
            type="checkbox"
            checked={ajustes.inicioConGesto}
            onChange={(e) => onCambiar({ inicioConGesto: e.target.checked })}
          />
          <span>
            También sosteniendo la mano abierta
            <span className="opcion__detalle">El botón "Comenzar" siempre está disponible.</span>
          </span>
        </label>
      </fieldset>

      <h2>Rango cómodo</h2>
      {puedeRecalibrar ? (
        <>
          <p>Puedes repetir la calibración de hoy, por ejemplo si tu mano se siente distinta que al comenzar.</p>
          <button type="button" className="boton boton--secundario" onClick={onRecalibrar}>
            Recalibrar
          </button>
        </>
      ) : (
        <p>El rango cómodo se calibra al comenzar cada rutina y no se guarda.</p>
      )}

      <h2>Mi registro</h2>
      <p>Guarda la fecha, los ejercicios hechos, las repeticiones y cómo se sintió tu mano. También hace crecer tu jardín.</p>
      {borrado === 'confirmar' ? (
        <div className="confirmacion">
          <p ref={pregunta} tabIndex={-1}>
            ¿Quieres borrar tu registro? También se reiniciará tu jardín. Esto no se puede deshacer.
          </p>
          <div className="acciones">
            <button type="button" className="boton" onClick={confirmarBorrado}>
              Sí, borrar mi registro
            </button>
            <button type="button" className="boton boton--secundario" onClick={cancelarBorrado}>
              No, mantenerlo
            </button>
          </div>
        </div>
      ) : (
        <button ref={botonBorrar} type="button" className="boton boton--secundario" onClick={() => setBorrado('confirmar')}>
          Borrar mi registro
        </button>
      )}
      <p role="status" className="ajustes__estado">
        {borrado === 'listo' && 'Listo: tu registro se borró.'}
        {borrado === 'error' && 'No logré borrar el registro en este navegador. Puedes intentarlo de nuevo cuando quieras.'}
      </p>

      <button type="button" className="boton" onClick={onVolver}>
        Volver
      </button>
    </section>
  );
}
