import type { ReactNode, RefObject } from 'react';
import type { AvisoMano, SeguimientoMano } from '../camera/useHandTracking';
import { CameraView } from './CameraView';
import { DebugPanel } from './DebugPanel';

/** Avisos visibles bajo la cámara. "Te veo" lo dice la pantalla "Te veo". */
const TEXTOS_AVISO: Record<AvisoMano, string> = {
  esperando: '',
  lista: '',
  girada: 'Cuando quieras, vuelve a mostrar la palma a la cámara.',
  'sin-mano': 'No alcanzo a ver tu mano. Puedes acercarla un poco, con la palma hacia la cámara.',
};

interface Props {
  stream: MediaStream;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  seguimiento: SeguimientoMano;
  onApagar: () => void;
  depurar: boolean;
  calibrado: boolean;
  /** En el descanso no se necesita ver la mano: sin avisos de mano perdida o girada. */
  mostrarAvisos: boolean;
  /** Contenido de la pantalla (con su h1). */
  children: ReactNode;
}

/**
 * Diseño de las pantallas con cámara: la vista queda montada al pasar de una
 * pantalla a otra (no se reinicia la detección). En celular, la cámara arriba y
 * la instrucción abajo; en escritorio, lado a lado.
 */
export function DisenoCamara(props: Props) {
  const { stream, videoRef, canvasRef, seguimiento, onApagar, depurar, calibrado, mostrarAvisos, children } = props;
  const { estadoModelo, aviso, reintentarModelo, depuracion, contexto } = seguimiento;
  return (
    <div className="con-camara">
      <div className="con-camara__vista">
        <div className="indicador-camara">
          <span className="indicador-camara__texto">
            <svg className="indicador-camara__icono" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="6" />
            </svg>
            Cámara activa · procesamiento local
          </span>
          <button type="button" className="boton boton--secundario" onClick={onApagar}>
            Apagar cámara
          </button>
        </div>

        <CameraView stream={stream} videoRef={videoRef} canvasRef={canvasRef} />

        {estadoModelo === 'cargando' && <p className="aviso-mano">Preparando…</p>}
        {estadoModelo === 'error' && (
          <>
            <p className="aviso-mano">
              No logré preparar el reconocimiento de la mano. Puedes intentarlo de nuevo cuando quieras.
            </p>
            <button type="button" className="boton" onClick={reintentarModelo}>
              Reintentar
            </button>
          </>
        )}
        {estadoModelo === 'listo' && <p className="aviso-mano">{mostrarAvisos ? TEXTOS_AVISO[aviso] : ''}</p>}
      </div>

      <div className="con-camara__contenido">{children}</div>

      {depurar && <DebugPanel datos={depuracion} contexto={contexto} calibrado={calibrado} />}
    </div>
  );
}
