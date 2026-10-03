import { useEffect, useRef } from 'react';
import { MENSAJE_DERIVACION } from './Pie';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * "Privacidad y ayuda": `<dialog>` modal nativo. Atrapa el foco mientras está
 * abierto, se cierra con Esc o con "Cerrar", y devuelve el foco al control que lo abrió.
 */
export function DialogoPrivacidad({ abierto, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const anterior = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) {
      anterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
    } else if (!abierto && d.open) {
      d.close();
    }
  }, [abierto]);

  const alCerrar = () => {
    onCerrar();
    anterior.current?.focus();
  };

  return (
    <dialog ref={dialogo} className="dialogo" aria-labelledby="dialogo-privacidad-titulo" onClose={alCerrar}>
      <h2 id="dialogo-privacidad-titulo">Privacidad y ayuda</h2>

      <h3>Tu cámara</h3>
      <p>
        La cámara se usa solo para ver el movimiento de tu mano. Todo se procesa en este dispositivo: ninguna imagen se
        graba, se guarda ni se envía. Solo se analiza la mano, nunca el rostro.
      </p>
      <p>
        La cámara se enciende solo cuando tú lo eliges y se apaga al terminar, al pulsar "Detener" y cuando cambias de
        pestaña. Mientras está encendida verás el aviso "Cámara activa · procesamiento local", con un botón para apagarla.
      </p>

      <h3>Qué se guarda y cómo borrarlo</h3>
      <p>
        En este dispositivo se guardan solo tus ajustes y un registro simple de cada rutina: la fecha, los ejercicios
        hechos, las repeticiones y cómo se sintió tu mano. Las medidas de tu mano no se guardan: el rango cómodo se
        calcula de nuevo en cada sesión. No se piden nombres ni correos.
      </p>
      <p>Puedes borrar el registro cuando quieras desde Ajustes, con "Borrar mi registro".</p>

      <h3>Cuida tu mano</h3>
      <p className="destacado">{MENSAJE_DERIVACION}</p>
      <p>Esta app no diagnostica ni mide de forma clínica: los valores que muestra son solo referenciales.</p>

      <form method="dialog">
        <button type="submit" className="boton">
          Cerrar
        </button>
      </form>
    </dialog>
  );
}
