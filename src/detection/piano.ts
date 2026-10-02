import { DEDOS } from './metrics';
import type { Dedo } from './types';

/**
 * Piano de dedos: tocar con el pulgar índice → medio → anular → meñique.
 * Si toca otro dedo, no avanza (solo se repite la invitación). Cada vuelta
 * completa suma una vuelta. Los toques los confirma `procesarFotograma`
 * (histéresis, filtro de puño y palma de frente).
 */
export interface EstadoPiano {
  /** Índice en `DEDOS` del dedo que sigue. */
  siguiente: number;
  vueltas: number;
}

export const PIANO_INICIAL: EstadoPiano = { siguiente: 0, vueltas: 0 };

export function dedoSiguiente(estado: EstadoPiano): Dedo {
  return DEDOS[estado.siguiente];
}

export interface ResultadoToquePiano {
  estado: EstadoPiano;
  correcto: boolean;
  vueltaCompleta: boolean;
}

export function registrarToque(estado: EstadoPiano, dedo: Dedo): ResultadoToquePiano {
  if (dedo !== dedoSiguiente(estado)) return { estado, correcto: false, vueltaCompleta: false };
  const siguiente = estado.siguiente + 1;
  if (siguiente < DEDOS.length) return { estado: { ...estado, siguiente }, correcto: true, vueltaCompleta: false };
  return { estado: { siguiente: 0, vueltas: estado.vueltas + 1 }, correcto: true, vueltaCompleta: true };
}

/** Al perder la mano (más de 1,5 s) se reinicia la vuelta en curso; las vueltas completas se mantienen. */
export function reiniciarVuelta(estado: EstadoPiano): EstadoPiano {
  return estado.siguiente === 0 ? estado : { ...estado, siguiente: 0 };
}
