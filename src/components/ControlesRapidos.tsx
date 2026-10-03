import type { ReactNode } from 'react';

/** Tamaños de texto de A− / A+: del 100 % al 150 %. */
export const ESCALAS_TEXTO = [1, 1.125, 1.25, 1.375, 1.5] as const;

interface Props {
  altoContraste: boolean;
  onAltoContraste: (activo: boolean) => void;
  escala: number;
  onEscala: (indice: number) => void;
  /** Botón de sonido (y, en la parte B, Ajustes). */
  children?: ReactNode;
}

/**
 * Controles rápidos del encabezado. Los botones de alternancia usan texto fijo con
 * `aria-pressed`; A− y A+ muestran su texto visible al comienzo de su nombre accesible.
 */
export function ControlesRapidos({ altoContraste, onAltoContraste, escala, onEscala, children }: Props) {
  const ultimo = ESCALAS_TEXTO.length - 1;
  return (
    <div className="encabezado__controles">
      <button
        type="button"
        className="boton boton--secundario boton-alternar"
        aria-pressed={altoContraste}
        onClick={() => onAltoContraste(!altoContraste)}
      >
        <svg className="boton__icono" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          {/* Medio círculo relleno: el estado se ve también en el relleno del botón. */}
          <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
        </svg>
        Alto contraste
      </button>
      {/* aria-disabled (no disabled): así el foco no se pierde al llegar al límite. */}
      <button
        type="button"
        className="boton boton--secundario"
        aria-disabled={escala === 0}
        onClick={() => escala > 0 && onEscala(escala - 1)}
      >
        A−<span className="solo-lector"> texto más pequeño</span>
      </button>
      <button
        type="button"
        className="boton boton--secundario"
        aria-disabled={escala === ultimo}
        onClick={() => escala < ultimo && onEscala(escala + 1)}
      >
        A+<span className="solo-lector"> texto más grande</span>
      </button>
      {children}
    </div>
  );
}
