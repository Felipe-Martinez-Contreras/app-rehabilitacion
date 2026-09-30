import { Titulo } from '../components/Titulo';

/**
 * Provisional (Hito 2, parte A): ocupa el lugar de los descansos, el piano, el
 * abanico y el cierre, que llegan en la parte B.
 */
export function PantallaFinProvisional({ florHechas, onVolver }: { florHechas: number; onVolver: () => void }) {
  return (
    <section className="pantalla">
      <Titulo>Por ahora, hasta aquí</Titulo>
      <p className="destacado">
        La flor: {florHechas} {florHechas === 1 ? 'repetición' : 'repeticiones'}. Pronto se sumarán el piano de dedos y
        el abanico.
      </p>
      <p>La cámara está apagada.</p>
      <button type="button" className="boton" onClick={onVolver}>
        Volver al inicio
      </button>
    </section>
  );
}
