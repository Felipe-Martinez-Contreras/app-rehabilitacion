import { floresDibujadas } from '../guardado/jardin';

const PETALOS = [0, 72, 144, 216, 288];

/** Flor pequeña del jardín (decorativa: el texto dice cuántas hay). */
function FlorJardin() {
  return (
    <svg className="jardin__flor" viewBox="0 0 40 40" aria-hidden="true">
      {PETALOS.map((giro) => (
        <ellipse key={giro} className="jardin__petalo" cx="20" cy="11" rx="6" ry="9" transform={`rotate(${giro} 20 20)`} />
      ))}
      <circle className="jardin__centro" cx="20" cy="20" r="5" />
    </svg>
  );
}

/** Tu jardín: una flor por cada rutina con al menos una repetición. Nunca se marchita. */
export function Jardin({ flores }: { flores: number }) {
  const { dibujadas, mas } = floresDibujadas(flores);
  if (flores === 0) {
    return <p>Aquí crecerá una flor por cada rutina en la que muevas tu mano. Tus flores nunca se marchitan.</p>;
  }
  return (
    <>
      <p>
        Tu jardín tiene {flores} {flores === 1 ? 'flor' : 'flores'}. Nunca se marchitan.
      </p>
      <div className="jardin">
        {Array.from({ length: dibujadas }, (_, i) => (
          <FlorJardin key={i} />
        ))}
        {mas > 0 && <span className="jardin__mas">y {mas} más</span>}
      </div>
    </>
  );
}
