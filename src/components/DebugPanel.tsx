import { useEffect, useRef, type RefObject } from 'react';
import type { DatosDepuracion } from '../camera/useHandTracking';
import { CONFIG } from '../detection/config';

const NOMBRE_DEDO = { indice: 'índice', medio: 'medio', anular: 'anular', menique: 'meñique' } as const;

/**
 * Panel de depuración (solo con ?debug=1). Lee los datos en vivo cada 250 ms
 * y escribe directamente en el DOM, sin re-renderizar React.
 */
export function DebugPanel({ datos }: { datos: RefObject<DatosDepuracion> }) {
  const salida = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const d = datos.current;
      const m = d.metricas;
      const f = (n: number | undefined) => (n === undefined ? '—' : n.toFixed(3));
      if (salida.current) {
        salida.current.textContent = [
          `fps           ${d.fps.toFixed(1)}`,
          `mano          ${d.manoDetectada ? 'detectada' : 'no detectada'}`,
          `apertura      ${f(m?.apertura)}`,
          `separación    ${f(m?.separacion)}`,
          `toque         ${f(m?.toque)}  (dedo más cercano: ${m ? NOMBRE_DEDO[m.dedoMasCercano] : '—'})`,
          `estado toque  ${m ? (d.tocando ? 'tocando' : 'soltado') : '—'}`,
          '',
          `umbral toque  entrar < ${CONFIG.toque.entrar} · salir > ${CONFIG.toque.salir}`,
          `suavizado     alfa ${CONFIG.alfaSuavizado} · confirmar ${CONFIG.fotogramasConfirmacion} fotogramas`,
        ].join('\n');
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [datos]);

  return (
    <section className="depuracion" aria-label="Panel de depuración">
      <h2>Depuración</h2>
      <pre ref={salida} />
    </section>
  );
}
