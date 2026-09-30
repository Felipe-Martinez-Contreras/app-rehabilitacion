import { useCallback, useEffect, useRef, useState } from 'react';
import { useCamera } from './camera/useCamera';
import { useHandTracking, type AvisoMano } from './camera/useHandTracking';
import { RegionAvisos, useAnunciador } from './components/Anunciador';
import { DisenoCamara } from './components/DisenoCamara';
import { Flor } from './components/Flor';
import { DEPURAR } from './depuracion';
import type { Calibracion } from './detection/types';
import { INTENSIDAD_SUAVE } from './rutina';
import { PantallaBienvenida } from './screens/PantallaBienvenida';
import { PantallaCamaraInactiva } from './screens/PantallaCamaraInactiva';
import { PantallaDetenido } from './screens/PantallaDetenido';
import { PantallaFinProvisional } from './screens/PantallaFinProvisional';
import { PantallaFlor } from './screens/PantallaFlor';
import { PantallaRangoComodo } from './screens/PantallaRangoComodo';
import { PantallaTeVeo } from './screens/PantallaTeVeo';
import { PantallaTodoListo } from './screens/PantallaTodoListo';
import { PantallaTuCamara } from './screens/PantallaTuCamara';

type Pantalla =
  | 'bienvenida'
  | 'tu-camara'
  | 'te-veo'
  | 'rango-comodo'
  | 'todo-listo-flor'
  | 'flor'
  | 'detenido'
  | 'fin-provisional';

/** Pantallas que usan la cámara; al salir de ellas se apaga. */
const CON_CAMARA: ReadonlySet<Pantalla> = new Set(['te-veo', 'rango-comodo', 'todo-listo-flor', 'flor']);

const FASE: Partial<Record<Pantalla, number>> = {
  bienvenida: 1,
  'tu-camara': 1,
  'te-veo': 1,
  'rango-comodo': 1,
  'todo-listo-flor': 2,
  flor: 2,
  detenido: 2,
};

/** Avisos de la mano que se anuncian a lectores de pantalla ("Te veo" lo anuncia su pantalla). */
const ANUNCIOS_AVISO: Partial<Record<AvisoMano, string>> = {
  'sin-mano': 'No alcanzo a ver tu mano. Puedes acercarla un poco, con la palma hacia la cámara.',
  girada: 'Cuando quieras, vuelve a mostrar la palma a la cámara.',
};

export function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('bienvenida');
  const [calibracion, setCalibracion] = useState<Calibracion | null>(null);
  const [florHechas, setFlorHechas] = useState(0);
  const { estado: camara, encender, apagar } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seguimiento = useHandTracking(videoRef, canvasRef, camara.tipo === 'activa');
  const { anuncio, anunciar } = useAnunciador();
  const conCamara = CON_CAMARA.has(pantalla);

  // La calibración llega al seguimiento por ref: el bucle de la cámara la lee en cada fotograma.
  useEffect(() => {
    seguimiento.contexto.current.calibracion = calibracion;
  }, [seguimiento.contexto, calibracion]);

  // Al salir de las pantallas con cámara (cierre, "Detener", volver al inicio), se apaga.
  useEffect(() => {
    if (!conCamara) apagar();
  }, [conCamara, apagar]);

  const { aviso } = seguimiento;
  useEffect(() => {
    const texto = ANUNCIOS_AVISO[aviso];
    if (conCamara && texto) anunciar(texto);
  }, [aviso, conCamara, anunciar]);

  const activarCamara = () => {
    setPantalla('te-veo');
    void encender();
  };

  const detener = useCallback(() => setPantalla('detenido'), []);

  const retomar = () => {
    setPantalla('flor');
    void encender();
  };

  const volverAlInicio = () => {
    setFlorHechas(0);
    setPantalla('bienvenida');
  };

  const contenidoConCamara = () => {
    if (!calibracion && pantalla !== 'te-veo' && pantalla !== 'rango-comodo') return null;
    switch (pantalla) {
      case 'te-veo':
        return <PantallaTeVeo seguimiento={seguimiento} anunciar={anunciar} onSeguir={() => setPantalla('rango-comodo')} />;
      case 'rango-comodo':
        return (
          <PantallaRangoComodo
            seguimiento={seguimiento}
            anunciar={anunciar}
            onCalibrada={setCalibracion}
            onSeguir={() => setPantalla('todo-listo-flor')}
          />
        );
      case 'todo-listo-flor':
        return (
          <PantallaTodoListo
            seguimiento={seguimiento}
            calibracion={calibracion!}
            frase="Ahora, la flor: abre y cierra la mano con calma. Cada vez que la abras, se enciende un pétalo."
            ilustracion={<Flor petalos={INTENSIDAD_SUAVE.flor} encendidos={0} apertura={0.8} etiqueta="Ilustración de una flor abierta" />}
            onComenzar={() => setPantalla('flor')}
          />
        );
      case 'flor':
        return (
          <PantallaFlor
            seguimiento={seguimiento}
            calibracion={calibracion!}
            anunciar={anunciar}
            objetivo={INTENSIDAD_SUAVE.flor}
            inicial={florHechas}
            onRepeticion={setFlorHechas}
            onSeguir={() => setPantalla('fin-provisional')}
            onDetener={detener}
            onSaltar={() => setPantalla('fin-provisional')}
          />
        );
      default:
        return null;
    }
  };

  const fase = FASE[pantalla];

  return (
    <div className="app">
      <header className="encabezado">
        <p className="encabezado__nombre">Manos que Suenan</p>
        {fase !== undefined && <p className="encabezado__fase">Fase {fase} de 5</p>}
      </header>

      <main className="principal">
        {pantalla === 'bienvenida' && <PantallaBienvenida onComenzar={() => setPantalla('tu-camara')} />}
        {pantalla === 'tu-camara' && <PantallaTuCamara onActivar={activarCamara} />}
        {conCamara &&
          (camara.tipo === 'activa' ? (
            <DisenoCamara
              stream={camara.stream}
              videoRef={videoRef}
              canvasRef={canvasRef}
              seguimiento={seguimiento}
              onApagar={apagar}
              depurar={DEPURAR}
              calibrado={calibracion !== null}
            >
              {contenidoConCamara()}
            </DisenoCamara>
          ) : (
            <PantallaCamaraInactiva camara={camara} onEncender={() => void encender()} />
          ))}
        {pantalla === 'detenido' && <PantallaDetenido onRetomar={retomar} onTerminar={() => setPantalla('fin-provisional')} />}
        {pantalla === 'fin-provisional' && <PantallaFinProvisional florHechas={florHechas} onVolver={volverAlInicio} />}
      </main>

      <RegionAvisos anuncio={anuncio} />

      <footer className="pie">
        <p>
          Esta app acompaña tu rutina; no reemplaza a tu kinesiólogo/a ni a tu equipo de salud. Si sientes dolor,
          hormigueo o algo no se siente bien, detente y consulta.
        </p>
      </footer>
    </div>
  );
}
