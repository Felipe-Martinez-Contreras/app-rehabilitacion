import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnilloProgreso, pintarAnillo } from '../components/AnilloProgreso';
import { Titulo } from '../components/Titulo';
import { CONFIG } from '../detection/config';
import { actualizarDescanso, descansoInicial, descansoTerminado, segundosRestantes } from '../detection/descanso';

/** Descanso de 20 s entre ejercicios, con "Pausar" y "Seguir ahora". */
export function PantallaDescanso({ onSeguir }: { onSeguir: () => void }) {
  const [enPausa, setEnPausa] = useState(false);
  const [segundos, setSegundos] = useState(CONFIG.descansoMs / 1000);
  const estado = useRef(descansoInicial(CONFIG.descansoMs));
  const anillo = useRef<SVGSVGElement>(null);
  const seguir = useRef(onSeguir);
  useLayoutEffect(() => {
    seguir.current = onSeguir;
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      estado.current = actualizarDescanso(estado.current, performance.now(), enPausa);
      pintarAnillo(anillo.current, 1 - estado.current.restanteMs / CONFIG.descansoMs);
      // React cambia solo una vez por segundo, cuando cambia el número.
      setSegundos(segundosRestantes(estado.current));
      if (descansoTerminado(estado.current)) {
        window.clearInterval(id);
        seguir.current();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [enPausa]);

  return (
    <section className="pantalla">
      <Titulo>Descanso</Titulo>
      <p className="destacado">Deja descansar tu mano. Suelta los hombros y respira con calma.</p>
      <div className="temporizador">
        <AnilloProgreso anilloRef={anillo} etiqueta="Tiempo de descanso transcurrido" />
        <p className="temporizador__texto">
          {segundos} {segundos === 1 ? 'segundo' : 'segundos'}
          {enPausa && ' · en pausa'}
        </p>
      </div>
      <div className="acciones">
        <button type="button" className="boton boton--secundario" onClick={() => setEnPausa((p) => !p)}>
          {enPausa ? 'Reanudar' : 'Pausar'}
        </button>
        <button type="button" className="boton" onClick={onSeguir}>
          Seguir ahora
        </button>
      </div>
    </section>
  );
}
