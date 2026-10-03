import { useEffect, type RefObject } from 'react';

interface Props {
  stream: MediaStream;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Ver solo el trazo: el video se oculta (sigue alimentando la detección) y queda el dibujo sobre un fondo suave. */
  soloTrazo: boolean;
}

/**
 * Video de la cámara con el esqueleto encima. Ambos se espejan juntos con CSS;
 * los textos van fuera de este contenedor para que nunca se espejen.
 * El video solo se muestra: sus fotogramas no se guardan ni se exportan.
 */
export function CameraView({ stream, videoRef, canvasRef, soloTrazo }: Props) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(() => {
      // El autoplay silenciado está permitido; si el navegador lo bloquea, el
      // video empieza con la siguiente interacción.
    });
    return () => {
      video.srcObject = null;
    };
  }, [stream, videoRef]);

  return (
    <div className={`camara${soloTrazo ? ' camara--solo-trazo' : ''}`}>
      <div className="camara__espejo">
        <video ref={videoRef} className="camara__video" autoPlay playsInline muted aria-hidden="true" />
        <canvas ref={canvasRef} className="camara__trazo" aria-hidden="true" />
      </div>
    </div>
  );
}
