import { useCallback, useEffect, useRef, useState } from 'react';

export type ErrorCamara = 'permiso' | 'sin-camara' | 'ocupada' | 'inseguro' | 'desconocido';

export type EstadoCamara =
  | { tipo: 'apagada' }
  | { tipo: 'solicitando' }
  | { tipo: 'activa'; stream: MediaStream }
  | { tipo: 'error'; error: ErrorCamara };

export function clasificarErrorCamara(error: unknown): ErrorCamara {
  const nombre = error instanceof Error || error instanceof DOMException ? error.name : '';
  switch (nombre) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'permiso';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'sin-camara';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'ocupada';
    case 'SecurityError':
      return window.isSecureContext ? 'permiso' : 'inseguro';
    default:
      return 'desconocido';
  }
}

function detenerStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Cámara frontal, solo video. Se enciende únicamente con `encender()`
 * (acción de la persona) y se apaga al llamar `apagar()`, al ocultar la
 * pestaña, si el track termina o al desmontar el componente.
 */
export function useCamera() {
  const [estado, setEstado] = useState<EstadoCamara>({ tipo: 'apagada' });
  const streamRef = useRef<MediaStream | null>(null);
  const solicitudRef = useRef(0);

  const apagar = useCallback(() => {
    solicitudRef.current++; // invalida una solicitud en curso
    detenerStream(streamRef.current);
    streamRef.current = null;
    setEstado({ tipo: 'apagada' });
  }, []);

  const encender = useCallback(async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setEstado({ tipo: 'error', error: 'inseguro' });
      return;
    }
    const solicitud = ++solicitudRef.current;
    detenerStream(streamRef.current);
    streamRef.current = null;
    setEstado({ tipo: 'solicitando' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (solicitud !== solicitudRef.current) {
        detenerStream(stream); // se apagó mientras esperábamos el permiso
        return;
      }
      streamRef.current = stream;
      stream.getVideoTracks().forEach((track) => track.addEventListener('ended', apagar));
      setEstado({ tipo: 'activa', stream });
    } catch (error) {
      if (solicitud !== solicitudRef.current) return;
      setEstado({ tipo: 'error', error: clasificarErrorCamara(error) });
    }
  }, [apagar]);

  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'hidden' && streamRef.current) apagar();
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      solicitudRef.current++;
      detenerStream(streamRef.current);
      streamRef.current = null;
    };
  }, [apagar]);

  return { estado, encender, apagar };
}
