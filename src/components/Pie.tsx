import { useEffect, useRef } from 'react';

export const MENSAJE_DERIVACION =
  'Esta app acompaña tu rutina; no reemplaza a tu kinesiólogo/a ni a tu equipo de salud. Si sientes dolor, hormigueo o algo no se siente bien, detente y consulta.';

/**
 * Pie con la derivación, siempre visible. Con poca altura de ventana (por ejemplo,
 * zoom al 200 %) pasa a una sola línea que abre el diálogo con el mensaje completo.
 * Publica su alto en `--alto-pie`, para que nunca tape el elemento con foco.
 */
export function Pie({ onAbrirPrivacidad }: { onAbrirPrivacidad: () => void }) {
  const pie = useRef<HTMLElement>(null);

  useEffect(() => {
    const elemento = pie.current;
    if (!elemento) return;
    const raiz = document.documentElement;
    const observador = new ResizeObserver(() => {
      raiz.style.setProperty('--alto-pie', `${elemento.offsetHeight}px`);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <footer ref={pie} className="pie">
      <p className="pie__completo">
        {MENSAJE_DERIVACION}{' '}
        <button type="button" className="enlace" onClick={onAbrirPrivacidad}>
          Privacidad y ayuda
        </button>
      </p>
      <p className="pie__compacto">
        Si sientes dolor, detente y consulta ·{' '}
        <button type="button" className="enlace" onClick={onAbrirPrivacidad}>
          Más información
        </button>
      </p>
    </footer>
  );
}
