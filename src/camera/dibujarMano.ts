import type { Punto3D } from '../detection/types';

export interface ColoresTrazo {
  linea: string;
  contorno: string;
  punto: string;
}

/** Dibuja el esqueleto de la mano (puntos en píxeles del video) sobre el canvas. */
export function dibujarMano(
  ctx: CanvasRenderingContext2D,
  puntos: readonly Punto3D[] | null,
  conexiones: readonly { start: number; end: number }[],
  colores: ColoresTrazo,
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!puntos) return;

  const grosor = Math.max(2, width / 160);
  ctx.lineCap = 'round';
  // Contorno claro debajo para que el trazo se distinga sobre cualquier fondo.
  for (const [color, ancho] of [
    [colores.contorno, grosor * 2],
    [colores.linea, grosor],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = ancho;
    ctx.beginPath();
    for (const { start, end } of conexiones) {
      ctx.moveTo(puntos[start].x, puntos[start].y);
      ctx.lineTo(puntos[end].x, puntos[end].y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = colores.punto;
  ctx.strokeStyle = colores.contorno;
  ctx.lineWidth = grosor / 2;
  for (const p of puntos) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, grosor * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
