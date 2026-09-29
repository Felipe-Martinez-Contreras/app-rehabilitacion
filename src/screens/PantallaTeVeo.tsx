import { useRef } from 'react';
import type { ErrorCamara, EstadoCamara } from '../camera/useCamera';
import { useHandTracking, type AvisoMano } from '../camera/useHandTracking';
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

const TITULOS_ERROR: Record<ErrorCamara, string> = {
  permiso: 'Necesito tu permiso',
  'sin-camara': 'No encuentro una cámara',
  ocupada: 'La cámara está ocupada',
  inseguro: 'Se necesita una conexión segura',
  desconocido: 'No logré encender la cámara',
};

function tituloPara(camara: EstadoCamara): string {
  switch (camara.tipo) {
    case 'activa':
      return 'Te veo';
    case 'error':
      return TITULOS_ERROR[camara.error];
    case 'apagada':
      return 'Tu cámara está apagada';
    case 'solicitando':
      return 'Tu cámara';
  }
}

const TEXTOS_AVISO: Record<AvisoMano, string> = {
  lista: 'Te veo. Cuando quieras, seguimos.',
  girada: 'Cuando quieras, vuelve a mostrar la palma a la cámara.',
  'sin-mano': 'No alcanzo a ver tu mano. Puedes acercarla un poco, con la palma hacia la cámara.',
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
  const { estadoModelo, aviso, reintentarModelo, depuracion, contexto } = useHandTracking(
    videoRef,
    canvasRef,
    activa,
  );

  const titulo = tituloPara(camara);
  const textoAviso =activa && estadoModelo === 'listo' ? TEXTOS_AVISO[aviso] : '';

  return (
    <section className="pantalla pantalla--camara">
      {/* La key hace que el título se monte de nuevo y reciba el foco al cambiar de estado. */}
      <Titulo key={titulo}>{titulo}</Titulo>

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
        {textoAviso}
      </p>

      {depurar && activa && <DebugPanel datos={depuracion} contexto={contexto} />}
    </section>
  );
}
