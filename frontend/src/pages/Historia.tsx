import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { HACER, HISTORIAS, historiaPorId, useCiudadano, useMiBarrio } from "../lib/ciudadano";
import { ConDatos } from "../components/Estado";
import { Fuente } from "../components/Pagina";
import Foto from "../components/ciudadano/Foto";
import MapaCiudadano from "../components/ciudadano/MapaCiudadano";
import Compartir from "../components/ciudadano/Compartir";

/** Una historia: del hecho cotidiano a la cifra, de ahí a lo que se puede hacer y a los datos que la respaldan. */
export default function Historia() {
  const { id } = useParams();
  const h = historiaPorId(id);
  const ciu = useCiudadano();
  const [params] = useSearchParams();
  const [, setBarrio] = useMiBarrio();
  const delEnlace = params.get("barrio");
  useEffect(() => { if (delEnlace) setBarrio(delEnlace); }, [delEnlace, setBarrio]);
  useEffect(() => { document.getElementById("contenido")?.scrollTo({ top: 0 }); }, [id]);
  if (!h) return <Navigate to="/historias" replace />;

  const i = HISTORIAS.findIndex((x) => x.id === h.id);
  const sig = HISTORIAS[(i + 1) % HISTORIAS.length];
  const mundo = { ["--tono" as string]: h.color };

  return (
    <article className="ciu" style={mundo}>
      <header className="ciu-hero ciu-hero-historia">
        <div className="ciu-ancho">
          <nav aria-label="Ruta" className="migas">
            <Link to="/">Inicio</Link><span aria-hidden="true">/</span>
            <Link to="/historias">Los problemas</Link><span aria-hidden="true">/</span>
            <span aria-current="page" className="text-tinta">{h.titulo}</span>
          </nav>
          <div className="mt-5 grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
            <div>
              <p className="ciu-tema"><span aria-hidden="true">{h.numero}</span> {h.titulo}</p>
              <h1 className="ciu-h1 !text-[clamp(2rem,4.6vw,3.4rem)]">{h.frase}</h1>
              <p className="ciu-lead">{h.pregunta}</p>
            </div>
            <Foto id={h.foto} className="aspect-[4/3] w-full" prioridad />
          </div>
        </div>
      </header>

      <div className="ciu-ancho">
        {/* A. situación */}
        <section aria-labelledby="h-situacion" className="ciu-seccion !pt-10">
          <h2 id="h-situacion" className="ciu-h2">¿Qué está pasando?</h2>
          <div className="mt-4 max-w-[46rem] space-y-3">{h.situacion.map((t) => <p key={t} className="ciu-parrafo">{t}</p>)}</div>
        </section>

        {/* B. lo que sabemos */}
        <section aria-labelledby="h-sabemos" className="ciu-seccion">
          <h2 id="h-sabemos" className="ciu-h2">Lo que sabemos</h2>
          <ConDatos estado={ciu}>
            {(c) => {
              const k = h.cifra(c);
              return (
                <>
                  <div className="ciu-cifra-caja">
                    <p className="ciu-cifra">{k.valor}</p>
                    <div>
                      <p className="text-[1.2rem] font-semibold leading-snug">{k.texto}</p>
                      <p className="mt-2 text-[1.05rem] leading-relaxed text-tinta-suave">{k.traduccion}</p>
                      {k.otras.map((t) => <p key={t} className="mt-2 text-[0.98rem] leading-relaxed text-tinta-suave">{t}</p>)}
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {h.fuentes.map((f) => <Fuente key={f.ids.join()} ids={f.ids} calculo={f.calculo} clase={f.clase} texto={f.texto} />)}
                  </div>
                </>
              );
            }}
          </ConDatos>
          <div className="mt-8"><MapaCiudadano fijo={h.id} /></div>
        </section>

        {/* C. por qué importa */}
        <section aria-labelledby="h-importa" className="ciu-seccion">
          <h2 id="h-importa" className="ciu-h2">¿Por qué nos importa?</h2>
          <div className="mt-4 max-w-[46rem] space-y-3">{h.porQue.map((t) => <p key={t} className="ciu-parrafo">{t}</p>)}</div>
        </section>

        {/* D. qué podemos hacer */}
        <section aria-labelledby="h-hacer" className="ciu-seccion">
          <h2 id="h-hacer" className="ciu-h2">¿Qué podemos hacer?</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {HACER[h.id].map((a, n) => (
              <li key={a.titulo} className="ciu-accion">
                <span className="ciu-accion-n" aria-hidden="true">{n + 1}</span>
                <h3 className="ciu-h3 !mt-0">{a.titulo}</h3>
                <p className="mt-2 leading-relaxed text-tinta-suave">{a.texto}</p>
                {a.to && <Link to={a.to} className="siguiente-a mt-3">Ir allí →</Link>}
                {a.externo && <a href={a.externo} target="_blank" rel="noopener noreferrer" className="siguiente-a mt-3">Ver cómo reportar (sitio de la Alcaldía) ↗</a>}
              </li>
            ))}
          </ul>
        </section>

        {/* lo que no sabemos */}
        <section aria-labelledby="h-nosabemos" className="ciu-seccion">
          <div className="ciu-no">
            <h2 id="h-nosabemos" className="ciu-h3 !mt-0">Lo que todavía no sabemos</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-tinta-suave">{h.noSabemos.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </section>

        {/* E. profundizar */}
        <section aria-labelledby="h-datos" className="ciu-seccion">
          <h2 id="h-datos" className="ciu-h2">Para quien quiere ver los datos</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to={h.tecnica[0].to} className="boton boton-1 ciu-boton-grande">Ver los datos que respaldan este problema</Link>
            {h.tecnica.slice(1).map((t) => <Link key={t.to} to={t.to} className="boton boton-2 !whitespace-normal text-left">{t.texto}</Link>)}
          </div>
          <details className="metodo mt-5">
            <summary>Cómo se calculó</summary>
            <div className="metodo-cuerpo"><p>{h.metodo}</p></div>
          </details>
        </section>

        {/* F. compartir */}
        <section aria-labelledby="h-compartir" className="ciu-seccion">
          <ConDatos estado={ciu}>
            {(c) => <Compartir mensaje={h.compartir(c)} ruta={`/historias/${h.id}`} titulo="Compártelo con tus vecinos" />}
          </ConDatos>
          <span id="h-compartir" className="sr-only">Compartir</span>
        </section>

        <nav aria-label="Otros problemas" className="ciu-seccion !pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-nivel">
          <Link to="/historias" className="siguiente-a !text-base">← Todos los problemas</Link>
          <Link to={`/historias/${sig.id}`} className="boton boton-2">Siguiente: {sig.titulo} →</Link>
        </nav>
      </div>
    </article>
  );
}
