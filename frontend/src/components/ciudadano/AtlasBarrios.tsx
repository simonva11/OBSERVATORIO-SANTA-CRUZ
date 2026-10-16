import { Link } from "react-router-dom";
import { useProyeccion } from "../../lib/proyeccion";
import { HISTORIAS, resumenBarrio, type BarrioCiu } from "../../lib/ciudadano";
import { num } from "../../lib/formato";

const W = 360, H = 420;

/**
 * «Un territorio, muchas historias»: los 11 barrios como un índice de atlas. Cada barrio tiene su silueta dentro de
 * la comuna; al elegirlo aparecen sus cuatro datos y los caminos para seguir. Los nombres y límites son los del POT.
 */
export default function AtlasBarrios({ barrios, elegido, onElegir }: { barrios: BarrioCiu[]; elegido: string; onElegir: (c: string) => void }) {
  const proy = useProyeccion(W, H, 8);
  const b = barrios.find((x) => x.codigo === elegido);
  return (
    <div className="atlas">
      <ul className="atlas-indice" aria-label="Barrios de Santa Cruz">
        {barrios.map((x) => {
          const activo = x.codigo === elegido;
          return (
            <li key={x.codigo}>
              <button type="button" onClick={() => onElegir(x.codigo)} aria-pressed={activo} className="atlas-barrio">
                <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="atlas-silueta">
                  {proy?.items.map((p) => (
                    <path key={p.codigo} d={p.d} className={p.codigo === x.codigo ? "atlas-silueta-yo" : "atlas-silueta-otros"} />
                  ))}
                </svg>
                <span className="min-w-0 text-left">
                  <span className="mono block text-[0.66rem] text-tinta-tenue">{x.codigo}</span>
                  <span className="block font-semibold leading-tight">{x.nombre}</span>
                  <span className="block text-[0.8rem] text-tinta-suave">{num(x.personas)} personas</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="atlas-ficha" aria-live="polite">
        {b ? (
          <>
            <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-tinta-tenue">Barrio {b.codigo} · Censo 2018: {num(b.personas)} personas</p>
            <h3 className="ciu-h3 !text-[1.7rem]">{b.nombre}</h3>
            <ul className="mt-4 grid gap-2.5">
              {resumenBarrio(b).map((r) => {
                const h = HISTORIAS.find((x) => x.id === r.id)!;
                return (
                  <li key={r.id}>
                    <Link to={`/historias/${r.id}?barrio=${b.codigo}`} className="atlas-dato" style={{ ["--tono" as string]: h.color }}>
                      <span className="ciu-tema">{h.titulo}</span>
                      <span className="mt-0.5 block leading-snug">{r.texto}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/barrios/${b.codigo}`} className="boton boton-1">Toda la ficha de {b.nombre}</Link>
              <Link to={`/mapa-vecinos?barrio=${b.codigo}`} className="boton boton-2">Verlo en el mapa</Link>
            </div>
          </>
        ) : (
          <div>
            <h3 className="ciu-h3">Elige un barrio</h3>
            <p className="mt-2 leading-relaxed text-tinta-suave">Toca uno de los 11 barrios para ver qué dicen los datos sobre moverse, las basuras, las calles y el espacio público. Se recuerda en este dispositivo; no se envía a ningún lado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
