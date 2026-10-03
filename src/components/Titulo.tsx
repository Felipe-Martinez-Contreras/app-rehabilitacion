import { useEffect, useRef, type ReactNode } from 'react';
import { guiaVoz } from '../voz/guiaVoz';

/**
 * h1 de cada pantalla: recibe el foco al aparecer, para lectores de pantalla y teclado.
 * El foco no desplaza la página (en celular, la cámara queda arriba a la vista); solo
 * se desplaza lo mínimo si el título no se ve.
 */
export function Titulo({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const titulo = ref.current;
    if (!titulo) return;
    titulo.focus({ preventScroll: true });
    titulo.scrollIntoView({ block: 'nearest' });
    // Si la guía por voz está activa, lee el título y la instrucción de la pantalla.
    guiaVoz.leerPantalla(titulo);
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1}>
      {children}
    </h1>
  );
}
