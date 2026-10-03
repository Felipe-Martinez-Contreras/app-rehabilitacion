import { useState, type ReactNode } from 'react';
import { Titulo } from '../components/Titulo';
import type { Sensacion } from '../guardado/registro';

const OPCIONES: { valor: Sensacion; texto: string; icono: ReactNode }[] = [
  {
    valor: 'comoda',
    texto: 'Cómoda',
    icono: <path d="M6 13l4 4 8-9" />,
  },
  {
    valor: 'esfuerzo',
    texto: 'Con algo de esfuerzo',
    icono: <path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />,
  },
  {
    valor: 'molestia',
    texto: 'Sentí molestia',
    icono: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5M12 16v.5" />
      </>
    ),
  },
];

interface Props {
  onElegir: (sensacion: Sensacion) => void;
  onSeguir: () => void;
}

/** ¿Cómo se sintió tu mano? (fase 5): tres botones grandes con ícono y texto. */
export function PantallaComoSeSintio({ onElegir, onSeguir }: Props) {
  const [molestia, setMolestia] = useState(false);

  const elegir = (valor: Sensacion) => {
    onElegir(valor);
    if (valor === 'molestia') setMolestia(true);
    else onSeguir();
  };

  if (molestia) {
    return (
      <section className="pantalla">
        <Titulo key="molestia">Gracias por contarlo</Titulo>
        <p className="destacado">Coméntalo con tu kinesiólogo/a antes de tu próxima rutina.</p>
        <button type="button" className="boton" onClick={onSeguir}>
          Seguir
        </button>
      </section>
    );
  }

  return (
    <section className="pantalla">
      <Titulo>¿Cómo se sintió tu mano?</Titulo>
      <p>Elige la opción que más se parezca a cómo te sentiste hoy.</p>
      <div className="opciones-sensacion">
        {OPCIONES.map(({ valor, texto, icono }) => (
          <button key={valor} type="button" className="boton boton--secundario boton--grande" onClick={() => elegir(valor)}>
            <svg className="boton__icono" viewBox="0 0 24 24" aria-hidden="true">
              {icono}
            </svg>
            {texto}
          </button>
        ))}
      </div>
    </section>
  );
}
