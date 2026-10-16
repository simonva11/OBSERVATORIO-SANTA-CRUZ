import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { HACER, HISTORIAS, historiaPorId, useCiudadano, useMiBarrio } from "../lib/ciudadano";
import { ConDatos } from "../components/Estado";
import { Fuente } from "../components/Pagina";
import Foto from "../components/ciudadano/Foto";
import MapaCiudadano from "../components/ciudadano/MapaCiudadano";
import Compartir from "../components/ciudadano/Compartir";
import Viz from "../components/ciudadano/Viz";

const PARTES = [
  ["h-problema", "El problema"],
  ["h-vemos", "Lo que vemos"],
  ["h-datos", "Los datos"],
  ["h-importa", "Por qué importa"],
  ["h-hacer", "Qué hacer"],
  ["h-mas", "Conocer más"],
  ["h-compartir", "Compartir"],
] as const;

/**
 * Una historia: la escena cotidiana (foto), el problema dicho en sencillo, lo que dicen los datos con una
 * visualización propia del tema, por qué importa, qué se puede hacer, lo que no se sabe, la evidencia técnica y
 * un mensaje para compartir. La estructura es común; la foto, la visualización y el mapa cambian con el tema.
 */
export default function Historia() {
  const { id } = useParams();
  const h = historiaPorId(id);
  const ciu = useCiudadano();
  const [params] = useSearchParams();
  const [barrio, setBarrio] = useMiBarrio();
  const delEnlace = params.get("barrio");
  useEffect(() => { if (delEnlace) setBarrio(delEnlace); }, [delEnlace, setBarrio]);
  useEffect(() => { document.getElementById("contenido")?.scrollTo({ top: 0 }); }, [id]);
  if (!h) return <Navigate to="/historias" replace />;

  const i = HISTORIAS.findIndex((x) => x.id === h.id);
  const sig = HISTORIAS[(i + 1) % HISTORIAS.length];
  const ir = (destino: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(destino)?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  return (
    <article className="ciu" style={{ ["--tono" as string]: h.color }}>
      <header className="historia-portada">
        <Foto id={h.foto} relleno prioridad sizes="100vw" tono="oscuro" creditoArriba />
        <div className="historia-velo" aria-hidden="true" />
        <div className="ciu-ancho relative z-[1] flex min-h-[inherit] flex-col justify-end pb-10 pt-8 md:pb-14">
          <nav aria-label="Ruta" className="migas">
            <Link to="/">Inicio</Link><span aria-hidden="true">/</span>
            <Link to="/historias">Los problemas</Link><span aria-hidden="true">/</span>
            <span aria-current="page">{h.titulo}</span>
          </nav>
          <p className="ciu-tema ciu-tema-claro mt-6"><span aria-hidden="true">{h.numero}</span> {h.titulo}</p>
          <h1 className="historia-titulo">{h.frase}</h1>
          <p className="mt-4 max-w-[36rem] text-[1.2rem] leading-relaxed text-white/90">{h.pregunta}</p>
        </div>
      </header>

      <nav aria-label="Partes de esta historia" className="historia-indice">
        <ol className="ciu-ancho">
          {PARTES.map(([ancla, t]) => <li key={ancla}><a href={`#${ancla}`} onClick={ir(ancla)}>{t}</a></li>)}
        </ol>
      </nav>

      <div className="ciu-ancho">
        {/* El problema */}
        <section id="h-problema" aria-labelledby="h-problema-t" className="ciu-seccion scroll-mt-14">
          <p className="ciu-ojo-seccion">El problema</p>
          <h2 id="h-problema-t" className="ciu-h2">{h.titulo}</h2>
          <div className="mt-5 space-y-3">{h.situacion.map((t) => <p key={t} className="ciu-parrafo">{t}</p>)}</div>
        </section>

        {/* Lo que vemos */}
        <section id="h-vemos" aria-labelledby="h-vemos-t" className="scroll-mt-14 pb-4">
          <p className="ciu-ojo-seccion">Lo que vemos</p>
          <h2 id="h-vemos-t" className="sr-only">Lo que vemos</h2>
          <div className={`galeria ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <Foto id={h.foto} className="aspect-[4/3] w-full md:aspect-auto md:min-h-[22rem]" sizes="(min-width: 768px) 60vw, 100vw" credito="pie" />
            <div className="flex flex-col gap-4">
              {h.fotosExtra.map((f) => <Foto key={f} id={f} className="aspect-[16/10] w-full" sizes="(min-width: 768px) 38vw, 100vw" credito="pie" />)}
              <p className="text-[1.02rem] leading-relaxed text-tinta-suave">{h.vemos}</p>
            </div>
          </div>
        </section>

        {/* Lo que nos dicen los datos */}
        <section id="h-datos" aria-labelledby="h-datos-t" className="ciu-seccion scroll-mt-14">
          <p className="ciu-ojo-seccion">Lo que nos dicen los datos</p>
          <h2 id="h-datos-t" className="ciu-h2">En números, y dicho en sencillo</h2>
          <ConDatos estado={ciu}>
            {(c) => {
              const k = h.cifra(c);
              return (
                <>
                  <div className="ciu-cifra-caja mt-6">
                    <p className="ciu-cifra">{k.valor}</p>
                    <div>
                      <p className="text-[1.2rem] font-semibold leading-snug">{k.texto}</p>
                      <p className="mt-2 text-[1.05rem] leading-relaxed text-tinta-suave">{k.traduccion}</p>
                      {k.otras.map((t) => <p key={t} className="mt-2 text-[0.98rem] leading-relaxed text-tinta-suave">{t}</p>)}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {h.fuentes.map((f) => <Fuente key={f.ids.join()} ids={f.ids} calculo={f.calculo} clase={f.clase} texto={f.texto} />)}
                  </div>
                  <div className="mt-8"><Viz id={h.id} c={c} color={h.color} barrio={barrio} /></div>
                </>
              );
            }}
          </ConDatos>
          <h3 className="ciu-h3 mt-10">¿Y en tu barrio?</h3>
          <div className="mt-4"><MapaCiudadano fijo={h.id} /></div>
        </section>

        {/* Por qué importa */}
        <section id="h-importa" aria-labelledby="h-importa-t" className="scroll-mt-14 pb-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div>
              <p className="ciu-ojo-seccion">Por qué importa</p>
              <h2 id="h-importa-t" className="ciu-h2">¿Por qué nos importa?</h2>
              <div className="mt-5 space-y-3">{h.porQue.map((t) => <p key={t} className="ciu-parrafo">{t}</p>)}</div>
            </div>
            <div className="ciu-no self-start">
              <h3 className="ciu-h3 !mt-0">Lo que todavía no sabemos</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-tinta-suave">{h.noSabemos.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
        </section>
      </div>

      {/* Qué podemos hacer */}
      <section id="h-hacer" aria-labelledby="h-hacer-t" className="banda-papel scroll-mt-14">
        <div className="ciu-ancho ciu-seccion">
          <p className="ciu-ojo-seccion">Qué hacer</p>
          <h2 id="h-hacer-t" className="ciu-h2">¿Qué podemos hacer?</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
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
        </div>
      </section>

      <div className="ciu-ancho">
        {/* Conocer más */}
        <section id="h-mas" aria-labelledby="h-mas-t" className="ciu-seccion scroll-mt-14">
          <p className="ciu-ojo-seccion">Conocer más</p>
          <h2 id="h-mas-t" className="ciu-h2">La evidencia, para quien quiera revisarla</h2>
          <p className="ciu-sub">La misma cifra, con todo su detalle, está en OTEA Técnico: tablas por barrio, el mapa con todas las capas, el método y la ficha de cada fuente.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={h.tecnica[0].to} className="boton boton-1 ciu-boton-grande">Ver los datos que respaldan este problema</Link>
            {h.tecnica.slice(1).map((t) => <Link key={t.to} to={t.to} className="boton boton-2 !whitespace-normal text-left">{t.texto}</Link>)}
          </div>
          <details className="metodo mt-5">
            <summary>Cómo se calculó</summary>
            <div className="metodo-cuerpo"><p>{h.metodo}</p></div>
          </details>
        </section>

        {/* Compartir */}
        <section id="h-compartir" aria-labelledby="h-compartir-t" className="scroll-mt-14 pb-10">
          <h2 id="h-compartir-t" className="sr-only">Compartir</h2>
          <ConDatos estado={ciu}>
            {(c) => <Compartir mensaje={h.compartir(c)} ruta={`/historias/${h.id}`} titulo="Compártelo con tus vecinos" />}
          </ConDatos>
        </section>

        <nav aria-label="Otros problemas" className="flex flex-wrap items-center justify-between gap-3 border-t border-nivel pb-16 pt-6">
          <Link to="/historias" className="siguiente-a !text-base">← Todos los problemas</Link>
          <Link to={`/historias/${sig.id}`} className="boton boton-2">Siguiente: {sig.titulo} →</Link>
        </nav>
      </div>
    </article>
  );
}
