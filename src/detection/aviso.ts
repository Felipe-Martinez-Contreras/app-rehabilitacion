import { CONFIG } from './config';

/**
 * Aviso que ve la persona sobre su mano. Cambia solo cuando la situación se
 * mantiene un tiempo, para no parpadear ni re-renderizar en cada fotograma.
 * - 'esperando': al empezar, todavía sin aviso.
 * - 'sin-mano': "No alcanzo a ver tu mano…" (tras `sinManoMs`; pausa los temporizadores).
 * - 'girada': "Cuando quieras, vuelve a mostrar la palma a la cámara".
 * - 'lista': la mano se ve con la palma de frente (o de frente, sin calibrar).
 */
export type AvisoMano = 'esperando' | 'sin-mano' | 'girada' | 'lista';

/** Lo que se observa en un fotograma. */
export type ObservacionMano = 'sin-mano' | 'girada' | 'lista';

export interface EstadoAviso {
  mostrado: AvisoMano;
  /** Observación en curso y desde cuándo se mantiene sin interrupción. */
  observado: ObservacionMano;
  desde: number;
  /** Desde cuándo se muestra 'lista' (para "Te veo" con la mano estable). */
  listaDesde: number | null;
}

export function avisoInicial(t: number): EstadoAviso {
  return { mostrado: 'esperando', observado: 'sin-mano', desde: t, listaDesde: null };
}

function retardo(observado: ObservacionMano, mostrado: AvisoMano): number {
  if (observado === 'sin-mano') return CONFIG.avisos.sinManoMs;
  // Al aparecer la mano, el aviso de mano perdida se quita de inmediato.
  if (observado === 'lista' && (mostrado === 'sin-mano' || mostrado === 'esperando')) return 0;
  return CONFIG.avisos.cambioMs;
}

export function actualizarAviso(estado: EstadoAviso, t: number, observado: ObservacionMano): EstadoAviso {
  const desde = observado === estado.observado ? estado.desde : t;
  if (observado === estado.mostrado || t - desde < retardo(observado, estado.mostrado)) {
    return desde === estado.desde && observado === estado.observado ? estado : { ...estado, observado, desde };
  }
  return { mostrado: observado, observado, desde, listaDesde: observado === 'lista' ? t : null };
}

/** La mano se muestra 'lista' desde hace al menos `estableMs` ("Te veo"). */
export function manoEstable(estado: EstadoAviso, t: number): boolean {
  return estado.listaDesde !== null && t - estado.listaDesde >= CONFIG.avisos.estableMs;
}

/** Los temporizadores de los ejercicios se pausan mientras se muestra "No alcanzo a ver tu mano". */
export function temporizadoresEnPausa(estado: EstadoAviso): boolean {
  return estado.mostrado === 'sin-mano';
}
