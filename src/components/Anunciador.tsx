import { useCallback, useEffect, useRef, useState } from 'react';

/** Como máximo un aviso de estado cada 2 s; las repeticiones siempre se anuncian. */
const MINIMO_ENTRE_AVISOS_MS = 2000;

export type Anunciar = (texto: string, siempre?: boolean) => void;

/**
 * Avisos para lectores de pantalla en una región `aria-live="polite"`.
 * Si llega un aviso antes de tiempo, se muestra al cumplirse el plazo
 * (solo el último, para no saturar).
 */
export function useAnunciador() {
  const [anuncio, setAnuncio] = useState({ texto: '', id: 0 });
  const ultimo = useRef(-Infinity);
  const pendiente = useRef<number | null>(null);

  const anunciar = useCallback<Anunciar>((texto, siempre = false) => {
    const emitir = () => {
      ultimo.current = performance.now();
      setAnuncio((a) => ({ texto, id: a.id + 1 }));
    };
    if (pendiente.current !== null) {
      window.clearTimeout(pendiente.current);
      pendiente.current = null;
    }
    const espera = MINIMO_ENTRE_AVISOS_MS - (performance.now() - ultimo.current);
    if (siempre || espera <= 0) {
      emitir();
    } else {
      pendiente.current = window.setTimeout(() => {
        pendiente.current = null;
        emitir();
      }, espera);
    }
  }, []);

  useEffect(
    () => () => {
      if (pendiente.current !== null) window.clearTimeout(pendiente.current);
    },
    [],
  );

  return { anuncio, anunciar };
}

/** Región de avisos, oculta a la vista. El `key` hace que un aviso repetido se vuelva a leer. */
export function RegionAvisos({ anuncio }: { anuncio: { texto: string; id: number } }) {
  return (
    <div className="solo-lector" role="status" aria-live="polite">
      <span key={anuncio.id}>{anuncio.texto}</span>
    </div>
  );
}
