import { useCallback, useEffect, useRef, useState } from 'react';
import { useCamera } from './camera/useCamera';
import { useHandTracking, type AvisoMano } from './camera/useHandTracking';
import { Abanico } from './components/Abanico';
import { RegionAvisos, useAnunciador } from './components/Anunciador';
import { BotonSonido } from './components/BotonSonido';
import { DisenoCamara } from './components/DisenoCamara';
import { Flor } from './components/Flor';
import { ManoPiano } from './components/ManoPiano';
import { DEPURAR } from './depuracion';
import type { Calibracion, RangoSeparacion } from './detection/types';
import { INTENSIDAD_SUAVE, type Ejercicio, type Resumen } from './rutina';
import { PantallaAbanico } from './screens/PantallaAbanico';
import { PantallaBienvenida } from './screens/PantallaBienvenida';
import { PantallaCamaraInactiva } from './screens/PantallaCamaraInactiva';
import { PantallaCierre } from './screens/PantallaCierre';
import { PantallaComoSeSintio, type Sensacion } from './screens/PantallaComoSeSintio';
import { PantallaDescanso } from './screens/PantallaDescanso';
import { PantallaDetenido } from './screens/PantallaDetenido';
import { PantallaFlor } from './screens/PantallaFlor';
import { PantallaPiano } from './screens/PantallaPiano';
import { PantallaRangoComodo } from './screens/PantallaRangoComodo';
import { PantallaTeVeo } from './screens/PantallaTeVeo';
import { PantallaTodoListo } from './screens/PantallaTodoListo';
import { PantallaTuCamara } from './screens/PantallaTuCamara';
import { useSonido } from './sound/useSonido';

type Pantalla =
  | 'bienvenida'
  | 'tu-camara'
  | 'te-veo'
  | 'rango-comodo'
  | 'todo-listo-flor'
  | 'flor'
  | 'descanso-1'
  | 'todo-listo-piano'
  | 'piano'
  | 'descanso-2'
  | 'todo-listo-abanico'
  | 'abanico'
  | 'detenido'
  | 'como-se-sintio'
  | 'cierre';

/** Pantallas que usan la cámara; al salir de ellas se apaga. */
const CON_CAMARA: ReadonlySet<Pantalla> = new Set([
  'te-veo',
  'rango-comodo',
  'todo-listo-flor',
  'flor',
  'descanso-1',
  'todo-listo-piano',
  'piano',
  'descanso-2',
  'todo-listo-abanico',
  'abanico',
]);

/** Lo que sigue a cada ejercicio (al completarlo o al saltarlo). */
const DESPUES_DE: Record<Ejercicio, Pantalla> = { flor: 'descanso-1', piano: 'descanso-2', abanico: 'como-se-sintio' };

const SIN_SALTADOS: readonly Ejercicio[] = [];

const FASE_EJERCICIO: Record<Ejercicio, number> = { flor: 2, piano: 3, abanico: 4 };

const FASE: Partial<Record<Pantalla, number>> = {
  bienvenida: 1,
  'tu-camara': 1,
  'te-veo': 1,
  'rango-comodo': 1,
  'todo-listo-flor': 2,
  flor: 2,
  'descanso-1': 2,
  'todo-listo-piano': 3,
  piano: 3,
  'descanso-2': 3,
  'todo-listo-abanico': 4,
  abanico: 4,
  'como-se-sintio': 5,
  cierre: 5,
};

/** Avisos de la mano que se anuncian a lectores de pantalla ("Te veo" lo anuncia su pantalla). */
const ANUNCIOS_AVISO: Partial<Record<AvisoMano, string>> = {
  'sin-mano': 'No alcanzo a ver tu mano. Puedes acercarla un poco, con la palma hacia la cámara.',
  girada: 'Cuando quieras, vuelve a mostrar la palma a la cámara.',
};

const RESUMEN_INICIAL: Resumen = { flor: 0, piano: 0, abanico: 0 };

export function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('bienvenida');
  const [calibracion, setCalibracion] = useState<Calibracion | null>(null);
  const [rangoAbanico, setRangoAbanico] = useState<RangoSeparacion | null>(null);
  const [resumen, setResumen] = useState<Resumen>(RESUMEN_INICIAL);
  const [saltados, setSaltados] = useState(SIN_SALTADOS);
  const [detenido, setDetenido] = useState<Ejercicio>('flor');
  const [terminadaAntes, setTerminadaAntes] = useState(false);
  // Se guardará en el registro local en el Hito 4.
  const [, setSensacion] = useState<Sensacion | null>(null);
  const { estado: camara, encender, apagar } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seguimiento = useHandTracking(videoRef, canvasRef, camara.tipo === 'activa');
  const { anuncio, anunciar } = useAnunciador();
  const sonido = useSonido();
  const { silenciar } = sonido;
  const conCamara = CON_CAMARA.has(pantalla);
  const enDescanso = pantalla === 'descanso-1' || pantalla === 'descanso-2';

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
    if (conCamara && !enDescanso && texto) anunciar(texto);
  }, [aviso, conCamara, enDescanso, anunciar]);

  const activarCamara = () => {
    setPantalla('te-veo');
    void encender();
  };

  const detenerEn = useCallback(
    (ejercicio: Ejercicio) => {
      // "Detener" pausa todo: la cámara se apaga al cambiar de pantalla y el sonido se silencia aquí.
      silenciar();
      setDetenido(ejercicio);
      setPantalla('detenido');
    },
    [silenciar],
  );
  const detenerFlor = useCallback(() => detenerEn('flor'), [detenerEn]);
  const detenerPiano = useCallback(() => detenerEn('piano'), [detenerEn]);
  const detenerAbanico = useCallback(() => detenerEn('abanico'), [detenerEn]);

  const retomar = () => {
    setPantalla(detenido);
    void encender();
  };

  const terminarPorHoy = () => {
    setTerminadaAntes(true);
    setPantalla('como-se-sintio');
  };

  const volverAlInicio = () => {
    setResumen(RESUMEN_INICIAL);
    setSaltados(SIN_SALTADOS);
    sonido.borrarMelodia();
    setRangoAbanico(null);
    setTerminadaAntes(false);
    setSensacion(null);
    setPantalla('bienvenida');
  };

  const contar = (ejercicio: Ejercicio) => (total: number) => setResumen((r) => ({ ...r, [ejercicio]: total }));

  /** "Saltar este ejercicio": se anota para el resumen del cierre y se pasa a lo que sigue. */
  const saltar = (ejercicio: Ejercicio) => () => {
    setSaltados((s) => (s.includes(ejercicio) ? s : [...s, ejercicio]));
    setPantalla(DESPUES_DE[ejercicio]);
  };

  const contenidoConCamara = () => {
    if (pantalla === 'te-veo') {
      return <PantallaTeVeo seguimiento={seguimiento} anunciar={anunciar} onSeguir={() => setPantalla('rango-comodo')} />;
    }
    if (pantalla === 'rango-comodo') {
      return (
        <PantallaRangoComodo
          seguimiento={seguimiento}
          anunciar={anunciar}
          onCalibrada={setCalibracion}
          onSeguir={() => setPantalla('todo-listo-flor')}
        />
      );
    }
    if (pantalla === 'descanso-1') return <PantallaDescanso key="1" onSeguir={() => setPantalla('todo-listo-piano')} />;
    if (pantalla === 'descanso-2') return <PantallaDescanso key="2" onSeguir={() => setPantalla('todo-listo-abanico')} />;
    if (!calibracion) return null;

    switch (pantalla) {
      case 'todo-listo-flor':
        return (
          <PantallaTodoListo
            key="flor"
            seguimiento={seguimiento}
            calibracion={calibracion}
            frase="Ahora, la flor: abre y cierra la mano con calma. Cada vez que la abras, se enciende un pétalo."
            ilustracion={<Flor petalos={INTENSIDAD_SUAVE.flor} encendidos={0} apertura={0.8} etiqueta="Ilustración de una flor abierta" />}
            onComenzar={() => setPantalla('flor')}
          />
        );
      case 'flor':
        return (
          <PantallaFlor
            seguimiento={seguimiento}
            calibracion={calibracion}
            anunciar={anunciar}
            sonido={sonido}
            objetivo={INTENSIDAD_SUAVE.flor}
            inicial={resumen.flor}
            onRepeticion={contar('flor')}
            onSeguir={() => setPantalla(DESPUES_DE.flor)}
            onDetener={detenerFlor}
            onSaltar={saltar('flor')}
          />
        );
      case 'todo-listo-piano':
        return (
          <PantallaTodoListo
            key="piano"
            seguimiento={seguimiento}
            calibracion={calibracion}
            frase="Ahora, el piano de dedos: toca con el pulgar la punta del índice, el medio, el anular y el meñique, en ese orden."
            ilustracion={<ManoPiano destacado="indice" />}
            onComenzar={() => setPantalla('piano')}
          />
        );
      case 'piano':
        return (
          <PantallaPiano
            seguimiento={seguimiento}
            anunciar={anunciar}
            sonido={sonido}
            objetivo={INTENSIDAD_SUAVE.pianoVueltas}
            inicial={resumen.piano}
            onVuelta={contar('piano')}
            onSeguir={() => setPantalla(DESPUES_DE.piano)}
            onDetener={detenerPiano}
            onSaltar={saltar('piano')}
          />
        );
      case 'todo-listo-abanico':
        return (
          <PantallaTodoListo
            key="abanico"
            seguimiento={seguimiento}
            calibracion={calibracion}
            frase="Ahora, el abanico: separa los dedos hasta tu rango cómodo y sostén unos segundos. Antes conoceremos tu movimiento."
            ilustracion={<Abanico etiqueta="Ilustración de un abanico" />}
            onComenzar={() => setPantalla('abanico')}
          />
        );
      case 'abanico':
        return (
          <PantallaAbanico
            seguimiento={seguimiento}
            calibracion={calibracion}
            anunciar={anunciar}
            sonido={sonido}
            objetivo={INTENSIDAD_SUAVE.abanico}
            inicial={resumen.abanico}
            rango={rangoAbanico}
            onRango={setRangoAbanico}
            onRepeticion={contar('abanico')}
            onSeguir={() => setPantalla(DESPUES_DE.abanico)}
            onDetener={detenerAbanico}
            onSaltar={saltar('abanico')}
          />
        );
      default:
        return null;
    }
  };

  const fase = pantalla === 'detenido' ? FASE_EJERCICIO[detenido] : FASE[pantalla];

  return (
    <div className="app">
      <header className="encabezado">
        <p className="encabezado__nombre">Manos que Suenan</p>
        {fase !== undefined && <p className="encabezado__fase">Fase {fase} de 5</p>}
        <BotonSonido activado={sonido.activado} onCambiar={sonido.setActivado} />
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
              mostrarAvisos={!enDescanso}
            >
              {contenidoConCamara()}
            </DisenoCamara>
          ) : (
            <PantallaCamaraInactiva camara={camara} onEncender={() => void encender()} />
          ))}
        {pantalla === 'detenido' && <PantallaDetenido onRetomar={retomar} onTerminar={terminarPorHoy} />}
        {pantalla === 'como-se-sintio' && (
          <PantallaComoSeSintio onElegir={setSensacion} onSeguir={() => setPantalla('cierre')} />
        )}
        {pantalla === 'cierre' && <PantallaCierre resumen={resumen} saltados={saltados} sonido={sonido} terminadaAntes={terminadaAntes} onVolver={volverAlInicio} />}
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
