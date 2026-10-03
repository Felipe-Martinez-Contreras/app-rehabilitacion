import { useCallback, useEffect, useRef, useState } from 'react';
import { useCamera } from './camera/useCamera';
import { useHandTracking, type AvisoMano } from './camera/useHandTracking';
import { Abanico } from './components/Abanico';
import { RegionAvisos, useAnunciador } from './components/Anunciador';
import { BotonSonido } from './components/BotonSonido';
import { ControlesRapidos } from './components/ControlesRapidos';
import { DialogoPrivacidad } from './components/DialogoPrivacidad';
import { Pie } from './components/Pie';
import { DisenoCamara } from './components/DisenoCamara';
import { Flor } from './components/Flor';
import { ManoPiano } from './components/ManoPiano';
import { DEPURAR } from './depuracion';
import type { Calibracion, RangoSeparacion } from './detection/types';
import { ESCALAS_TEXTO, type Ajustes } from './guardado/ajustes';
import { borrarRegistro, guardarAjustes, guardarRegistro, leerAjustes, leerRegistro } from './guardado/almacen';
import { floresDelJardin, rutinaDaFlor } from './guardado/jardin';
import { agregarEntrada, crearEntrada, type Sensacion } from './guardado/registro';
import { INTENSIDADES, type Ejercicio, type Resumen } from './rutina';
import { PantallaAjustes } from './screens/PantallaAjustes';
import { PantallaAbanico } from './screens/PantallaAbanico';
import { PantallaBienvenida } from './screens/PantallaBienvenida';
import { PantallaCamaraInactiva } from './screens/PantallaCamaraInactiva';
import { PantallaCierre } from './screens/PantallaCierre';
import { PantallaComoSeSintio } from './screens/PantallaComoSeSintio';
import { PantallaDescanso } from './screens/PantallaDescanso';
import { PantallaDetenido } from './screens/PantallaDetenido';
import { PantallaFlor } from './screens/PantallaFlor';
import { PantallaPiano } from './screens/PantallaPiano';
import { PantallaRangoComodo } from './screens/PantallaRangoComodo';
import { PantallaTeVeo } from './screens/PantallaTeVeo';
import { PantallaTodoListo } from './screens/PantallaTodoListo';
import { PantallaTuCamara } from './screens/PantallaTuCamara';
import { useSonido } from './sound/useSonido';
import { guiaVoz, useVozEspanol } from './voz/guiaVoz';

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
  | 'cierre'
  | 'ajustes';

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

/** Ejercicio en curso o por venir en cada pantalla de la rutina (para pausar y recalibrar). */
const EJERCICIO_DE: Partial<Record<Pantalla, Ejercicio>> = {
  'todo-listo-flor': 'flor',
  flor: 'flor',
  'descanso-1': 'piano',
  'todo-listo-piano': 'piano',
  piano: 'piano',
  'descanso-2': 'abanico',
  'todo-listo-abanico': 'abanico',
  abanico: 'abanico',
};

const TODO_LISTO: Record<Ejercicio, Pantalla> = { flor: 'todo-listo-flor', piano: 'todo-listo-piano', abanico: 'todo-listo-abanico' };

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

/** Al inicio, el alto contraste respeta la preferencia del sistema (prefers-contrast: more). */
const prefiereMasContraste = () => window.matchMedia?.('(prefers-contrast: more)').matches ?? false;

export function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('bienvenida');
  const [ajustes, setAjustes] = useState<Ajustes>(() => leerAjustes());
  const [registro, setRegistro] = useState(() => leerRegistro());
  const [privacidadAbierta, setPrivacidadAbierta] = useState(false);
  /** Adónde vuelve "Volver" de Ajustes. */
  const [trasAjustes, setTrasAjustes] = useState<Pantalla>('bienvenida');
  /** Adónde sigue la calibración: el primer ejercicio, o el que estaba en pausa al recalibrar. */
  const [trasCalibrar, setTrasCalibrar] = useState<Pantalla>('todo-listo-flor');
  /** Objetivo de cada ejercicio, fijado al comenzarlo (un cambio de intensidad rige desde el siguiente). */
  const [objetivos, setObjetivos] = useState<Resumen>(() => INTENSIDADES[ajustes.intensidad]);
  const registrada = useRef(false);
  /** Ejercicios ya comenzados en esta rutina: su objetivo no cambia aunque se recalibre o cambie la intensidad. */
  const comenzados = useRef(new Set<Ejercicio>());
  const altoContraste = ajustes.altoContraste ?? prefiereMasContraste();
  const escalaTexto = ajustes.tamanoTexto;
  const [calibracion, setCalibracion] = useState<Calibracion | null>(null);
  const [rangoAbanico, setRangoAbanico] = useState<RangoSeparacion | null>(null);
  const [resumen, setResumen] = useState<Resumen>(RESUMEN_INICIAL);
  const [saltados, setSaltados] = useState(SIN_SALTADOS);
  const [detenido, setDetenido] = useState<Ejercicio>('flor');
  const [terminadaAntes, setTerminadaAntes] = useState(false);
  const [sensacion, setSensacion] = useState<Sensacion | null>(null);
  const { estado: camara, encender, apagar } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seguimiento = useHandTracking(videoRef, canvasRef, camara.tipo === 'activa');
  const { anuncio, anunciar } = useAnunciador();
  const sonido = useSonido(ajustes.sonido);
  const { silenciar } = sonido;
  const voz = useVozEspanol();
  const conCamara = CON_CAMARA.has(pantalla);
  const enDescanso = pantalla === 'descanso-1' || pantalla === 'descanso-2';

  // Alto contraste y tamaño de texto se aplican en la raíz: todo usa sus tokens y rem.
  useEffect(() => {
    const raiz = document.documentElement;
    if (altoContraste) raiz.dataset.contraste = 'alto';
    else delete raiz.dataset.contraste;
  }, [altoContraste]);

  useEffect(() => {
    document.documentElement.style.setProperty('--escala', String(ESCALAS_TEXTO[escalaTexto]));
  }, [escalaTexto]);

  /** Cada cambio de ajustes se aplica y se guarda al momento (si el navegador lo permite). */
  const cambiarAjustes = useCallback((cambios: Partial<Ajustes>) => {
    setAjustes((actuales) => {
      const nuevos = { ...actuales, ...cambios };
      guardarAjustes(nuevos);
      return nuevos;
    });
  }, []);

  useEffect(() => {
    guiaVoz.configurar(ajustes.voz, voz);
  }, [ajustes.voz, voz]);

  // Al ocultar la pestaña, la guía por voz se calla (la cámara y el sonido también se detienen).
  useEffect(() => {
    const alCambiar = () => {
      if (document.visibilityState === 'hidden') guiaVoz.callar();
    };
    document.addEventListener('visibilitychange', alCambiar);
    return () => document.removeEventListener('visibilitychange', alCambiar);
  }, []);

  const cambiarEscala = (indice: number) => {
    cambiarAjustes({ tamanoTexto: indice });
    anunciar(`Texto al ${Math.round(ESCALAS_TEXTO[indice] * 100)} %`, true);
  };

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
      // "Detener" pausa todo: la cámara se apaga al cambiar de pantalla; el sonido y la voz se silencian aquí.
      silenciar();
      guiaVoz.callar();
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

  /** Abrir Ajustes pausa todo, como "Detener"; "Volver" regresa a la pausa del ejercicio (o a la pantalla anterior). */
  const abrirAjustes = () => {
    if (pantalla === 'ajustes') return;
    silenciar();
    guiaVoz.callar();
    const ejercicio = EJERCICIO_DE[pantalla];
    if (ejercicio) {
      setDetenido(ejercicio);
      setTrasAjustes('detenido');
    } else {
      setTrasAjustes(pantalla);
    }
    setPantalla('ajustes');
  };

  /** "Recalibrar": repite la calibración dentro de la sesión y vuelve al ejercicio que estaba en pausa. */
  const recalibrar = () => {
    setCalibracion(null);
    setRangoAbanico(null);
    setTrasCalibrar(trasAjustes === 'detenido' ? TODO_LISTO[detenido] : 'todo-listo-flor');
    setPantalla('rango-comodo');
    void encender();
  };

  const borrarMiRegistro = () => {
    const ok = borrarRegistro();
    if (ok) setRegistro([]);
    return ok;
  };

  /** Al comenzar un ejercicio se fija su objetivo con la intensidad de ese momento. */
  const comenzar = (ejercicio: Ejercicio) => {
    if (!comenzados.current.has(ejercicio)) {
      comenzados.current.add(ejercicio);
      setObjetivos((o) => ({ ...o, [ejercicio]: INTENSIDADES[ajustes.intensidad][ejercicio] }));
    }
    setPantalla(ejercicio);
  };

  // Al llegar al cierre (por el flujo normal o con "Terminar por hoy"), se anota la rutina una vez.
  useEffect(() => {
    if (pantalla !== 'cierre' || registrada.current) return;
    registrada.current = true;
    const entrada = crearEntrada(new Date(), { calibrada: calibracion !== null, repeticiones: resumen, objetivos, sensacion });
    setRegistro((anterior) => {
      const nuevo = agregarEntrada(anterior, entrada);
      guardarRegistro(nuevo);
      return nuevo;
    });
  }, [pantalla, calibracion, resumen, objetivos, sensacion]);

  const volverAlInicio = () => {
    registrada.current = false;
    comenzados.current.clear();
    setCalibracion(null);
    setTrasCalibrar('todo-listo-flor');
    setObjetivos(INTENSIDADES[ajustes.intensidad]);
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
          onSeguir={() => setPantalla(trasCalibrar)}
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
            ilustracion={
              <Flor petalos={INTENSIDADES[ajustes.intensidad].flor} encendidos={0} apertura={0.8} etiqueta="Ilustración de una flor abierta" />
            }
            gesto={ajustes.inicioConGesto}
            onComenzar={() => comenzar('flor')}
          />
        );
      case 'flor':
        return (
          <PantallaFlor
            seguimiento={seguimiento}
            calibracion={calibracion}
            anunciar={anunciar}
            sonido={sonido}
            objetivo={objetivos.flor}
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
            gesto={ajustes.inicioConGesto}
            onComenzar={() => comenzar('piano')}
          />
        );
      case 'piano':
        return (
          <PantallaPiano
            seguimiento={seguimiento}
            anunciar={anunciar}
            sonido={sonido}
            objetivo={objetivos.piano}
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
            gesto={ajustes.inicioConGesto}
            onComenzar={() => comenzar('abanico')}
          />
        );
      case 'abanico':
        return (
          <PantallaAbanico
            seguimiento={seguimiento}
            calibracion={calibracion}
            anunciar={anunciar}
            sonido={sonido}
            objetivo={objetivos.abanico}
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
        <div className="encabezado__contenido">
          <div className="encabezado__titulo">
            <p className="encabezado__nombre">Manos que Suenan</p>
            {fase !== undefined && <p className="encabezado__fase">Fase {fase} de 5</p>}
          </div>
          <ControlesRapidos
            altoContraste={altoContraste}
            onAltoContraste={(activo) => cambiarAjustes({ altoContraste: activo })}
            escala={escalaTexto}
            onEscala={cambiarEscala}
          >
            <BotonSonido activado={ajustes.sonido} onCambiar={(activo) => cambiarAjustes({ sonido: activo })} />
            <button type="button" className="boton boton--secundario" onClick={abrirAjustes}>
              Ajustes
            </button>
          </ControlesRapidos>
        </div>
      </header>

      <main className="principal">
        {pantalla === 'bienvenida' && (
          <PantallaBienvenida flores={floresDelJardin(registro)} onComenzar={() => setPantalla('tu-camara')} />
        )}
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
              soloTrazo={ajustes.soloTrazo}
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
        {pantalla === 'cierre' && (
          <PantallaCierre
            resumen={resumen}
            saltados={saltados}
            sonido={sonido}
            terminadaAntes={terminadaAntes}
            florNueva={rutinaDaFlor(resumen)}
            onVolver={volverAlInicio}
          />
        )}
        {pantalla === 'ajustes' && (
          <PantallaAjustes
            ajustes={ajustes}
            onCambiar={cambiarAjustes}
            vozDisponible={voz !== null}
            puedeRecalibrar={calibracion !== null && (trasAjustes === 'detenido' || CON_CAMARA.has(trasAjustes))}
            onRecalibrar={recalibrar}
            onBorrarRegistro={borrarMiRegistro}
            onVolver={() => setPantalla(trasAjustes)}
          />
        )}
      </main>

      <RegionAvisos anuncio={anuncio} />

      <Pie onAbrirPrivacidad={() => setPrivacidadAbierta(true)} />
      <DialogoPrivacidad abierto={privacidadAbierta} onCerrar={() => setPrivacidadAbierta(false)} />
    </div>
  );
}
