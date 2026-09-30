import type { ErrorCamara, EstadoCamara } from '../camera/useCamera';
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

type CamaraInactiva = Exclude<EstadoCamara, { tipo: 'activa' }>;

function tituloPara(camara: CamaraInactiva): string {
  switch (camara.tipo) {
    case 'error':
      return TITULOS_ERROR[camara.error];
    case 'apagada':
      return 'Tu cámara está apagada';
    case 'solicitando':
      return 'Tu cámara';
  }
}

interface Props {
  camara: CamaraInactiva;
  onEncender: () => void;
}

/** Cámara esperando el permiso, apagada o con error, en cualquier pantalla que la necesita. */
export function PantallaCamaraInactiva({ camara, onEncender }: Props) {
  const titulo = tituloPara(camara);
  return (
    <section className="pantalla">
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
    </section>
  );
}
