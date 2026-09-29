import { CONFIG } from './detection/config';

const parametros = new URLSearchParams(window.location.search);

/** Panel de depuración: solo con ?debug=1. */
export const DEPURAR = parametros.get('debug') === '1';

/** En modo depuración, permite probar otra confianza con ?det=, ?pres= o ?seg= (0–1). */
function confianza(nombre: string, porDefecto: number): number {
  const texto = parametros.get(nombre);
  if (!DEPURAR || texto === null) return porDefecto;
  const valor = Number(texto);
  return Number.isFinite(valor) && valor >= 0 && valor <= 1 ? valor : porDefecto;
}

export const CONFIANZAS_DETECTOR = {
  minHandDetectionConfidence: confianza('det', CONFIG.detector.minHandDetectionConfidence),
  minHandPresenceConfidence: confianza('pres', CONFIG.detector.minHandPresenceConfidence),
  minTrackingConfidence: confianza('seg', CONFIG.detector.minTrackingConfidence),
};
