interface Props {
  activado: boolean;
  onCambiar: (activado: boolean) => void;
}

/**
 * Botón de sonido sí/no. Texto fijo "Sonido" con `aria-pressed` (el estado no se
 * repite en el texto, para que el lector de pantalla no anuncie algo contradictorio).
 * El estado se ve también en el ícono (ondas o tachado) y en el relleno, no solo en el color.
 */
export function BotonSonido({ activado, onCambiar }: Props) {
  return (
    <button type="button" className="boton boton--secundario boton-alternar" aria-pressed={activado} onClick={() => onCambiar(!activado)}>
      <svg className="boton__icono" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
        {activado ? <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /> : <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />}
      </svg>
      Sonido
    </button>
  );
}
