/**
 * Mínimo y máximo de una métrica en una ventana de tiempo (p. ej., los
 * últimos 5 s). El tiempo se pasa como argumento para poder probarla sin reloj.
 */
export class VentanaMinMax {
  private muestras: { t: number; valor: number }[] = [];

  constructor(private readonly duracionMs: number) {}

  agregar(t: number, valor: number) {
    this.muestras.push({ t, valor });
    this.descartarAntiguas(t);
  }

  /** Mínimo y máximo de las muestras con tiempo ≥ t − duración; null si no hay. */
  minMax(t: number): { min: number; max: number } | null {
    this.descartarAntiguas(t);
    if (this.muestras.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const { valor } of this.muestras) {
      if (valor < min) min = valor;
      if (valor > max) max = valor;
    }
    return { min, max };
  }

  reiniciar() {
    this.muestras = [];
  }

  private descartarAntiguas(t: number) {
    const limite = t - this.duracionMs;
    let i = 0;
    while (i < this.muestras.length && this.muestras[i].t < limite) i++;
    if (i > 0) this.muestras.splice(0, i);
  }
}
