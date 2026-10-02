import type { CSSProperties, RefObject } from 'react';

const VARILLAS = 7;
/** Ángulo total del abanico desplegado, en grados. */
const APERTURA_MAXIMA = 150;

/**
 * Abanico SVG: se despliega con la variable CSS `--despliegue` (0 = plegado,
 * 1 = abierto), que avanza mientras la persona sostiene los dedos separados.
 */
export function Abanico({ abanicoRef, etiqueta }: { abanicoRef?: RefObject<SVGSVGElement | null>; etiqueta: string }) {
  return (
    <svg ref={abanicoRef} className="abanico" viewBox="0 0 200 130" role="img" aria-label={etiqueta}>
      {Array.from({ length: VARILLAS }, (_, i) => {
        // Cada varilla gira desde el centro: la del medio queda vertical.
        const fraccion = i / (VARILLAS - 1) - 0.5;
        return (
          <path
            key={i}
            className="abanico__varilla"
            style={{ '--giro': `${fraccion * APERTURA_MAXIMA}deg` } as CSSProperties}
            d="M100 120 L88 22 Q100 12 112 22 Z"
          />
        );
      })}
      <circle className="abanico__eje" cx="100" cy="120" r="7" />
    </svg>
  );
}

/** Actualiza el despliegue (0–1) desde el bucle de la cámara, sin re-renderizar React. */
export function pintarAbanico(abanico: SVGSVGElement | null, despliegue: number) {
  abanico?.style.setProperty('--despliegue', despliegue.toFixed(3));
}
