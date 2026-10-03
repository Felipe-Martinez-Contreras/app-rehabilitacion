import { useEffect, useState } from 'react';
import { Flor } from '../components/Flor';
import { Titulo } from '../components/Titulo';
import { lineasResumen, type Ejercicio, type Resumen } from '../rutina';
import type { Sonido } from '../sound/useSonido';

interface Props {
  resumen: Resumen;
  /** Ejercicios en los que se pulsó "Saltar este ejercicio". */
  saltados: readonly Ejercicio[];
  sonido: Sonido;
  /** La persona eligió "Terminar por hoy" desde "Detener". */
  terminadaAntes: boolean;
  /** Hubo al menos una repetición: nace una flor (también con "Terminar por hoy"). */
  florNueva: boolean;
  onVolver: () => void;
}

/**
 * Cierre: mensaje final, resumen de cada ejercicio y la flor nueva del jardín.
 * La cámara ya está apagada. "Escuchar la melodía de hoy" reproduce las notas de la
 * sesión (solo en memoria). La flor nueva queda en el jardín (registro local).
 */
export function PantallaCierre({ resumen, saltados, sonido, terminadaAntes, florNueva, onVolver }: Props) {
  const [estadoMelodia, setEstadoMelodia] = useState<'lista' | 'sonando' | 'sin-audio'>('lista');
  const [temporizador, setTemporizador] = useState<number | null>(null);
  const notas = sonido.notasMelodia();
  const { reproducirMelodia, detenerMelodia } = sonido;

  useEffect(() => {
    if (temporizador === null) return;
    return () => window.clearTimeout(temporizador);
  }, [temporizador]);

  // Al salir del cierre, la melodía deja de sonar.
  useEffect(() => detenerMelodia, [detenerMelodia]);

  const escuchar = () => {
    // Con el sonido apagado no suena nada: el texto ya invita a encenderlo.
    if (!sonido.activado) return;
    const duracionMs = reproducirMelodia();
    if (duracionMs === 0) {
      setEstadoMelodia('sin-audio');
      return;
    }
    setEstadoMelodia('sonando');
    setTemporizador(window.setTimeout(() => setEstadoMelodia('lista'), duracionMs));
  };

  const detener = () => {
    detenerMelodia();
    setTemporizador(null);
    setEstadoMelodia('lista');
  };

  return (
    <section className="pantalla">
      {terminadaAntes ? (
        <>
          <Titulo>Por hoy, suficiente</Titulo>
          <p className="destacado">Hiciste lo que tu mano pidió hoy. Vuelve cuando quieras, a tu propio ritmo.</p>
        </>
      ) : (
        <>
          <Titulo>Rutina completa</Titulo>
          <p className="destacado">Rutina completa. Hoy tu mano hizo música. Vuelve cuando quieras, a tu propio ritmo.</p>
        </>
      )}
      <h2>Lo que hiciste hoy</h2>
      <ul className="resumen">
        {lineasResumen(resumen, saltados).map((linea) => (
          <li key={linea}>{linea}</li>
        ))}
      </ul>
      {florNueva && (
        <div className="flor-nueva">
          <Flor petalos={5} encendidos={5} apertura={1} etiqueta="Tu flor nueva, con todos sus pétalos encendidos" />
          <p>Una flor nueva para tu jardín.</p>
        </div>
      )}
      {notas > 0 && (
        <div className="melodia">
          {estadoMelodia === 'sonando' ? (
            <button type="button" className="boton boton--secundario" onClick={detener}>
              Detener la melodía
            </button>
          ) : (
            <button type="button" className="boton boton--secundario" onClick={escuchar}>
              Escuchar la melodía de hoy
            </button>
          )}
          <p role="status">
            {estadoMelodia === 'sonando' && `Sonando la melodía de hoy: ${notas} ${notas === 1 ? 'nota' : 'notas'}.`}
            {estadoMelodia === 'sin-audio' && 'No logré iniciar el sonido. Puedes intentarlo de nuevo cuando quieras.'}
            {estadoMelodia !== 'sonando' && !sonido.activado && 'El sonido está apagado. Puedes encenderlo con el botón "Sonido".'}
          </p>
        </div>
      )}
      <p>La cámara está apagada.</p>
      <button type="button" className="boton" onClick={onVolver}>
        Volver al inicio
      </button>
    </section>
  );
}
