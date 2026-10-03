/**
 * Ajustes de la persona (clave `mqs:ajustes`). Solo preferencias: nunca medidas
 * de la mano ni datos personales. Todo lo leído se valida campo a campo; lo que
 * no sea válido vuelve a su valor por defecto.
 */
export type Intensidad = 'suave' | 'habitual';

/** Tamaños de texto de A− / A+: del 100 % al 150 %. */
export const ESCALAS_TEXTO = [1, 1.125, 1.25, 1.375, 1.5] as const;

export interface Ajustes {
  sonido: boolean;
  /** Guía por voz (apagada por defecto). */
  voz: boolean;
  /** null: aún no se eligió, se sigue la preferencia del sistema (prefers-contrast: more). */
  altoContraste: boolean | null;
  /** Índice en ESCALAS_TEXTO. */
  tamanoTexto: number;
  intensidad: Intensidad;
  inicioConGesto: boolean;
  /** Ver solo el trazo de la mano, sin la imagen de la cámara. */
  soloTrazo: boolean;
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  sonido: true,
  voz: false,
  altoContraste: null,
  tamanoTexto: 0,
  intensidad: 'suave',
  inicioConGesto: true,
  soloTrazo: false,
};

const booleano = (x: unknown, porDefecto: boolean) => (typeof x === 'boolean' ? x : porDefecto);

export function validarAjustes(x: unknown): Ajustes {
  if (typeof x !== 'object' || x === null) return AJUSTES_POR_DEFECTO;
  const a = x as Record<string, unknown>;
  const d = AJUSTES_POR_DEFECTO;
  const tamano = a.tamanoTexto;
  return {
    sonido: booleano(a.sonido, d.sonido),
    voz: booleano(a.voz, d.voz),
    altoContraste: typeof a.altoContraste === 'boolean' ? a.altoContraste : null,
    tamanoTexto:
      typeof tamano === 'number' && Number.isInteger(tamano) && tamano >= 0 && tamano < ESCALAS_TEXTO.length
        ? tamano
        : d.tamanoTexto,
    intensidad: a.intensidad === 'habitual' || a.intensidad === 'suave' ? a.intensidad : d.intensidad,
    inicioConGesto: booleano(a.inicioConGesto, d.inicioConGesto),
    soloTrazo: booleano(a.soloTrazo, d.soloTrazo),
  };
}
