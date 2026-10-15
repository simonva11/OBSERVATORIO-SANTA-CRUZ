import { HISTORIAS, useCiudadano, useMiBarrio } from "../lib/ciudadano";
import { ConDatos } from "../components/Estado";
import TarjetaHistoria from "../components/ciudadano/TarjetaHistoria";
import MapaCiudadano from "../components/ciudadano/MapaCiudadano";
import { Link } from "react-router-dom";

/** Los cuatro problemas y el mapa sencillo del barrio. */
export default function Historias() {
  const ciu = useCiudadano();
  const [barrio] = useMiBarrio();
  return (
    <div className="ciu">
      <div className="ciu-ancho pb-16 pt-8">
        <nav aria-label="Ruta" className="migas"><Link to="/">Inicio</Link><span aria-hidden="true">/</span><span aria-current="page" className="text-tinta">Los problemas</span></nav>
        <h1 className="ciu-h1 !text-[clamp(2rem,4.4vw,3.2rem)] mt-4">Los problemas del barrio</h1>
        <p className="ciu-lead">Cuatro situaciones que se viven en Santa Cruz. Entra a cada una para entenderla y ver cómo está tu barrio.</p>
        <ConDatos estado={ciu}>
          {(c) => (
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {HISTORIAS.map((h) => <li key={h.id} className="flex"><TarjetaHistoria h={h} c={c} barrio={barrio || undefined} /></li>)}
            </ul>
          )}
        </ConDatos>
        <section aria-labelledby="t-mapa" className="ciu-seccion">
          <h2 id="t-mapa" className="ciu-h2">Mira tu barrio en el mapa</h2>
          <p className="ciu-sub">Elige un tema y toca un barrio. Más oscuro quiere decir “más” de lo que dice la leyenda.</p>
          <div className="mt-6"><MapaCiudadano /></div>
        </section>
      </div>
    </div>
  );
}
