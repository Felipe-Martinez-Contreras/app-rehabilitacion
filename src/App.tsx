import { useState } from 'react';
import { useCamera } from './camera/useCamera';
import { DEPURAR } from './depuracion';
import { PantallaTeVeo } from './screens/PantallaTeVeo';
import { PantallaTuCamara } from './screens/PantallaTuCamara';

type Pantalla = 'tu-camara' | 'te-veo';

export function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('tu-camara');
  const { estado: camara, encender, apagar } = useCamera();

  const activarCamara = () => {
    setPantalla('te-veo');
    void encender();
  };

  return (
    <div className="app">
      <header className="encabezado">
        <p className="encabezado__nombre">Manos que Suenan</p>
        <p className="encabezado__fase">Fase 1 de 5</p>
      </header>

      <main className="principal">
        {pantalla === 'tu-camara' && <PantallaTuCamara onActivar={activarCamara} />}
        {pantalla === 'te-veo' && (
          <PantallaTeVeo camara={camara} onEncender={() => void encender()} onApagar={apagar} depurar={DEPURAR} />
        )}
      </main>

      <footer className="pie">
        <p>
          Esta app acompaña tu rutina; no reemplaza a tu kinesiólogo/a ni a tu equipo de salud. Si sientes dolor,
          hormigueo o algo no se siente bien, detente y consulta.
        </p>
      </footer>
    </div>
  );
}
