import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { urlCarpetaWasm, urlModeloMano } from './assets';

/**
 * Carga el detector de manos una sola vez por sesión (el modelo pesa ~7 MB).
 * Intenta con GPU y, si no se puede, con CPU.
 * Versión fijada 0.10.35: la 1.x envía métricas de uso a Google (ver CLAUDE.md).
 */
let promesa: Promise<HandLandmarker> | null = null;

async function crear(): Promise<HandLandmarker> {
  const wasm = await FilesetResolver.forVisionTasks(urlCarpetaWasm());
  const opciones = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: urlModeloMano(), delegate },
    runningMode: 'VIDEO' as const,
    numHands: 1,
  });
  try {
    return await HandLandmarker.createFromOptions(wasm, opciones('GPU'));
  } catch {
    return await HandLandmarker.createFromOptions(wasm, opciones('CPU'));
  }
}

export function obtenerDetectorMano(): Promise<HandLandmarker> {
  if (!promesa) {
    promesa = crear().catch((error: unknown) => {
      promesa = null; // permite reintentar
      throw error;
    });
  }
  return promesa;
}

export const CONEXIONES_MANO = HandLandmarker.HAND_CONNECTIONS;
