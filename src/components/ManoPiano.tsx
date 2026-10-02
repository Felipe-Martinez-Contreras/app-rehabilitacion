import type { Dedo } from '../detection/types';

export const NOMBRE_DEDO: Record<Dedo, string> = {
  indice: 'índice',
  medio: 'medio',
  anular: 'anular',
  menique: 'meñique',
};

/** Dedos de la ilustración: posición x, alto y punta (y) de cada uno. */
const DEDOS_SVG: { dedo: Dedo; x: number; y: number; alto: number }[] = [
  { dedo: 'indice', x: 38, y: 28, alto: 62 },
  { dedo: 'medio', x: 62, y: 18, alto: 72 },
  { dedo: 'anular', x: 86, y: 26, alto: 64 },
  { dedo: 'menique', x: 110, y: 44, alto: 48 },
];

/**
 * Ilustración de una mano con el dedo que sigue destacado (relleno, borde
 * grueso y un anillo en la punta: no depende solo del color).
 */
export function ManoPiano({ destacado }: { destacado: Dedo }) {
  return (
    <svg className="mano-piano" viewBox="0 0 150 190" role="img" aria-label={`Ilustración de una mano con el dedo ${NOMBRE_DEDO[destacado]} destacado`}>
      <rect className="mano-piano__palma" x="30" y="84" width="96" height="84" rx="30" />
      <rect className="mano-piano__dedo" x="4" y="100" width="22" height="58" rx="11" transform="rotate(-30 15 150)" />
      {DEDOS_SVG.map(({ dedo, x, y, alto }) => (
        <g key={dedo}>
          <rect
            className={`mano-piano__dedo${dedo === destacado ? ' mano-piano__dedo--destacado' : ''}`}
            x={x - 10}
            y={y}
            width="20"
            height={alto + 20}
            rx="10"
          />
          {dedo === destacado && <circle className="mano-piano__anillo" cx={x} cy={y + 8} r="14" />}
        </g>
      ))}
    </svg>
  );
}
