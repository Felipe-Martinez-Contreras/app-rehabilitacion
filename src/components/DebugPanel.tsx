import { useEffect, useRef, type RefObject } from 'react';
import { METRICAS_CON_VENTANA, type DatosDepuracion, type MetricaConVentana } from '../camera/useHandTracking';
import { CONFIG } from '../detection/config';
import { DEDOS } from '../detection/metrics';
import { signoDePalma } from '../detection/orientacion';
import type { ContextoSeguimiento } from '../detection/seguimiento';
import type { Orientacion } from '../detection/types';
import { umbralesFlor } from '../detection/umbrales';
import { CONFIANZAS_DETECTOR } from '../depuracion';

const NOMBRE_DEDO = { indice: 'índice', medio: 'medio', anular: 'anular', menique: 'meñique' } as const;
const NOMBRE_METRICA: Record<MetricaConVentana, string> = {
  apertura: 'apertura',
  flexion: 'flexión (°)',
  separacion: 'separación',
  toque: 'toque',
  orientacionZ: 'orientación z',
};
const NOMBRE_ORIENTACION: Record<Orientacion, string> = {
  palma: 'palma',
  dorso: 'dorso',
  'de-frente': 'de frente (palma o dorso: registra el signo para distinguir)',
  'de-canto': 'de canto',
};
const segundosVentana = CONFIG.ventanaDepuracionMs / 1000;

interface Props {
  datos: RefObject<DatosDepuracion>;
  contexto: RefObject<ContextoSeguimiento>;
  /** Con calibración, el signo de palma sale de ella y no se registra a mano. */
  calibrado: boolean;
}

/**
 * Panel de depuración (solo con ?debug=1). Lee los datos en vivo cada 250 ms
 * y escribe directamente en el DOM, sin re-renderizar React.
 */
export function DebugPanel({ datos, contexto, calibrado }: Props) {
  const salida = useRef<HTMLPreElement>(null);
  const mensaje = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const d = datos.current;
      const m = d.metricas;
      const ahora = performance.now();
      const f = (n: number | undefined, decimales = 3) => (n === undefined ? '—' : n.toFixed(decimales)).padStart(7);
      const decimales = (nombre: MetricaConVentana) => (nombre === 'flexion' ? 1 : 3);
      const cal = contexto.current.calibracion;
      const signo = cal?.signoPalma ?? contexto.current.signoPalmaDepuracion;
      const flor = cal ? umbralesFlor(cal) : null;
      const calibracion = cal
        ? [
            `calibración   apertura ${cal.aperturaMin.toFixed(3)}–${cal.aperturaMax.toFixed(3)} (rango ${(cal.aperturaMax - cal.aperturaMin).toFixed(3)}${cal.ampliado ? `, ampliado a ${CONFIG.calibracion.rangoMinimo}` : ''})`,
            `              separación máx ${cal.separacionMax.toFixed(3)} (solo referencia) · |z| palma ${cal.zPalma.toFixed(2)}${cal.zPalma < CONFIG.calibracion.zPalmaComoda ? ` (< ${CONFIG.calibracion.zPalmaComoda}: aviso)` : ''}`,
            `umbral flor   cerrada < ${flor!.cerrada.toFixed(3)} · abierta > ${flor!.abierta.toFixed(3)}`,
          ]
        : ['calibración   sin calibrar (se usan los valores por defecto)'];

      const filas = METRICAS_CON_VENTANA.map((nombre) => {
        const rango = d.ventanas[nombre].minMax(ahora);
        const dec = decimales(nombre);
        return `${NOMBRE_METRICA[nombre].padEnd(14)}${f(m?.[nombre], dec)}  ${f(rango?.min, dec)}  ${f(rango?.max, dec)}`;
      });

      if (salida.current) {
        salida.current.textContent = [
          `fps           ${d.fps.toFixed(1)}`,
          `mano          ${!d.manoDetectada ? 'no detectada' : d.lista ? 'detectada' : `detectada (ignorando los primeros ${CONFIG.ignorarAlDetectarMs} ms)`}`,
          `orientación   ${d.orientacion ? `${NOMBRE_ORIENTACION[d.orientacion]} · z ${m?.orientacionZ.toFixed(2)}` : '—'}`,
          `signo palma   ${signo === null ? 'sin registrar' : signo > 0 ? '+' : '−'}  (de canto si |z| < ${CONFIG.orientacion.minimoDeFrente})`,
          '',
          `métrica         actual  mín ${segundosVentana}s  máx ${segundosVentana}s`,
          ...filas,
          '',
          `flexión dedo  ${m ? DEDOS.map((dedo) => `${NOMBRE_DEDO[dedo]} ${m.flexionDedos[dedo].toFixed(0)}°`).join(' · ') : '—'}  (solo informativa)`,
          `filtro puño   ${m ? (d.abiertaParaToque ? 'abierta' : 'cerrada') : '—'}  (apertura > ${d.aperturaMinima.toFixed(3)} para empezar un toque${cal ? ', 60 % del rango' : ', sin calibrar'})`,
          `estado toque  ${m ? (d.tocando ? 'tocando' : 'soltado') : '—'}  (dedo más cercano: ${m ? NOMBRE_DEDO[m.dedoMasCercano] : '—'})`,
          `toques        ${d.toquesContados}`,
          '',
          ...calibracion,
          ...(d.pantalla.length ? ['', ...d.pantalla] : []),
          '',
          `umbral toque  entrar < ${CONFIG.toque.entrar} · salir > ${CONFIG.toque.salir} · confirmar ${CONFIG.confirmacionMs} ms`,
          `suavizado     alfa ${CONFIG.alfaSuavizado}`,
          `confianzas    det ${CONFIANZAS_DETECTOR.minHandDetectionConfidence} · pres ${CONFIANZAS_DETECTOR.minHandPresenceConfidence} · seg ${CONFIANZAS_DETECTOR.minTrackingConfidence}`,
        ].join('\n');
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [datos, contexto]);

  const reiniciar = () => {
    for (const nombre of METRICAS_CON_VENTANA) datos.current.ventanas[nombre].reiniciar();
    datos.current.toquesContados = 0;
  };

  // Mientras no exista la calibración, permite registrar el signo de la palma a mano.
  const registrarPalma = () => {
    const z = datos.current.metricas?.orientacionZ;
    const signo = z === undefined ? null : signoDePalma(z);
    if (mensaje.current) {
      mensaje.current.textContent =
        signo === null
          ? 'No pude registrarlo: muestra la palma de frente a la cámara y vuelve a intentarlo.'
          : `Signo de palma registrado: ${signo > 0 ? '+' : '−'}.`;
    }
    if (signo !== null) contexto.current.signoPalmaDepuracion = signo;
  };

  return (
    <section className="depuracion" aria-label="Panel de depuración">
      <h2>Depuración</h2>
      <pre ref={salida} />
      <div className="depuracion__acciones">
        <button type="button" className="boton boton--secundario" onClick={reiniciar}>
          Reiniciar mínimos, máximos y toques
        </button>
        {!calibrado && (
          <button type="button" className="boton boton--secundario" onClick={registrarPalma}>
            Registrar mi palma de frente
          </button>
        )}
      </div>
      <p ref={mensaje} role="status" />
    </section>
  );
}
