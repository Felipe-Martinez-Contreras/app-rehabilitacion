import { useEffect, useRef, type ReactNode } from 'react';

/** h1 de cada pantalla: recibe el foco al aparecer, para lectores de pantalla y teclado. */
export function Titulo({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1}>
      {children}
    </h1>
  );
}
