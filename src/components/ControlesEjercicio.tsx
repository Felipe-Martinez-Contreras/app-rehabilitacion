import { useEffect } from 'react';

/** Contador en texto ("3 de 5") con una barra de progreso accesible. */
export function Contador({ hechas, objetivo, nombre }: { hechas: number; objetivo: number; nombre: string }) {
  return (
    <div className="contador">
      <p className="contador__texto" aria-hidden="true">
        {hechas} de {objetivo}
      </p>
      <progress className="contador__barra" max={objetivo} value={hechas} aria-label={`${nombre}: ${hechas} de ${objetivo}`} />
    </div>
  );
}

interface AccionesProps {
  completo: boolean;
  onSeguir: () => void;
  onDetener: () => void;
  onSaltar: () => void;
}

/** "Seguir" al completar, "Detener" siempre visible y "Saltar este ejercicio" mientras no esté completo. */
export function AccionesEjercicio({ completo, onSeguir, onDetener, onSaltar }: AccionesProps) {
  useEscDetener(onDetener);
  return (
    <div className="acciones">
      {completo && (
        <button type="button" className="boton" onClick={onSeguir}>
          Seguir
        </button>
      )}
      <button type="button" className="boton boton--secundario" onClick={onDetener}>
        Detener
      </button>
      {!completo && (
        <button type="button" className="boton boton--secundario" onClick={onSaltar}>
          Saltar este ejercicio
        </button>
      )}
    </div>
  );
}

/** Esc equivale a "Detener" durante un ejercicio. */
function useEscDetener(onDetener: () => void) {
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDetener();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [onDetener]);
}
