import type { CSSProperties, RefObject } from 'react';

interface Props {
  petalos: number;
  encendidos: number;
  /** Texto alternativo; si falta, la flor es decorativa. */
  etiqueta?: string;
  /** Para seguir la apertura en vivo con `pintarFlor`. */
  florRef?: RefObject<SVGSVGElement | null>;
  /** Apertura fija (0–1) cuando no sigue a la mano, por ejemplo en una ilustración. */
  apertura?: number;
}

const PETALO = 'M100 100 C 78 72, 82 34, 100 18 C 118 34, 122 72, 100 100 Z';

/**
 * Flor SVG: sus pétalos se abren y cierran con la variable CSS `--apertura`
 * (0 = cerrada, 1 = abierta). Cada repetición deja un pétalo encendido, con
 * relleno y borde distintos (el contador en texto dice lo mismo).
 */
export function Flor({ petalos, encendidos, etiqueta, florRef, apertura }: Props) {
  const estilo = apertura === undefined ? undefined : ({ '--apertura': apertura } as CSSProperties);
  return (
    <svg
      ref={florRef}
      className="flor"
      viewBox="0 0 200 200"
      style={estilo}
      {...(etiqueta ? { role: 'img', 'aria-label': etiqueta } : { 'aria-hidden': true })}
    >
      {Array.from({ length: petalos }, (_, i) => (
        <g key={i} transform={`rotate(${(i * 360) / petalos} 100 100)`}>
          <path className={`flor__petalo${i < encendidos ? ' flor__petalo--encendido' : ''}`} d={PETALO} />
        </g>
      ))}
      <circle className="flor__centro" cx="100" cy="100" r="14" />
    </svg>
  );
}

/** Actualiza la apertura (0–1) desde el bucle de la cámara, sin re-renderizar React. */
export function pintarFlor(flor: SVGSVGElement | null, apertura: number) {
  flor?.style.setProperty('--apertura', apertura.toFixed(3));
}
