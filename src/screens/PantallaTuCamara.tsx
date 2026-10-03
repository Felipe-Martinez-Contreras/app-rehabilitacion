import { Titulo } from '../components/Titulo';

export function PantallaTuCamara({ onActivar }: { onActivar: () => void }) {
  return (
    <section className="pantalla">
      <Titulo>Tu cámara</Titulo>
      <p className="destacado">
        Solo para ver el movimiento de tu mano. Todo se procesa en este dispositivo; ninguna imagen se guarda ni se
        envía.
      </p>
      <h2>Para que te vea mejor</h2>
      <ul className="consejos">
        <li>Ayuda tener la luz de frente, no detrás de ti.</li>
        <li>Tu mano se ve mejor a unos 40–60 cm de la cámara.</li>
        <li>Con la palma hacia la cámara.</li>
      </ul>
      <button type="button" className="boton" onClick={onActivar}>
        Activar cámara
      </button>
    </section>
  );
}
