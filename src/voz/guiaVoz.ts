import { useEffect, useState } from 'react';
import { elegirVoz, vocesEspanolLocales } from './voces';

/**
 * Guía por voz opcional (apagada por defecto) con `speechSynthesis`, solo con
 * voces en español instaladas en el dispositivo. Lee el título y la instrucción
 * de cada pantalla, y los mismos avisos que la región `aria-live`.
 */
class GuiaVoz {
  private activa = false;
  private voz: SpeechSynthesisVoice | null = null;

  private get sintesis(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  configurar(activa: boolean, voz: SpeechSynthesisVoice | null) {
    this.activa = activa && voz !== null;
    this.voz = voz;
    if (!this.activa) this.callar();
  }

  /** Dice un texto. `interrumpir` corta lo que se esté diciendo (al cambiar de pantalla). */
  decir(texto: string, interrumpir = false) {
    const s = this.sintesis;
    if (!this.activa || !this.voz || !s || !texto.trim()) return;
    if (interrumpir) s.cancel();
    const frase = new SpeechSynthesisUtterance(texto);
    frase.voice = this.voz;
    frase.lang = this.voz.lang;
    frase.rate = 0.95;
    s.speak(frase);
  }

  /** Lee el título de una pantalla y su instrucción principal (el primer texto destacado). */
  leerPantalla(titulo: HTMLElement) {
    if (!this.activa) return;
    const instruccion = titulo.closest('section')?.querySelector('.destacado')?.textContent ?? '';
    this.decir([titulo.textContent ?? '', instruccion].filter(Boolean).join('. '), true);
  }

  /** Al pulsar "Detener" o al ocultar la pestaña. */
  callar() {
    this.sintesis?.cancel();
  }
}

export const guiaVoz = new GuiaVoz();

/** Voz en español local elegida; null si no hay ninguna (la opción no se muestra). */
export function useVozEspanol(): SpeechSynthesisVoice | null {
  const [voz, setVoz] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const s = window.speechSynthesis;
    // Las voces llegan de forma asíncrona en algunos navegadores.
    const actualizar = () => setVoz(elegirVoz(vocesEspanolLocales(s.getVoices())));
    actualizar();
    s.addEventListener('voiceschanged', actualizar);
    return () => s.removeEventListener('voiceschanged', actualizar);
  }, []);
  return voz;
}
