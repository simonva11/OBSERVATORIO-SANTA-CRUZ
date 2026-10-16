import { Link } from "react-router-dom";
import { HISTORIAS, resumenBarrio, useCiudadano, useMiBarrio } from "../lib/ciudadano";
import { ConDatos } from "../components/Estado";
import Foto, { AvisoFotos } from "../components/ciudadano/Foto";
import TarjetaHistoria from "../components/ciudadano/TarjetaHistoria";
import Compartir from "../components/ciudadano/Compartir";

/**
 * OTEA Ciudadano: la puerta de entrada para vecinos. Habla en sencillo, muestra cuatro problemas que se viven a diario
 * y deja el análisis detallado en OTEA Técnico.
 */
export default function Ciudadano() {
  const ciu = useCiudadano();
  const [barrio, setBarrio] = useMiBarrio();

  const irAProblemas = () => document.getElementById("problemas")?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

  return (
    <div className="ciu">
      {/* ---------------------------------------------------------------- portada */}
      <section className="ciu-hero" aria-labelledby="t-portada">
        <div className="ciu-ancho grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <p className="ciu-ojo">Así vivimos Santa Cruz · Comuna 2, Medellín</p>
            <h1 id="t-portada" className="ciu-h1">Tu barrio tiene mucho que contar</h1>
            <p className="ciu-lead">Conoce lo que pasa en Santa Cruz, descubre los problemas que vivimos y mira qué podemos mejorar juntos.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={irAProblemas} className="boton boton-1 ciu-boton-grande">Explorar los problemas del barrio <span aria-hidden="true">↓</span></button>
              <Link to="/barrios" className="boton boton-2 ciu-boton-grande">Ver mi barrio</Link>
            </div>
          </div>
          <Foto id="portada" className="aspect-[4/3] w-full" prioridad />
        </div>
      </section>

      <div className="ciu-ancho">
        {/* ---------------------------------------------------------------- los problemas */}
        <section id="problemas" aria-labelledby="t-problemas" className="ciu-seccion scroll-mt-4">
          <h2 id="t-problemas" className="ciu-h2">Lo que vivimos todos los días</h2>
          <p className="ciu-sub">Cuatro situaciones que muchos vecinos reconocen. Cada una trae una cifra, explicada en palabras de todos los días.</p>
          <ConDatos estado={ciu}>
            {(c) => (
              <ul className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {HISTORIAS.map((h) => (
                  <li key={h.id} className="flex"><TarjetaHistoria h={h} c={c} barrio={barrio || undefined} /></li>
                ))}
              </ul>
            )}
          </ConDatos>
        </section>


        <section aria-labelledby="t-mapa-completo" className="ciu-seccion !pb-0">
          <div className="ciu-mapa-invita">
            <div>
              <h2 id="t-mapa-completo" className="ciu-h2">Mira todo Santa Cruz en el mapa</h2>
              <p className="ciu-parrafo mt-2">El mapa completo del barrio: estaciones del Metro y Metrocable, colegios, parques, huecos reportados y más. Elige un tema, toca un lugar y mira qué dicen los datos.</p>
            </div>
            <Link to="/mapa-vecinos" className="boton boton-1 ciu-boton-grande shrink-0">Abrir el mapa completo</Link>
          </div>
        </section>

        {/* ---------------------------------------------------------------- tu barrio */}
        <section aria-labelledby="t-barrio" className="ciu-seccion">
          <h2 id="t-barrio" className="ciu-h2">¿Y en tu barrio?</h2>
          <p className="ciu-sub">Elige tu barrio y mira cómo se ve en cada tema.</p>
          <ConDatos estado={ciu}>
            {(c) => {
              const b = c.barrios.find((x) => x.codigo === barrio);
              return (
                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                  <div>
                    <label htmlFor="mi-barrio" className="etiqueta-campo">Mi barrio es</label>
                    <select id="mi-barrio" className="campo !py-3 !text-base" value={barrio} onChange={(e) => setBarrio(e.target.value)}>
                      <option value="">Elige uno de los 11 barrios</option>
                      {c.barrios.map((x) => <option key={x.codigo} value={x.codigo}>{x.nombre}</option>)}
                    </select>
                    {b && <Link to={`/barrios/${b.codigo}`} className="siguiente-a mt-3 !text-base">Ver toda la ficha de {b.nombre} →</Link>}
                  </div>
                  {b ? (
                    <ul className="grid gap-3 sm:grid-cols-2" aria-live="polite">
                      {resumenBarrio(b).map((r) => {
                        const h = HISTORIAS.find((x) => x.id === r.id)!;
                        return (
                          <li key={r.id}>
                            <Link to={`/historias/${r.id}?barrio=${b.codigo}`} className="ciu-dato" style={{ ["--tono" as string]: h.color }}>
                              <span className="ciu-tema">{r.titulo}</span>
                              <span className="mt-1 block leading-snug">{r.texto}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="vacio text-tinta-suave">Cuando elijas tu barrio aparecerán aquí cuatro datos sobre él. Se recuerda en este dispositivo, no se envía a ningún lado.</p>
                  )}
                </div>
              );
            }}
          </ConDatos>
        </section>

        {/* ---------------------------------------------------------------- qué es OTEA */}
        <section aria-labelledby="t-otea" className="ciu-seccion">
          <h2 id="t-otea" className="ciu-h2">¿Qué es OTEA?</h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div>
              <p className="ciu-parrafo">OTEA es un observatorio de Santa Cruz hecho por vecinos y estudiantes. Junta datos que hoy están regados en muchos lugares y los pone en un solo sitio, en lenguaje sencillo, con la fuente de cada cifra.</p>
              <ul className="ciu-pasos">
                <li><span><strong>Reúne</strong> datos de la Alcaldía, el DANE y otras entidades.</span></li>
                <li><span><strong>Los explica</strong> con mapas y ejemplos fáciles de entender.</span></li>
                <li><span><strong>Muestra de dónde salen</strong> y qué todavía no se sabe.</span></li>
              </ul>
            </div>
            <div className="ciu-no">
              <h3 className="ciu-h3">Lo que OTEA no hace</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-tinta-suave">
                <li>No arregla los problemas ni ejecuta obras.</li>
                <li>No recibe solicitudes oficiales: para eso están los canales de la Alcaldía, como ReportesMED.</li>
                <li>No reemplaza a la JAC ni a la JAL. Les da cifras para que conversen con más información.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- participa */}
        <section aria-labelledby="t-participa" className="ciu-seccion">
          <div className="ciu-cierre">
            <div>
              <h2 id="t-participa" className="ciu-h2">Esto se mejora conversando</h2>
              <p className="ciu-parrafo mt-3">Lo que ves aquí es un punto de partida. Cuéntale a tus vecinos, llévalo a la JAC y dinos qué falta: los datos no ven todo lo que ocurre en una cuadra.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/participacion" className="boton boton-1 ciu-boton-grande">Dejar mi opinión</Link>
                <Link to="/historias" className="boton boton-2 ciu-boton-grande">Ver el mapa de los problemas</Link>
              </div>
              <p className="mt-4 text-[0.85rem] text-tinta-tenue">Participa es una prueba: lo que escribas se guarda solo en tu dispositivo y todavía no llega a ninguna entidad.</p>
            </div>
            <Compartir
              titulo="Pásale OTEA a un vecino"
              mensaje="Mira cómo se ven en datos algunos problemas de Santa Cruz (Comuna 2 de Medellín): caminar al Metro, las basuras, los huecos y el espacio público. Cada cifra trae su fuente."
              ruta="/"
            />
          </div>
        </section>

        {/* ---------------------------------------------------------------- pie */}
        <footer className="ciu-pie">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-[0.9rem] leading-relaxed text-tinta-suave">
              ¿Trabajas en una JAC, una JAL, una entidad o analizas datos? Todo el detalle de las cifras, los métodos y las fuentes está en <Link to="/tecnico" className="font-semibold underline">OTEA Técnico</Link>.
            </p>
            <Link to="/tecnico" className="boton boton-2 !text-sm">Abrir OTEA Técnico</Link>
          </div>
          <div className="mt-4"><AvisoFotos /></div>
          <p className="mono mt-4 text-[0.72rem] text-tinta-tenue">OTEA · Observatorio territorial de Santa Cruz · Territorio INN 2026, reto 4 · <Link to="/fuentes" className="underline">Fuentes de los datos</Link></p>
        </footer>
      </div>
    </div>
  );
}
