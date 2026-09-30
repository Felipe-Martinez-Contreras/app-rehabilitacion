import { Titulo } from '../components/Titulo';

export function PantallaBienvenida({ onComenzar }: { onComenzar: () => void }) {
  return (
    <section className="pantalla">
      <Titulo>Manos que Suenan</Titulo>
      <p className="destacado">Una rutina breve para mover tu mano, a tu ritmo, acompañada por la cámara.</p>
      <p>Dura unos 5 minutos.</p>
      <h2>Tu jardín</h2>
      {/* El jardín se guardará en este dispositivo en el Hito 4. */}
      <p>Aquí crecerá una flor por cada rutina que completes. Tus flores nunca se marchitan.</p>
      <button type="button" className="boton" onClick={onComenzar}>
        Comenzar
      </button>
    </section>
  );
}
