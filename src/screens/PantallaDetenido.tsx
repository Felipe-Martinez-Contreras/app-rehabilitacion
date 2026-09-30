import { Titulo } from '../components/Titulo';

interface Props {
  onRetomar: () => void;
  onTerminar: () => void;
}

/** Tras "Detener": todo en pausa y la cámara apagada. Se retoma solo si la persona lo elige. */
export function PantallaDetenido({ onRetomar, onTerminar }: Props) {
  return (
    <section className="pantalla">
      <Titulo>Todo en pausa</Titulo>
      <p className="destacado">Está bien detenerse. La cámara está apagada y puedes tomarte el tiempo que necesites.</p>
      <p>
        Si sientes dolor, hormigueo o algo no se siente bien, es mejor terminar por hoy y consultarlo con tu kinesiólogo/a
        o tu equipo de salud.
      </p>
      <div className="acciones">
        <button type="button" className="boton" onClick={onRetomar}>
          Retomar
        </button>
        <button type="button" className="boton boton--secundario" onClick={onTerminar}>
          Terminar por hoy
        </button>
      </div>
    </section>
  );
}
