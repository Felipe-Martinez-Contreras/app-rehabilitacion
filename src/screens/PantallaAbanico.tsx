import { useEffect, useRef, useState } from 'react';
import { useFotograma, type SeguimientoMano } from '../camera/useHandTracking';
import { Abanico, pintarAbanico } from '../components/Abanico';
import { AnilloProgreso, pintarAnillo } from '../components/AnilloProgreso';
import type { Anunciar } from '../components/Anunciador';
import { AccionesEjercicio, Contador } from '../components/ControlesEjercicio';
import { Titulo } from '../components/Titulo';
import {
  ABANICO_INICIAL,
  actualizarAbanico,
  actualizarCalibracionAbanico,
  CALIBRACION_ABANICO_INICIAL,
  esperandoPosturaAbanico,
  evaluarCalibracionAbanico,
  manoValidaAbanico,
} from '../detection/abanico';
import { CONFIG } from '../detection/config';
import { progreso } from '../detection/sostener';
import type { Calibracion, RangoSeparacion } from '../detection/types';
import { volumenAcorde } from '../sound/acorde';
import type { Sonido } from '../sound/useSonido';
import { umbralesAbanico } from '../detection/umbrales';

const INSTRUCCION_CALIBRACION = {
  juntos: 'Cuando quieras, junta los dedos con suavidad, con la mano extendida y la palma hacia la cámara.',
  separados: 'Ahora sepáralos hasta donde te sea cómodo.',
} as const;

type Fase = 'calibrando' | 'repetir' | 'ejercicio';

interface Props {
  seguimiento: SeguimientoMano;
  calibracion: Calibracion;
  anunciar: Anunciar;
  sonido: Sonido;
  objetivo: number;
  /** Repeticiones ya hechas (al retomar después de "Detener"). */
  inicial: number;
  /** Rango de la minicalibración, si ya se hizo (al retomar no se repite). */
  rango: RangoSeparacion | null;
  onRango: (rango: RangoSeparacion) => void;
  onRepeticion: (total: number) => void;
  onSeguir: () => void;
  onDetener: () => void;
  onSaltar: () => void;
}

/**
 * El abanico (fase 4): primero una minicalibración (dedos juntos y separados,
 * 3 s cada una); luego separar los dedos y sostener 3 s. Si suelta antes, el
 * tiempo se pausa sin penalización; juntar los dedos prepara la siguiente.
 */
export function PantallaAbanico(props: Props) {
  const { seguimiento, calibracion, anunciar, sonido, objetivo, inicial, rango, onRango, onRepeticion, onSeguir, onDetener, onSaltar } =
    props;
  const [fase, setFase] = useState<Fase>(rango ? 'ejercicio' : 'calibrando');
  const [postura, setPostura] = useState<'juntos' | 'separados'>('juntos');
  const [intento, setIntento] = useState(1);
  const [armado, setArmado] = useState(false);
  const [hechas, setHechas] = useState(inicial);
  const total = useRef(inicial);
  const calibrando = useRef(CALIBRACION_ABANICO_INICIAL);
  const ejercicio = useRef(ABANICO_INICIAL);
  const anillo = useRef<SVGSVGElement>(null);
  const abanico = useRef<SVGSVGElement>(null);
  const datos = seguimiento.depuracion;
  const completo = hechas >= objetivo;

  useFotograma(seguimiento, ({ t, resultado: r }) => {
    const m = r.estado.suavizadas;
    const valida = manoValidaAbanico(m, r.puedeContar, calibracion);

    if (fase === 'calibrando') {
      const anterior = calibrando.current;
      const actual = actualizarCalibracionAbanico(anterior, t, m, valida);
      calibrando.current = actual;
      pintarAnillo(anillo.current, progreso(actual.sostener, CONFIG.abanico.calibracionSostenerMs));
      datos.current.pantalla = [
        `abanico       minicalibración intento ${intento} · postura ${actual.postura}${esperandoPosturaAbanico(actual, t) ? ' (esperando)' : ''}${valida ? '' : ' · no válida (palma, apertura o mano)'}`,
        `              sostenido ${Math.round(actual.sostener.acumuladoMs)} ms · muestras juntos ${actual.juntos.length} · separados ${actual.separados.length}`,
      ];
      if (actual.postura === anterior.postura) return;
      if (actual.postura === 'separados') {
        setPostura('separados');
        anunciar(INSTRUCCION_CALIBRACION.separados, true);
        return;
      }
      const evaluado = evaluarCalibracionAbanico(actual, intento);
      if (evaluado.tipo === 'repetir') {
        setFase('repetir');
        return;
      }
      onRango(evaluado.rango);
      setFase('ejercicio');
      return;
    }

    if (fase !== 'ejercicio' || !rango || total.current >= objetivo) return;
    const anterior = ejercicio.current;
    const ra = actualizarAbanico(anterior, t, m, valida, rango);
    ejercicio.current = ra.estado;
    const avance = progreso(ra.estado.sostener, CONFIG.abanico.sostenerMs);
    pintarAnillo(anillo.current, avance);
    // El acorde crece con el temporizador; al soltar se desvanece y al volver retoma.
    sonido.acorde(volumenAcorde(avance, ra.estado.sostener.ultimoT !== null));
    // Tras completar, queda desplegado hasta que junta los dedos para la siguiente.
    pintarAbanico(abanico.current, ra.estado.armado ? avance : ra.repeticion || total.current > 0 ? 1 : 0);
    if (ra.estado.armado !== anterior.armado) setArmado(ra.estado.armado);

    const u = umbralesAbanico(rango);
    datos.current.pantalla = [
      `abanico       rango ${rango.juntos.toFixed(3)}–${rango.separados.toFixed(3)}${rango.ampliado ? ` (ampliado a ${CONFIG.abanico.rangoMinimo})` : ''} · juntos < ${u.juntos.toFixed(3)} · separados > ${u.separados.toFixed(3)}`,
      `              ${ra.estado.separados.activo ? 'separados' : 'juntos'} · ${ra.estado.armado ? 'preparado' : 'junta los dedos para preparar'} · sostenido ${Math.round(ra.estado.sostener.acumuladoMs)} ms · ${total.current} de ${objetivo}${valida ? '' : ' · en pausa (palma, apertura o mano)'}`,
    ];

    if (!ra.repeticion) return;
    total.current++;
    setHechas(total.current);
    onRepeticion(total.current);
    sonido.campana();
    const fin = total.current >= objetivo ? ' El abanico está completo.' : '';
    anunciar(`Repetición ${total.current} de ${objetivo}.${fin}`, true);
  });

  const { acorde } = sonido;
  useEffect(() => {
    const d = datos.current;
    return () => {
      d.pantalla = [];
      // Al salir del ejercicio, el acorde se desvanece.
      acorde(0);
    };
  }, [datos, acorde]);

  const intentarDeNuevo = () => {
    calibrando.current = CALIBRACION_ABANICO_INICIAL;
    setIntento((n) => n + 1);
    setPostura('juntos');
    setFase('calibrando');
  };

  const acciones = <AccionesEjercicio completo={completo} onSeguir={onSeguir} onDetener={onDetener} onSaltar={onSaltar} />;

  if (fase === 'repetir') {
    return (
      <section className="pantalla">
        <Titulo key="repetir">El abanico</Titulo>
        <p className="destacado">Puedes intentarlo de nuevo, sin forzar; buscamos tu movimiento cómodo de hoy.</p>
        <button type="button" className="boton" onClick={intentarDeNuevo}>
          Intentar de nuevo
        </button>
        {acciones}
      </section>
    );
  }

  if (fase === 'calibrando') {
    return (
      <section className="pantalla">
        <Titulo key={`calibrar-${intento}`}>El abanico</Titulo>
        <p className="paso">Antes de empezar, conozcamos tu movimiento · postura {postura === 'juntos' ? 1 : 2} de 2</p>
        <p className="destacado">{INSTRUCCION_CALIBRACION[postura]}</p>
        <div className="progreso-postura">
          <AnilloProgreso key={postura} anilloRef={anillo} etiqueta={`Postura ${postura === 'juntos' ? 1 : 2} sostenida`} />
          <p>Cuando llegues a la postura, sostenla unos segundos. El anillo avanza mientras la sostienes.</p>
        </div>
        {acciones}
      </section>
    );
  }

  return (
    <section className="pantalla">
      <Titulo key="ejercicio">El abanico</Titulo>
      {rango?.ampliado && !completo && (
        <p>Tu movimiento de hoy es pequeño, y está bien. El abanico será más sensible para acompañarlo.</p>
      )}
      <p className="destacado">
        {completo
          ? 'El abanico está completo. Cuando quieras, seguimos.'
          : armado
            ? 'Cuando quieras, separa los dedos hasta tu rango cómodo y sostén unos segundos.'
            : 'Cuando quieras, junta los dedos para preparar el abanico.'}
      </p>
      <Abanico abanicoRef={abanico} pulso={hechas} etiqueta={completo ? 'Abanico desplegado' : 'Abanico que se despliega mientras sostienes'} />
      {!completo && (
        <div className="progreso-postura">
          <AnilloProgreso anilloRef={anillo} etiqueta="Dedos separados sostenidos" />
          <p>Si sueltas antes, el tiempo espera y sigue cuando vuelvas.</p>
        </div>
      )}
      <Contador hechas={hechas} objetivo={objetivo} nombre="Repeticiones del abanico" />
      {acciones}
    </section>
  );
}
