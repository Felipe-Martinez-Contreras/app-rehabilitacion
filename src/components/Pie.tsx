import { useEffect, useRef, useState } from 'react';

export const MENSAJE_DERIVACION =
  'Esta app acompaña tu rutina; no reemplaza a tu kinesiólogo/a ni a tu equipo de salud. Si sientes dolor, hormigueo o algo no se siente bien, detente y consulta.';

/** El pie completo no ocupa más de esta fracción del alto de la ventana. */
const FRACCION_MAXIMA = 0.25;

/**
 * Pie con la derivación, siempre visible. Si el mensaje completo ocuparía más de
 * un cuarto del alto de la ventana (por la pantalla, el zoom o el tamaño de texto),
 * pasa a una sola línea que abre el diálogo con el mensaje completo.
 * Publica su alto en `--alto-pie`, para que nunca tape el elemento con foco.
 */
export function Pie({ onAbrirPrivacidad }: { onAbrirPrivacidad: () => void }) {
  const pie = useRef<HTMLElement>(null);
  const completo = useRef<HTMLParagraphElement>(null);
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    const elemento = pie.current;
    const texto = completo.current;
    if (!elemento || !texto) return;
    const raiz = document.documentElement;
    const medir = () => {
      // El mensaje completo sigue en el DOM (invisible) cuando el pie es compacto: así se
      // puede medir cuánto ocuparía y volver a mostrarlo cuando quepa.
      const estilos = getComputedStyle(elemento);
      const bordes = parseFloat(estilos.paddingTop) + parseFloat(estilos.paddingBottom) + parseFloat(estilos.borderTopWidth);
      setCompacto(texto.offsetHeight + bordes > window.innerHeight * FRACCION_MAXIMA);
      raiz.style.setProperty('--alto-pie', `${elemento.offsetHeight}px`);
    };
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    observador.observe(texto);
    window.addEventListener('resize', medir);
    medir();
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  return (
    <footer ref={pie} className={`pie${compacto ? ' pie--compacto' : ''}`}>
      <p ref={completo} className="pie__completo">
        {MENSAJE_DERIVACION}{' '}
        <button type="button" className="enlace" onClick={onAbrirPrivacidad}>
          Privacidad y ayuda
        </button>
      </p>
      {compacto && (
        <p className="pie__compacto">
          Si sientes dolor, detente y consulta ·{' '}
          <button type="button" className="enlace" onClick={onAbrirPrivacidad}>
            Más información
          </button>
        </p>
      )}
    </footer>
  );
}
