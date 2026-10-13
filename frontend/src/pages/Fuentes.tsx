import { useMemo, useState } from "react";
import { ConDatos, EtiquetaTipo } from "../components/Estado";
import { useDatos } from "../lib/datos";
import { fecha, num } from "../lib/formato";
import type { Calidad, Fuente, Metodologia, TipoDato } from "../lib/tipos";
import { Fragment } from "react";
import { Cabecera, Relacionados } from "../components/Pagina";

function Tabla({ fuentes }: { fuentes: Fuente[] }) {
  const [tipo, setTipo] = useState<TipoDato | "todas">("todas");
  const filtradas = useMemo(() => (tipo === "todas" ? fuentes : fuentes.filter((f) => f.tipo === tipo)), [fuentes, tipo]);
  const conteo = (t: TipoDato) => fuentes.filter((f) => f.tipo === t).length;
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tipo de dato">
        {(["todas", "oficial", "tercero", "campo", "demostrativo"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            aria-pressed={tipo === t}
            className={`rounded-full border px-3 py-1 text-sm ${tipo === t ? "border-acento bg-acento text-white" : "border-nivel hover:bg-papel-hondo"}`}
          >
            {t === "todas" ? `Todas (${fuentes.length})` : `${t[0].toUpperCase()}${t.slice(1)} (${conteo(t)})`}
          </button>
        ))}
      </div>
      {filtradas.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-nivel p-4 text-sm text-tinta-suave">
          No hay fuentes de este tipo todavía. Los datos de campo llegarán con el levantamiento de andenes y escaleras, y en esta
          versión no se usan datos demostrativos.
        </p>
      ) : (
        <div className="relative mt-3 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-nivel text-left text-tinta-suave">
                <th className="py-2 pr-3 font-semibold">Fuente</th>
                <th className="py-2 pr-3 font-semibold">Tipo</th>
                <th className="py-2 pr-3 text-right font-semibold">Registros descargados</th>
                <th className="py-2 pr-3 font-semibold">Cobertura</th>
                <th className="py-2 pr-3 font-semibold">Fechas</th>
                <th className="py-2 pr-3 font-semibold">Estado</th>
                <th className="py-2 font-semibold"><span className="sr-only">Detalle</span></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <Fragment key={f.id}>
                <tr className="border-b border-nivel/70 align-top">
                  <td className="py-2 pr-3">
                    <a href={f.url_servicio} target="_blank" rel="noreferrer" className="font-medium text-cable underline-offset-2 hover:underline">
                      {f.nombre}
                    </a>
                    <span className="block text-xs text-tinta-suave">{f.entidad}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <EtiquetaTipo tipo={f.tipo} />
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(f.registros)}</td>
                  <td className="py-2 pr-3 text-xs text-tinta-suave">{f.cobertura}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs">
                    Descargada: {fecha(f.fecha_descarga)}
                    <span className="block text-tinta-tenue">
                      {f.ultima_actualizacion_en_datos ? `En los datos: ${fecha(f.ultima_actualizacion_en_datos)}` : "La capa no informa fecha"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {f.estado === "ok" ? (
                      <span className="text-marca">Verificada</span>
                    ) : (
                      <span className="text-ladrillo" title={f.error ?? ""}>
                        {f.estado}
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      aria-expanded={abierta === f.id}
                      onClick={() => setAbierta(abierta === f.id ? null : f.id)}
                      className="whitespace-nowrap rounded-md border border-nivel px-2 py-1 text-xs hover:bg-papel-hondo"
                    >
                      {abierta === f.id ? "Ocultar" : "Ver trazabilidad"}
                    </button>
                  </td>
                </tr>
                {abierta === f.id && (
                  <tr className="border-b border-nivel/70 bg-papel-hondo/50">
                    <td colSpan={7} className="px-3 py-3">
                      <dl className="grid gap-x-6 gap-y-2 text-xs md:grid-cols-2">
                        {[
                          ["Clase de dato", f.clase],
                          ["Unidad espacial", f.unidad_espacial],
                          ["Periodo de referencia", f.periodo_referencia],
                          ["Sistema de coordenadas", f.crs],
                          ["Campos usados", f.campos_usados?.join(", ")],
                          ["Licencia o condición de uso", f.licencia],
                          ["Transformaciones", f.transformaciones],
                          ["Limitaciones", f.limitaciones],
                          ["Formato de origen", f.formato_origen],
                          ["Consulta exacta", f.consulta],
                        ]
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <div key={k as string}>
                              <dt className="font-semibold text-tinta">{k}</dt>
                              <dd className="break-words text-tinta-suave">{v}</dd>
                            </div>
                          ))}
                      </dl>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function Fuentes() {
  const fuentes = useDatos<Fuente[]>("fuentes.json");
  const calidad = useDatos<Calidad>("calidad.json");
  const metodologia = useDatos<Metodologia>("metodologia.json");

  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12 overflow-x-clip">
      <Cabecera etiqueta="Fuentes y calidad" icono="fuentes" titulo="De dónde sale cada dato"
        texto="Cada capa del mapa y cada indicador sale de una de estas fuentes. Se descargan con un programa que guarda la consulta exacta, la fecha y el número de registros. Lo que no se pudo verificar aparece como pendiente." />

      <section>
        <h2 className="mb-3 text-xl font-semibold">Fuentes verificadas</h2>
        <ConDatos estado={fuentes}>{(f) => <Tabla fuentes={f} />}</ConDatos>
        <p className="mt-3 max-w-3xl text-sm text-tinta-suave">
          Condiciones de uso: los geoportales de la Alcaldía de Medellín y del DANE son públicos, pero antes de publicar la
          plataforma en internet hay que confirmar con cada entidad las condiciones para redistribuir sus datos.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Cómo se calcula cada indicador</h2>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">
          Cada número de la plataforma dice de dónde sale y qué tan firme es: dato oficial publicado, dato descargado y
          procesado, cálculo derivado o estimación.
        </p>
        <ConDatos estado={metodologia}>
          {(m) => (
            <>
              <div className="relative mt-3 overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-nivel text-left text-tinta-suave">
                      <th className="py-2 pr-3 font-semibold">Indicador</th>
                      <th className="py-2 pr-3 font-semibold">Fórmula</th>
                      <th className="py-2 pr-3 font-semibold">Unidad</th>
                      <th className="py-2 pr-3 font-semibold">Clase</th>
                      <th className="py-2 font-semibold">Limitaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.indicadores.map((i) => (
                      <tr key={i.id} className="border-b border-nivel/70 align-top">
                        <td className="py-2 pr-3">
                          <span className="font-medium">{i.nombre}</span>
                          <span className="block text-xs italic text-tinta-tenue">{i.nombre_en}</span>
                          <span className="block text-xs text-tinta-tenue">Año: {i.anio}</span>
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          <code className="whitespace-pre-wrap">{i.formula}</code>
                          <span className="mt-1 block text-tinta-suave">{i.metodo}</span>
                        </td>
                        <td className="py-2 pr-3 text-xs">{i.unidad}</td>
                        <td className="py-2 pr-3 text-xs">{i.clase}</td>
                        <td className="py-2 text-xs text-tinta-suave">{i.limitaciones}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 className="mt-6 font-semibold">Glosario español / inglés</h3>
              <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {m.glosario.map((g) => (
                  <li key={g.es}>
                    {g.es} <span className="italic text-tinta-tenue">({g.en})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ConDatos>
      </section>

      <ConDatos estado={calidad}>
        {(c) => (
          <>
            <section>
              <h2 className="text-lg font-semibold">Fuentes por verificar</h2>
              <ul className="mt-3 divide-y divide-nivel border-y border-nivel">
                {c.por_verificar.map((p) => (
                  <li key={p.fuente} className="grid gap-1 py-3 md:grid-cols-[18rem_1fr] md:gap-6">
                    <div>
                      <p className="font-medium">{p.fuente}</p>
                      <p className="break-all text-xs text-tinta-tenue">{p.donde}</p>
                    </div>
                    <div className="text-sm">
                      <p>{p.para}</p>
                      <p className="mt-0.5 text-tinta-suave">{p.estado}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold">Notas de calidad</h2>
              <dl className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-2">
                {c.notas.map((n) => (
                  <div key={n.tema}>
                    <dt className="font-semibold">{n.tema}</dt>
                    <dd className="mt-0.5 text-sm text-tinta-suave">{n.nota}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}
      </ConDatos>
      <Relacionados ids={["datos", "mapa", "indicadores"]} />
    </div>
  );
}
