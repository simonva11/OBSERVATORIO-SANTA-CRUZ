import { Link } from "react-router-dom";
import { HISTORIAS, useCiudadano, useMiBarrio, type Historia, type IdHistoria } from "../../lib/ciudadano";
import { useState } from "react";
import MapaBarrios, { LeyendaMapa } from "./MapaBarrios";
import { ConDatos } from "../Estado";

/**
 * Mapa ciudadano: pocos datos, un tema a la vez, cifras en palabras y una ficha corta del barrio elegido.
 * Con `fijo` muestra un solo tema (dentro de una historia); sin él deja cambiar entre los cuatro.
 */
export default function MapaCiudadano({ fijo }: { fijo?: IdHistoria }) {
  const ciu = useCiudadano();
  const [tema, setTema] = useState<IdHistoria>(fijo ?? "movilidad-mayores");
  const [barrio, setBarrio] = useMiBarrio();
  const h: Historia = HISTORIAS.find((x) => x.id === (fijo ?? tema))!;

  return (
    <ConDatos estado={ciu}>
      {(c) => {
        const valores = Object.fromEntries(c.barrios.map((b) => [b.codigo, h.mapa.valor(b)]));
        const elegido = c.barrios.find((b) => b.codigo === barrio);
        const lista = [...c.barrios].filter((b) => h.mapa.valor(b) != null).sort((a, b) => (h.mapa.valor(b) ?? 0) - (h.mapa.valor(a) ?? 0) || a.nombre.localeCompare(b.nombre, "es"));
        return (
          <div className="ciu-mapa-caja">
            {!fijo && (
              <div role="group" aria-label="Qué quieres ver en el mapa" className="flex flex-wrap gap-2">
                {HISTORIAS.map((x) => (
                  <button key={x.id} type="button" className="chip !px-4 !py-2.5 !text-base" aria-pressed={x.id === tema} onClick={() => setTema(x.id)}>
                    {x.titulo}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-4 text-[1.02rem] font-semibold">{h.mapa.etiqueta}</p>
            <div className="mt-3 grid items-start gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div>
                <MapaBarrios valores={valores} color={h.color} invertir={h.mapa.invertir} unidad={h.mapa.unidad} formato={h.mapa.formato} seleccionado={barrio} onElegir={setBarrio} />
                <LeyendaMapa color={h.color} texto={h.mapa.leyenda} invertir={h.mapa.invertir} />
              </div>
              <div>
                <div aria-live="polite" className="ciu-ficha" style={{ ["--tono" as string]: h.color }}>
                  {elegido ? (
                    <>
                      <p className="ciu-ficha-barrio">{elegido.nombre}</p>
                      {h.mapa.valor(elegido) != null ? (
                        <>
                          <p className="ciu-ficha-cifra">{h.mapa.formato(h.mapa.valor(elegido)!)}</p>
                          <p className="text-[0.82rem] text-tinta-tenue">{h.mapa.unidad}</p>
                          {h.ficha(elegido, c).map((t) => <p key={t} className="mt-2.5 leading-relaxed">{t}</p>)}
                        </>
                      ) : (
                        <p className="mt-2 leading-relaxed">Para este tema no hay dato de {elegido.nombre}. Puede que no se haya recogido o que no se pueda publicar por barrio.</p>
                      )}
                      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.92rem]">
                        <Link to={`/barrios/${elegido.codigo}`} className="siguiente-a">Ver todo el barrio</Link>
                        {!fijo && <Link to={`/historias/${h.id}`} className="siguiente-a">Leer esta historia</Link>}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="ciu-ficha-barrio">Elige un barrio</p>
                      <p className="mt-2 leading-relaxed text-tinta-suave">Toca un barrio en el mapa, o elígelo en la lista, para ver qué dicen los datos de ese tema.</p>
                    </>
                  )}
                </div>
                <label className="etiqueta-campo mt-4" htmlFor={`barrio-${fijo ?? "hub"}`}>O elige tu barrio en la lista</label>
                <select id={`barrio-${fijo ?? "hub"}`} className="campo !py-3 !text-base" value={barrio} onChange={(e) => setBarrio(e.target.value)}>
                  <option value="">Elige uno de los 11 barrios</option>
                  {c.barrios.map((b) => <option key={b.codigo} value={b.codigo}>{b.nombre}</option>)}
                </select>
              </div>
            </div>
            <details className="metodo mt-5">
              <summary>Ver los barrios como lista, de mayor a menor</summary>
              <div className="metodo-cuerpo">
                <ol className="grid gap-1 sm:grid-cols-2">
                  {lista.map((b) => (
                    <li key={b.codigo} className="flex justify-between gap-3 border-b border-nivel py-1">
                      <span>{b.nombre}</span>
                      <span className="font-semibold tabular-nums">{h.mapa.formato(h.mapa.valor(b)!)}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-[0.85rem]">Cifra: {h.mapa.unidad}. Los barrios con más gente suelen tener números más altos en conteos como toneladas o reportes.</p>
              </div>
            </details>
            <p className="mt-4 text-[0.9rem] text-tinta-suave">
              ¿Quieres ver más capas y más detalle? <Link to={h.tecnica[1]?.to ?? h.tecnica[0].to} className="font-semibold underline">Abrir el mapa completo (OTEA Técnico)</Link>
            </p>
          </div>
        );
      }}
    </ConDatos>
  );
}
