import type { RefObject } from 'react';

interface Props {
  anilloRef: RefObject<SVGSVGElement | null>;
  /** Nombre accesible de la barra de progreso. */
  etiqueta: string;
}

/**
 * Anillo de progreso circular. Se actualiza con `pintarAnillo` desde el bucle de
 * la cámara, sin re-renderizar React.
 */
export function AnilloProgreso({ anilloRef, etiqueta }: Props) {
  return (
    <svg
      ref={anilloRef}
      className="anillo"
      viewBox="0 0 100 100"
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <circle className="anillo__fondo" cx="50" cy="50" r="42" pathLength={100} />
      <circle className="anillo__avance" cx="50" cy="50" r="42" pathLength={100} />
    </svg>
  );
}

/** Pinta el avance (0–1). El valor accesible cambia de a 10 % para no saturar. */
export function pintarAnillo(anillo: SVGSVGElement | null, fraccion: number) {
  if (!anillo) return;
  anillo.style.setProperty('--progreso', fraccion.toFixed(3));
  const valor = String(Math.floor(fraccion * 10) * 10);
  if (anillo.getAttribute('aria-valuenow') !== valor) anillo.setAttribute('aria-valuenow', valor);
}
