import { useRef } from 'react';
import type { ErrorCamara, EstadoCamara } from '../camera/useCamera';
import { useHandTracking } from '../camera/useHandTracking';
import { CameraView } from '../components/CameraView';
import { DebugPanel } from '../components/DebugPanel';
import { Titulo } from '../components/Titulo';

const MENSAJES_ERROR: Record<ErrorCamara, string> = {
  permiso:
    'No tengo permiso para usar la cámara. Puedes habilitarlo desde el ícono de cámara o de candado, junto a la dirección de la página, y luego pulsar "Reintentar".',
  'sin-camara': 'No encuentro una cámara en este dispositivo. Si tienes una externa, puedes conectarla y pulsar "Reintentar".',
  ocupada:
    'Parece que otra aplicación está usando la cámara, por ejemplo una videollamada. Cuando la cierres, puedes pulsar "Reintentar".',
  inseguro:
    'Para usar la cámara, esta página necesita abrirse con una conexión segura (https) o desde localhost. Cuando la abras así, puedes pulsar "Reintentar".',
  desconocido: 'No logré encender la cámara. Puedes intentarlo de nuevo cuando quieras.',
};

interface Props {
  camara: EstadoCamara;
  onEncender: () => void;
  onApagar: () => void;
  depurar: boolean;
}

export function PantallaTeVeo({ camara, onEncender, onApagar, depurar }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activa = camara.tipo === 'activa';
  const { estadoModelo, manoVisible, reintentarModelo, depuracion } = useHandTracking(videoRef, canvasRef, activa);

  let aviso = '';
  if (activa && estadoModelo === 'listo') {
    aviso = manoVisible
      ? 'Te veo. Cuando quieras, seguimos.'
      : 'No alcanzo a ver tu mano. Puedes acercarla un poco, con la palma hacia la cámara.';
  }

  return (
    <section className="pantalla pantalla--camara">
      <Titulo>Te veo</Titulo>

      {camara.tipo === 'solicitando' && <p>Esperando el permiso de la cámara…</p>}

      {camara.tipo === 'apagada' && (
        <>
          <p>La cámara está apagada. Puedes encenderla cuando quieras.</p>
          <button type="button" className="boton" onClick={onEncender}>
            Activar cámara
          </button>
        </>
      )}

      {camara.tipo === 'error' && (
        <>
          <p>{MENSAJES_ERROR[camara.error]}</p>
          <button type="button" className="boton" onClick={onEncender}>
            Reintentar
          </button>
        </>
      )}

      {activa && (
        <>
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

          <CameraView stream={camara.stream} videoRef={videoRef} canvasRef={canvasRef} />

          {estadoModelo === 'cargando' && <p>Preparando…</p>}
          {estadoModelo === 'error' && (
            <>
              <p>No logré preparar el reconocimiento de la mano. Puedes intentarlo de nuevo cuando quieras.</p>
              <button type="button" className="boton" onClick={reintentarModelo}>
                Reintentar
              </button>
            </>
          )}
        </>
      )}

      <p className="aviso-mano" role="status" aria-live="polite">
        {aviso}
      </p>

      {depurar && activa && <DebugPanel datos={depuracion} />}
    </section>
  );
}
