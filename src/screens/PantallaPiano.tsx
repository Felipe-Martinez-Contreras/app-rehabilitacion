import { useEffect, useRef, useState } from 'react';
import { useFotograma, type SeguimientoMano } from '../camera/useHandTracking';
import type { Anunciar } from '../components/Anunciador';
import { AccionesEjercicio, Contador } from '../components/ControlesEjercicio';
import { ManoPiano, NOMBRE_DEDO } from '../components/ManoPiano';
import { Titulo } from '../components/Titulo';
import { PUNTAS_DEDOS } from '../detection/geometry';
import { DEDOS } from '../detection/metrics';
import { dedoSiguiente, PIANO_INICIAL, registrarToque, reiniciarVuelta } from '../detection/piano';
import type { Dedo } from '../detection/types';

/** Nota de cada dedo (el sonido llega en el Hito 3; por ahora la tecla solo se ilumina). */
const TECLAS: { dedo: Dedo; nota: string }[] = [
  { dedo: 'indice', nota: 'Do' },
  { dedo: 'medio', nota: 'Mi' },
  { dedo: 'anular', nota: 'Sol' },
  { dedo: 'menique', nota: 'Do agudo' },
];

const MS_TECLA = 450;
const MS_VUELTA = 900;

interface Props {
  seguimiento: SeguimientoMano;
  anunciar: Anunciar;
  objetivo: number;
  /** Vueltas ya hechas (al retomar después de "Detener"). */
  inicial: number;
  onVuelta: (total: number) => void;
  onSeguir: () => void;
  onDetener: () => void;
  onSaltar: () => void;
}

/** Piano de dedos (fase 3): tocar con el pulgar índice → medio → anular → meñique. */
export function PantallaPiano(props: Props) {
  const { seguimiento, anunciar, objetivo, inicial, onVuelta, onSeguir, onDetener, onSaltar } = props;
  const [siguiente, setSiguiente] = useState<Dedo>('indice');
  const [vueltas, setVueltas] = useState(inicial);
  /** Teclas iluminadas: un dedo, o todas al completar una vuelta. */
  const [encendida, setEncendida] = useState<Dedo | 'todas' | null>(null);
  const estado = useRef({ ...PIANO_INICIAL, vueltas: inicial });
  const temporizador = useRef<number | null>(null);
  const { depuracion: datos, puntaResaltada } = seguimiento;
  const completo = vueltas >= objetivo;

  const iluminar = (tecla: Dedo | 'todas', ms: number) => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    setEncendida(tecla);
    temporizador.current = window.setTimeout(() => setEncendida(null), ms);
  };

  useFotograma(seguimiento, ({ resultado: r, enPausa }) => {
    if (estado.current.vueltas >= objetivo) {
      puntaResaltada.current = null;
      return;
    }
    // Mano perdida más de 1,5 s: se reinicia la vuelta en curso (las completas se mantienen).
    if (enPausa && estado.current.siguiente !== 0) {
      estado.current = reiniciarVuelta(estado.current);
      setSiguiente(dedoSiguiente(estado.current));
    }

    const suavizadas = r.estado.suavizadas;
    if (r.toqueNuevo && suavizadas) {
      const dedo = suavizadas.dedoMasCercano;
      const rp = registrarToque(estado.current, dedo);
      estado.current = rp.estado;
      const proximo = NOMBRE_DEDO[dedoSiguiente(rp.estado)];
      if (rp.vueltaCompleta) {
        iluminar('todas', MS_VUELTA);
        setVueltas(rp.estado.vueltas);
        onVuelta(rp.estado.vueltas);
        const fin = rp.estado.vueltas >= objetivo ? ' El piano está completo.' : ` Ahora: dedo ${proximo}.`;
        anunciar(`Vuelta ${rp.estado.vueltas} de ${objetivo}.${fin}`, true);
      } else {
        iluminar(dedo, MS_TECLA);
        // Si tocó otro dedo, solo se repite la invitación.
        anunciar(`Ahora: dedo ${proximo}`);
      }
      setSiguiente(dedoSiguiente(rp.estado));
    }

    puntaResaltada.current = PUNTAS_DEDOS[estado.current.siguiente];
    datos.current.pantalla = [
      `piano         sigue ${NOMBRE_DEDO[dedoSiguiente(estado.current)]} (${estado.current.siguiente + 1} de ${DEDOS.length}) · vueltas ${estado.current.vueltas} de ${objetivo}`,
      `              ${r.puedeContar ? '' : 'sin contar (mano no lista o girada) · '}${r.abiertaParaToque ? 'mano abierta' : 'mano cerrada (filtro de puño)'}${enPausa ? ' · mano perdida: vuelta reiniciada' : ''}`,
    ];
  });

  useEffect(() => {
    const d = datos.current;
    return () => {
      d.pantalla = [];
      puntaResaltada.current = null;
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    };
  }, [datos, puntaResaltada]);

  return (
    <section className="pantalla">
      <Titulo>Piano de dedos</Titulo>
      <p className="destacado">
        {completo
          ? 'El piano está completo. Cuando quieras, seguimos.'
          : `Ahora: dedo ${NOMBRE_DEDO[siguiente]}. Cuando quieras, tócalo con la punta del pulgar.`}
      </p>
      {!completo && <ManoPiano destacado={siguiente} />}
      <ul className="teclas" aria-label="Teclas del piano">
        {TECLAS.map(({ dedo, nota }) => {
          const activa = encendida === 'todas' || encendida === dedo;
          return (
            <li key={dedo} className={`tecla${activa ? ' tecla--encendida' : ''}`}>
              <span className="tecla__nota">{nota}</span>
              <span className="tecla__dedo">{NOMBRE_DEDO[dedo]}</span>
            </li>
          );
        })}
      </ul>
      <Contador hechas={vueltas} objetivo={objetivo} nombre="Vueltas del piano" />
      <AccionesEjercicio completo={completo} onSeguir={onSeguir} onDetener={onDetener} onSaltar={onSaltar} />
    </section>
  );
}
