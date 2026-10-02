import { Flor } from '../components/Flor';
import { Titulo } from '../components/Titulo';
import { lineasResumen, type Ejercicio, type Resumen } from '../rutina';

interface Props {
  resumen: Resumen;
  /** Ejercicios en los que se pulsó "Saltar este ejercicio". */
  saltados: readonly Ejercicio[];
  /** La persona eligió "Terminar por hoy" desde "Detener". */
  terminadaAntes: boolean;
  onVolver: () => void;
}

/**
 * Cierre: mensaje final, resumen de cada ejercicio y la flor nueva del jardín.
 * La cámara ya está apagada. "Escuchar la melodía de hoy" llega con el sonido (Hito 3)
 * y el jardín se guardará en el dispositivo en el Hito 4.
 */
export function PantallaCierre({ resumen, saltados, terminadaAntes, onVolver }: Props) {
  return (
    <section className="pantalla">
      {terminadaAntes ? (
        <>
          <Titulo>Por hoy, suficiente</Titulo>
          <p className="destacado">Hiciste lo que tu mano pidió hoy. Vuelve cuando quieras, a tu propio ritmo.</p>
        </>
      ) : (
        <>
          <Titulo>Rutina completa</Titulo>
          <p className="destacado">Rutina completa. Hoy tu mano hizo música. Vuelve cuando quieras, a tu propio ritmo.</p>
        </>
      )}
      <h2>Lo que hiciste hoy</h2>
      <ul className="resumen">
        {lineasResumen(resumen, saltados).map((linea) => (
          <li key={linea}>{linea}</li>
        ))}
      </ul>
      {!terminadaAntes && (
        <div className="flor-nueva">
          <Flor petalos={5} encendidos={5} apertura={1} etiqueta="Tu flor nueva, con todos sus pétalos encendidos" />
          <p>Una flor nueva para tu jardín.</p>
        </div>
      )}
      <p>La cámara está apagada.</p>
      <button type="button" className="boton" onClick={onVolver}>
        Volver al inicio
      </button>
    </section>
  );
}
