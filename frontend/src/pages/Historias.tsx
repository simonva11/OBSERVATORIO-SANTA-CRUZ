import { Link } from "react-router-dom";
import { HISTORIAS, useCiudadano, useMiBarrio } from "../lib/ciudadano";
import { ConDatos } from "../components/Estado";
import TarjetaHistoria from "../components/ciudadano/TarjetaHistoria";
import MapaCiudadano from "../components/ciudadano/MapaCiudadano";

/** Los cuatro problemas y el mapa sencillo por tema. */
export default function Historias() {
  const ciu = useCiudadano();
  const [barrio] = useMiBarrio();
  return (
    <div className="ciu">
      <div className="ciu-ancho pb-6 pt-8">
        <nav aria-label="Ruta" className="migas"><Link to="/">Inicio</Link><span aria-hidden="true">/</span><span aria-current="page" className="text-tinta">Los problemas</span></nav>
        <h1 className="ciu-h1 mt-5 max-w-[16ch]">Los problemas del barrio</h1>
        <p className="ciu-lead">Cuatro situaciones que se viven en Santa Cruz. Cada una es una historia corta: la escena, lo que dicen los datos, lo que se puede hacer y la evidencia.</p>
        <ConDatos estado={ciu}>
          {(c) => (
            <div className="grilla-historias mt-8">
              <div className="gh-a"><TarjetaHistoria h={HISTORIAS[0]} c={c} barrio={barrio || undefined} variante="grande" /></div>
              <div className="gh-b"><TarjetaHistoria h={HISTORIAS[1]} c={c} barrio={barrio || undefined} /></div>
              <div className="gh-c"><TarjetaHistoria h={HISTORIAS[2]} c={c} barrio={barrio || undefined} /></div>
              <div className="gh-d"><TarjetaHistoria h={HISTORIAS[3]} c={c} barrio={barrio || undefined} variante="ancha" /></div>
            </div>
          )}
        </ConDatos>
      </div>
      <section aria-labelledby="t-mapa" className="banda-papel mt-10">
        <div className="ciu-ancho ciu-seccion">
          <p className="ciu-ojo-seccion">Por barrio</p>
          <h2 id="t-mapa" className="ciu-h2">Mira en qué barrios pesa más cada problema</h2>
          <p className="ciu-sub">Elige un tema y toca un barrio. Más oscuro quiere decir «más» de lo que dice la leyenda.</p>
          <div className="mt-6"><MapaCiudadano /></div>
          <div className="ciu-mapa-invita mt-8">
            <p className="ciu-parrafo !max-w-none">¿Quieres ver más cosas del barrio, como colegios, parques o el Metro?</p>
            <Link to="/mapa-vecinos" className="boton boton-1 ciu-boton-grande shrink-0">Explorar el mapa completo</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
