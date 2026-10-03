import { ACORDE_DO, ARPEGIO, ARPEGIO_PASO_MS, CAMPANA } from './notas';
import { duracionMelodia, type NotaMelodia } from './melodia';

/**
 * Motor de sonido: Web Audio API nativa, todo sintetizado (sin archivos de audio
 * ni librerías). Solo salida: nunca usa el micrófono. Sin sonidos de error.
 *
 * Cadena: notas / acorde / melodía → salida (sonido sí/no y silencio) → limitador → parlantes.
 */

/** Envolvente suave de cada nota. */
const ATAQUE_S = 0.015;
/** Constante de tiempo de la caída: la cola dura ~1 s. */
const CAIDA_S = 0.22;
const DURACION_NOTA_S = 1.2;
/** Volumen moderado: pico de cada nota. */
const PICO_NOTA = 0.22;
/** Pico del acorde del abanico completo (sumando sus tres notas): comparable a una nota de la flor. */
const PICO_ACORDE = 0.22;
/** Cada nota del acorde suave que resuelve la flor. */
const PICO_RESOLUCION = PICO_NOTA * 0.45;
/** El acorde sube y baja con suavidad (al soltar se desvanece en ~300 ms, sin cortes). */
const SUAVIZADO_ACORDE_S = 0.1;
/** Encender, apagar o silenciar el sonido: desvanecido corto para no cortar en seco. */
const SUAVIZADO_SALIDA_S = 0.03;
const MS_ANTES_DE_SUSPENDER = 150;

/**
 * Lleva un parámetro hacia `valor` con una curva suave. Cancela lo programado
 * antes y parte del valor actual, para que nunca haya saltos (que suenan como
 * chasquidos o zumbidos) ni dos curvas compitiendo.
 */
function rampa(param: AudioParam, valor: number, ctx: AudioContext, suavizadoS: number) {
  const ahora = ctx.currentTime;
  param.cancelScheduledValues(ahora);
  param.setValueAtTime(param.value, ahora);
  param.setTargetAtTime(valor, ahora, suavizadoS);
}

export class MotorSonido {
  private ctx: AudioContext | null = null;
  private salida: GainNode | null = null;
  private acorde: GainNode | null = null;
  /** Último volumen del acorde aplicado (0–1). */
  private volumenAcorde = 0;
  /** Botón "Sonido". Apagado, no se crea ninguna nota. */
  private activado = true;
  /** Silenciado por "Detener" o por ocultar la pestaña, hasta el próximo clic. */
  private silenciado = false;
  private suspension: number | null = null;
  /** Melodía en reproducción: su ganancia propia y sus osciladores, para poder detenerla. */
  private melodia: { ganancia: GainNode; nodos: OscillatorNode[] } | null = null;

  /**
   * Crea o reanuda el AudioContext. Debe llamarse dentro de un clic de la persona
   * (política de reproducción automática del navegador). No cambia el volumen,
   * salvo para volver del silencio de "Detener" o de la pestaña oculta: así el clic
   * del propio botón "Sonido" no puede encender nada.
   */
  activar() {
    if (this.suspension !== null) {
      window.clearTimeout(this.suspension);
      this.suspension = null;
    }
    if (!this.ctx) {
      if (typeof window.AudioContext !== 'function') return;
      this.ctx = new window.AudioContext();
      const limitador = this.ctx.createDynamicsCompressor();
      limitador.connect(this.ctx.destination);
      this.salida = this.ctx.createGain();
      this.salida.gain.value = this.activado ? 1 : 0;
      this.salida.connect(limitador);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.silenciado && this.salida) {
      this.silenciado = false;
      rampa(this.salida.gain, this.activado ? 1 : 0, this.ctx, SUAVIZADO_SALIDA_S);
    }
  }

  /** Botón "Sonido". Apagado: la salida se desvanece y no se crean notas nuevas. */
  setActivado(activado: boolean) {
    this.activado = activado;
    if (!activado) this.setVolumenAcorde(0);
    if (!this.ctx || !this.salida || this.silenciado) return;
    rampa(this.salida.gain, activado ? 1 : 0, this.ctx, SUAVIZADO_SALIDA_S);
  }

  /** Al pulsar "Detener" o al ocultar la pestaña: desvanece todo y suspende el audio. */
  silenciar() {
    const { ctx, salida } = this;
    if (!ctx || !salida) return;
    this.silenciado = true;
    this.detenerMelodia();
    this.setVolumenAcorde(0);
    rampa(salida.gain, 0, ctx, SUAVIZADO_SALIDA_S);
    if (this.suspension !== null) window.clearTimeout(this.suspension);
    this.suspension = window.setTimeout(() => {
      this.suspension = null;
      void ctx.suspend();
    }, MS_ANTES_DE_SUSPENDER);
  }

  /** Contexto y salida, solo si el sonido está activo y el audio está corriendo. */
  private listo(): { ctx: AudioContext; salida: GainNode } | null {
    const { ctx, salida } = this;
    if (!this.activado || this.silenciado) return null;
    return ctx && salida && ctx.state === 'running' ? { ctx, salida } : null;
  }

  /** Un tono con ataque de ~15 ms y cola de ~1 s. `enSegundos` lo programa más adelante. */
  private tono(
    frecuencia: number,
    tipo: OscillatorType,
    pico: number,
    enSegundos: number,
    caida: number,
    destino?: AudioNode,
  ): OscillatorNode | null {
    const audio = this.listo();
    if (!audio) return null;
    const inicio = audio.ctx.currentTime + enSegundos;
    const oscilador = audio.ctx.createOscillator();
    const ganancia = audio.ctx.createGain();
    oscilador.type = tipo;
    oscilador.frequency.value = frecuencia;
    ganancia.gain.setValueAtTime(0, inicio);
    ganancia.gain.linearRampToValueAtTime(pico, inicio + ATAQUE_S);
    ganancia.gain.setTargetAtTime(0, inicio + ATAQUE_S, caida);
    oscilador.connect(ganancia).connect(destino ?? audio.salida);
    oscilador.start(inicio);
    oscilador.stop(inicio + DURACION_NOTA_S * (caida / CAIDA_S));
    return oscilador;
  }

  /** Nota de la flor o de un dedo del piano. */
  tocarNota(frecuencia: number, enSegundos = 0, destino?: AudioNode): OscillatorNode | null {
    return this.tono(frecuencia, 'triangle', PICO_NOTA, enSegundos, CAIDA_S, destino);
  }

  /** Arpegio que cierra una vuelta del piano. */
  tocarArpegio(enSegundos = 0) {
    ARPEGIO.forEach((f, i) =>
      this.tono(f, 'triangle', PICO_NOTA * 0.8, enSegundos + (i * ARPEGIO_PASO_MS) / 1000, CAIDA_S),
    );
  }

  /** Acorde suave (las notas juntas, con cola más larga): resuelve la flor. */
  tocarAcorde(frecuencias: readonly number[], enSegundos = 0) {
    for (const f of frecuencias) this.tono(f, 'sine', PICO_RESOLUCION, enSegundos, CAIDA_S * 2);
  }

  /** Campana: tono senoidal agudo con un parcial inarmónico suave y cola más larga. */
  tocarCampana(enSegundos = 0, frecuencia = CAMPANA, destino?: AudioNode): OscillatorNode[] {
    const nodos = [
      this.tono(frecuencia, 'sine', PICO_NOTA * 0.8, enSegundos, CAIDA_S * 2, destino),
      this.tono(frecuencia * 2.76, 'sine', PICO_NOTA * 0.15, enSegundos, CAIDA_S, destino),
    ];
    return nodos.filter((n): n is OscillatorNode => n !== null);
  }

  /**
   * Acorde del abanico (Do4–Mi4–Sol4): `volumen` entre 0 y 1 (ver `volumenAcorde`).
   * Se llama en cada fotograma, pero solo actúa cuando el valor cambia de verdad,
   * y siempre con una rampa suave desde el valor actual (sin saltos).
   */
  setVolumenAcorde(volumen: number) {
    const objetivo = this.listo() ? volumen : 0;
    const cambioPequeno = Math.abs(objetivo - this.volumenAcorde) < 0.02;
    if (objetivo === this.volumenAcorde || (cambioPequeno && objetivo !== 0)) return;
    const { ctx, salida } = this;
    if (!ctx || !salida) return;
    if (!this.acorde) {
      if (objetivo === 0) return;
      // Los osciladores del acorde se crean una vez y quedan sonando en silencio.
      this.acorde = ctx.createGain();
      this.acorde.gain.value = 0;
      this.acorde.connect(salida);
      for (const f of ACORDE_DO) {
        const oscilador = ctx.createOscillator();
        oscilador.type = 'triangle';
        oscilador.frequency.value = f;
        oscilador.connect(this.acorde);
        oscilador.start();
      }
    }
    this.volumenAcorde = objetivo;
    rampa(this.acorde.gain, (objetivo * PICO_ACORDE) / ACORDE_DO.length, ctx, SUAVIZADO_ACORDE_S);
  }

  /**
   * Reproduce una melodía ya comprimida (tiempos en ms desde 0). Devuelve su
   * duración total en ms, contando la cola de la última nota; 0 si no puede sonar.
   */
  reproducirMelodia(notas: readonly NotaMelodia[]): number {
    this.detenerMelodia();
    const audio = this.listo();
    if (!audio || notas.length === 0) return 0;
    const ganancia = audio.ctx.createGain();
    ganancia.connect(audio.salida);
    const nodos: OscillatorNode[] = [];
    for (const n of notas) {
      const en = n.t / 1000 + 0.05;
      if (n.timbre === 'campana') nodos.push(...this.tocarCampana(en, n.frecuencia, ganancia));
      else {
        const nodo = this.tocarNota(n.frecuencia, en, ganancia);
        if (nodo) nodos.push(nodo);
      }
    }
    this.melodia = { ganancia, nodos };
    return duracionMelodia(notas) + DURACION_NOTA_S * 1000;
  }

  /** Detiene la melodía con un desvanecido corto (sin cortes). */
  detenerMelodia() {
    const { ctx, melodia } = this;
    if (!melodia || !ctx) return;
    this.melodia = null;
    rampa(melodia.ganancia.gain, 0, ctx, SUAVIZADO_SALIDA_S);
    for (const nodo of melodia.nodos) {
      try {
        nodo.stop(ctx.currentTime + 0.2);
      } catch {
        // Ya había terminado.
      }
    }
  }
}
