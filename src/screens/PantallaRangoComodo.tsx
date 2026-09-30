import { useEffect, useRef, useState } from 'react';
import { useFotograma, type SeguimientoMano } from '../camera/useHandTracking';
import { AnilloProgreso, pintarAnillo } from '../components/AnilloProgreso';
import type { Anunciar } from '../components/Anunciador';
import { Titulo } from '../components/Titulo';
import {
  actualizarCalibracion,
  CALIBRACION_INICIAL,
  esperandoPostura,
  evaluarCalibracion,
  type ResultadoCalibracion,
} from '../detection/calibracion';
import { CONFIG } from '../detection/config';
import { progreso } from '../detection/sostener';
import type { Calibracion } from '../detection/types';

const INSTRUCCION = {
  abierta: 'Abre la mano y separa los dedos hasta donde te sea cómodo.',
  cerrada: 'Ahora ciérrala con suavidad, hasta donde te sea cómodo.',
} as const;

interface Props {
  seguimiento: SeguimientoMano;
  anunciar: Anunciar;
  /** Se llama en cuanto hay una calibración (antes de pulsar "Seguir"). */
  onCalibrada: (calibracion: Calibracion) => void;
  onSeguir: () => void;
}

/** Rango cómodo: dos posturas sostenidas 3 s, cada una con su anillo de progreso. */
export function PantallaRangoComodo({ seguimiento, anunciar, onCalibrada, onSeguir }: Props) {
  const [postura, setPostura] = useState<'abierta' | 'cerrada'>('abierta');
  const [intento, setIntento] = useState(1);
  const [resultado, setResultado] = useState<ResultadoCalibracion | null>(null);
  const estado = useRef(CALIBRACION_INICIAL);
  const anillo = useRef<SVGSVGElement>(null);
  const datos = seguimiento.depuracion;

  useFotograma(seguimiento, ({ t, resultado: r }) => {
    if (resultado) return;
    const anterior = estado.current;
    const actual = actualizarCalibracion(anterior, t, r.estado.suavizadas, r.lista);
    estado.current = actual;
    pintarAnillo(anillo.current, progreso(actual.sostener, CONFIG.calibracion.sostenerMs));

    datos.current.pantalla = [
      `calibración   intento ${intento} · postura ${actual.postura}${esperandoPostura(actual, t) ? ' (esperando)' : ''}`,
      `sostenido     ${Math.round(actual.sostener.acumuladoMs)} de ${CONFIG.calibracion.sostenerMs} ms · muestras abierta ${actual.abierta.length} · cerrada ${actual.cerrada.length}`,
    ];

    if (actual.postura === anterior.postura) return;
    if (actual.postura === 'cerrada') {
      setPostura('cerrada');
      anunciar(INSTRUCCION.cerrada, true);
      return;
    }
    const evaluado = evaluarCalibracion(actual, intento);
    setResultado(evaluado);
    if (evaluado.tipo === 'lista') onCalibrada(evaluado.calibracion);
  });

  useEffect(() => {
    const d = datos.current;
    return () => {
      d.pantalla = [];
    };
  }, [datos]);

  const intentarDeNuevo = () => {
    estado.current = CALIBRACION_INICIAL;
    setIntento((n) => n + 1);
    setPostura('abierta');
    setResultado(null);
  };

  if (resultado?.tipo === 'repetir') {
    return (
      <section className="pantalla">
        <Titulo key="repetir">Tu rango cómodo</Titulo>
        <p className="destacado">Puedes intentarlo de nuevo, sin forzar; buscamos tu movimiento cómodo de hoy.</p>
        <button type="button" className="boton" onClick={intentarDeNuevo}>
          Intentar de nuevo
        </button>
      </section>
    );
  }

  if (resultado?.tipo === 'lista') {
    return (
      <section className="pantalla">
        <Titulo key="lista">Listo, ya conozco tu rango cómodo</Titulo>
        <p>Los ejercicios se adaptan a tu movimiento de hoy. Nunca hace falta ir más allá.</p>
        {resultado.calibracion.ampliado && (
          <p className="destacado">Tu movimiento de hoy es pequeño, y está bien. La flor será más sensible para acompañarlo.</p>
        )}
        {resultado.zBaja && (
          <p className="destacado">
            Si te resulta cómodo, puedes acercar un poco la palma hacia la cámara, sin forzar el giro.
          </p>
        )}
        <button type="button" className="boton" onClick={onSeguir}>
          Seguir
        </button>
      </section>
    );
  }

  return (
    <section className="pantalla">
      <Titulo key={`medir-${intento}`}>Tu rango cómodo</Titulo>
      <p className="paso">Postura {postura === 'abierta' ? 1 : 2} de 2</p>
      <p className="destacado">{INSTRUCCION[postura]}</p>
      <div className="progreso-postura">
        <AnilloProgreso key={postura} anilloRef={anillo} etiqueta={`Postura ${postura === 'abierta' ? 1 : 2} sostenida`} />
        <p>Cuando llegues a tu postura cómoda, sostenla unos segundos. El anillo avanza mientras la sostienes.</p>
      </div>
    </section>
  );
}
