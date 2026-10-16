import { Link, useNavigate } from "react-router-dom";
import { PASOS, useRecorrido } from "../lib/recorrido";
import { RETO, hayApoyo } from "../lib/reto";
import Foto from "../components/ciudadano/Foto";

/** Portada del recorrido de presentación: qué se va a ver, en qué orden y qué decir. */
export default function Recorrido() {
  const [, setPaso] = useRecorrido();
  const ir = useNavigate();
  const empezar = (n = 0) => {
    setPaso(n);
    ir(PASOS[n].ruta);
  };
  return (
    <div className="ciu">
      <section className="historia-portada !min-h-[22rem]">
        <Foto id="rio" relleno prioridad sizes="100vw" tono="oscuro" creditoArriba />
        <div className="historia-velo" aria-hidden="true" />
        <div className="ciu-ancho relative z-[1] flex min-h-[inherit] flex-col justify-end pb-10 pt-10">
          <p className="portada-ojo">Recorrido de presentación · unos 2 minutos</p>
          <h1 className="historia-titulo">OTEA en siete paradas</h1>
          <p className="mt-4 max-w-[36rem] text-[1.15rem] leading-relaxed text-white/90">De una calle de Santa Cruz a la evidencia técnica, pasando por las páginas reales del sitio. Sirve para presentar OTEA en vivo o para grabar el video.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => empezar(0)} className="boton ciu-boton-grande portada-boton">Empezar el recorrido →</button>
          </div>
        </div>
      </section>
      <div className="ciu-ancho ciu-seccion">
        <p className="ciu-sub !mt-0">Durante el recorrido aparece una barra abajo con el paso, qué mostrar y los botones para seguir. Con <kbd className="mono rounded border border-nivel px-1">Mayús</kbd> + <kbd className="mono rounded border border-nivel px-1">→</kbd> pasa al siguiente; «Ocultar» la reduce a un botón para grabar sin estorbo.</p>
        <ol className="mt-8 grid gap-3">
          {PASOS.map((p, i) => (
            <li key={p.ruta} className="recorrido-paso">
              <span className="recorrido-n" aria-hidden="true">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="mono text-[0.7rem] text-tinta-tenue">{p.segundos} s · {p.ruta}</p>
                <h2 className="ciu-h3 !mt-0.5">{p.titulo}</h2>
                <p className="mt-1 text-tinta-suave"><strong className="text-tinta">Mostrar:</strong> {p.mostrar}</p>
                <p className="mt-1 text-tinta-suave"><strong className="text-tinta">Decir:</strong> «{p.decir}»</p>
              </div>
              <button type="button" onClick={() => empezar(i)} className="boton boton-2 shrink-0 !text-sm">Ir a este paso</button>
            </li>
          ))}
        </ol>
        <div className="ciu-no mt-8">
          <h2 className="ciu-h3 !mt-0">Antes de grabar</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-tinta-suave">
            <li>El guion completo, con tiempos y tomas, está en <code className="mono">docs/guion-video.md</code> del repositorio.</li>
            <li>El último paso invita a apoyar el proyecto. {hayApoyo() ? <>El enlace configurado es <a className="underline" href={RETO.urlApoyo} target="_blank" rel="noopener noreferrer">{RETO.urlApoyo}</a>.</> : <>Todavía no hay enlace oficial configurado: cuando exista, se pega en <code className="mono">src/lib/reto.ts</code> y aparece el botón.</>}</li>
            <li>Participa y Votación son prototipos: si se muestran, hay que decir que todavía no envían nada a ninguna entidad.</li>
          </ul>
          <Link to="/" className="siguiente-a mt-3">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
