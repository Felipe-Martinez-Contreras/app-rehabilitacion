/**
 * URLs absolutas de los recursos locales de MediaPipe. Con `base: './'`,
 * BASE_URL es relativa; resolverla contra document.baseURI hace que funcione
 * igual en desarrollo y en el build, sirva desde donde sirva la app.
 */
function urlLocal(ruta: string): string {
  return new URL(import.meta.env.BASE_URL + ruta, document.baseURI).href;
}

/** Carpeta de wasm, sin barra final (FilesetResolver agrega "/archivo"). */
export function urlCarpetaWasm(): string {
  return urlLocal('wasm').replace(/\/$/, '');
}

export function urlModeloMano(): string {
  return urlLocal('models/hand_landmarker.task');
}
