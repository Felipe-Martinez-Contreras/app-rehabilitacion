import { useEffect, useState } from 'react';
import type { SeguimientoMano } from '../camera/useHandTracking';
import type { Anunciar } from '../components/Anunciador';
import { Titulo } from '../components/Titulo';

const TE_VEO = 'Te veo. Cuando quieras, seguimos.';

interface Props {
  seguimiento: SeguimientoMano;
  anunciar: Anunciar;
  onSeguir: () => void;
}

/** "Te veo": cuando la mano se ve de forma estable (~1 s), invita a seguir. */
export function PantallaTeVeo({ seguimiento, anunciar, onSeguir }: Props) {
  const { estable } = seguimiento;
  // Una vez que te vio, el botón queda disponible aunque la mano salga del cuadro.
  const [teVio, setTeVio] = useState(false);

  useEffect(() => {
    if (!estable) return;
    setTeVio(true);
    anunciar(TE_VEO);
  }, [estable, anunciar]);

  return (
    <section className="pantalla">
      <Titulo>Te veo</Titulo>
      <p className="destacado">
        {estable ? TE_VEO : 'Cuando quieras, muestra tu mano a la cámara, con la palma de frente.'}
      </p>
      {teVio && (
        <button type="button" className="boton" onClick={onSeguir}>
          Seguir
        </button>
      )}
    </section>
  );
}
