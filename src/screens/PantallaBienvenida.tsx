import { Jardin } from '../components/Jardin';
import { Titulo } from '../components/Titulo';

export function PantallaBienvenida({ flores, onComenzar }: { flores: number; onComenzar: () => void }) {
  return (
    <section className="pantalla">
      <Titulo>Manos que Suenan</Titulo>
      <p className="destacado">Una rutina breve para mover tu mano, a tu ritmo, acompañada por la cámara.</p>
      <p>Dura unos 5 minutos.</p>
      <h2>Tu jardín</h2>
      <Jardin flores={flores} />
      <button type="button" className="boton" onClick={onComenzar}>
        Comenzar
      </button>
    </section>
  );
}
