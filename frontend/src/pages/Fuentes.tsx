import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConDatos } from "../components/Estado";
import { useDatos } from "../lib/datos";
import { fecha, num } from "../lib/formato";
import type { Calidad, Fuente, Metodologia } from "../lib/tipos";
import { Aviso, Cabecera, EtiquetaClase, Kpi, Relacionados, Seccion, claseDeFuente, type ClaseDato } from "../components/Pagina";

/** Cómo leer las etiquetas de clase que aparecen en todo el sitio. */
const LEYENDA: { c: ClaseDato; d: string }[] = [
  { c: "oficial", d: "Publicado por una entidad pública en su geoportal o en datos abiertos. Se descarga tal cual." },
  { c: "entregado", d: "Una entidad se lo pasó al proyecto. No es abierto: solo se muestra lo que el acuerdo permite." },
  { c: "derivado", d: "Lo calcula OTEA cruzando fuentes. El método está escrito y se puede repetir." },
  { c: "ciudadano", d: "Lo reporta la gente (reclamos, solicitudes). Dice dónde hay quejas, no dónde está el problema completo." },
  { c: "prensa", d: "Noticias de medios. Sirven de contexto, no de medición." },
  { c: "demostrativo", d: "Ejemplo para mostrar cómo funcionaría algo. No es un dato real." },
  { c: "pendiente", d: "Fuente conocida que todavía no se descargó ni se comprobó." },
];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Detalle({ f }: { f: Fuente }) {
  const filas: [string, string | undefined | null][] = [
    ["Licencia o condición de uso", f.licencia],
    ["Qué se le hizo al dato", f.transformaciones],
    ["Limitaciones", f.limitaciones],
    ["Unidad espacial", f.unidad_espacial],
    ["Periodo de referencia", f.periodo_referencia],
    ["Campos usados", f.campos_usados?.join(", ")],
    ["Formato de origen", f.formato_origen],
    ["Sistema de coordenadas", f.crs],
    ["Consulta exacta", f.consulta],
  ];
  return (
    <div className="mt-3 grid gap-x-8 gap-y-3 border-t border-nivel pt-3 text-sm md:grid-cols-2">
      {filas.filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className={k === "Consulta exacta" ? "md:col-span-2" : ""}>
          <p className="font-semibold">{k}</p>
          <p className={`mt-0.5 break-words text-tinta-suave ${k === "Consulta exacta" ? "font-mono text-xs" : ""}`}>{v}</p>
        </div>
      ))}
      {f.url_servicio && (
        <p className="md:col-span-2">
          <a href={f.url_servicio} target="_blank" rel="noreferrer" className="fuente-enlace">Abrir el servicio original ↗</a>
        </p>
      )}
    </div>
  );
}

function Catalogo({ fuentes }: { fuentes: Fuente[] }) {
  const [params] = useSearchParams();
  const pedida = params.get("f");
  const [q, setQ] = useState("");
  const [clase, setClase] = useState<ClaseDato | "todas">("todas");
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(pedida ? [pedida] : []));
  const [todas, setTodas] = useState(false);

  // Si se llega desde una página con ?f=<id>, abre esa ficha y baja hasta ella.
  useEffect(() => {
    if (!pedida) return;
    setQ(""); setClase("todas");
    setAbiertas((a) => new Set(a).add(pedida));
    const t = window.setTimeout(() => document.getElementById(`f-${pedida}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    return () => window.clearTimeout(t);
  }, [pedida]);

  const conClase = useMemo(() => fuentes.map((f) => ({ f, c: claseDeFuente(f) })), [fuentes]);
  const clasesHay = useMemo(() => Array.from(new Set(conClase.map((x) => x.c))), [conClase]);
  const filtradas = useMemo(() => {
    const t = sinTildes(q.trim());
    return conClase.filter(({ f, c }) => (clase === "todas" || c === clase) && (!t || sinTildes(`${f.nombre} ${f.entidad} ${f.cobertura}`).includes(t)));
  }, [conClase, q, clase]);

  const POR_PAGINA = 12;
  const filtrando = q.trim() !== "" || clase !== "todas";
  const pedidaLejos = !!pedida && filtradas.findIndex(({ f }) => f.id === pedida) >= POR_PAGINA;
  const visibles = todas || filtrando || pedidaLejos ? filtradas : filtradas.slice(0, POR_PAGINA);

  const alternar = (id: string) => setAbiertas((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[16rem] flex-1">
          <span className="etiqueta-campo">Buscar una fuente</span>
          <input className="campo mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej.: andenes, DANE, siniestros" />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por clase de dato">
          <button type="button" className="chip" aria-pressed={clase === "todas"} onClick={() => setClase("todas")}>Todas ({fuentes.length})</button>
          {clasesHay.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={clase === c} onClick={() => setClase(c)}>
              {c === "oficial" ? "Oficiales" : c === "entregado" ? "Entregadas" : c} ({conClase.filter((x) => x.c === c).length})
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-tinta-tenue" aria-live="polite">{filtradas.length === fuentes.length ? `${fuentes.length} fuentes` : `${filtradas.length} de ${fuentes.length} fuentes`}</p>

      {filtradas.length === 0 ? (
        <div className="vacio mt-3">Ninguna fuente coincide con “{q}”. Prueba con el nombre de la entidad o del tema.</div>
      ) : (
        <ul className="mt-2 divide-y divide-nivel border-y border-nivel">
          {visibles.map(({ f, c }) => {
            const abierta = abiertas.has(f.id);
            return (
              <li key={f.id} id={`f-${f.id}`} className={`scroll-mt-28 py-3 ${pedida === f.id ? "bg-menta-2/60 -mx-3 px-3 rounded-lg" : ""}`}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-[minmax(0,1fr)_9rem_9rem_auto] md:items-start md:gap-5">
                  <div className="col-span-2 min-w-0 md:col-span-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{f.nombre}</p>
                      <EtiquetaClase clase={c} />
                    </div>
                    <p className="mt-0.5 text-sm text-tinta-suave">{f.entidad}</p>
                    <p className="mt-0.5 text-xs text-tinta-tenue">{f.cobertura}</p>
                  </div>
                  <p className="text-sm">
                    <span className="block text-xs text-tinta-tenue">Registros</span>
                    <span className="tabular-nums">{f.registros ? num(f.registros) : "—"}</span>
                  </p>
                  <p className="text-sm">
                    <span className="block text-xs text-tinta-tenue">{f.ultima_actualizacion_en_datos ? "Datos a" : "Descargada"}</span>
                    {fecha(f.ultima_actualizacion_en_datos ?? f.fecha_descarga)}
                    {f.estado !== "ok" && <span className="block text-xs text-peligro" title={f.error ?? ""}>{f.estado}</span>}
                  </p>
                  <button type="button" aria-expanded={abierta} onClick={() => alternar(f.id)} className="chip col-span-2 justify-self-start whitespace-nowrap md:col-span-1">
                    {abierta ? "Ocultar" : "Ver detalle"}
                  </button>
                </div>
                {abierta && <Detalle f={f} />}
              </li>
            );
          })}
        </ul>
      )}
      {visibles.length < filtradas.length && (
        <button type="button" className="boton boton-2 mt-4" onClick={() => setTodas(true)}>Ver las {filtradas.length - visibles.length} fuentes restantes</button>
      )}
    </>
  );
}

export default function Fuentes() {
  const fuentes = useDatos<Fuente[]>("fuentes.json");
  const calidad = useDatos<Calidad>("calidad.json");
  const metodologia = useDatos<Metodologia>("metodologia.json");

  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] overflow-x-clip px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Fuentes y calidad" icono="fuentes" titulo="De dónde sale cada dato"
        pregunta="¿Puedo confiar en este número y de dónde viene?"
        texto="Cada capa del mapa y cada indicador sale de una de estas fuentes. Un programa las descarga y guarda la consulta exacta, la fecha y el número de registros. Lo que no se pudo comprobar aparece como pendiente, no como dato." />

      <ConDatos estado={fuentes}>
        {(fs) => {
          const entidades = new Set(fs.map((f) => f.entidad.split(",")[0].split("(")[0].trim())).size;
          const ultima = fs.map((f) => f.fecha_descarga ?? "").sort().reverse()[0] || null;
          const entregadas = fs.filter((f) => claseDeFuente(f) === "entregado").length;
          return (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              <Kpi valor={num(fs.length)} texto="fuentes cargadas en la plataforma" nota={`${fs.filter((f) => f.estado === "ok").length} descargadas y revisadas sin error`} />
              <Kpi valor={num(entidades)} texto="entidades distintas" nota="Casi todo viene de la Alcaldía de Medellín y del DANE" />
              <Kpi valor={num(entregadas)} tono={entregadas ? "ambar" : "verde"} texto="entregadas, no abiertas" nota="Se muestran solo en la forma que permite el acuerdo" />
              <Kpi valor={ultima ? fecha(ultima) : "—"} texto="última descarga" nota="Fecha en que el programa trajo los datos, no la fecha del dato" />
            </div>
          );
        }}
      </ConDatos>

      <Seccion id="t-etiquetas" titulo="Cómo leer las etiquetas" pregunta="¿Qué tan firme es cada dato?"
        texto="En todo el sitio, al lado de cada cifra aparece una de estas etiquetas. Dicen de qué tipo es el dato, no si es bueno o malo.">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {LEYENDA.map((l) => (
            <div key={l.c}>
              <dt><EtiquetaClase clase={l.c} /></dt>
              <dd className="mt-1.5 text-sm text-tinta-suave">{l.d}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      <Seccion id="t-catalogo" titulo="Catálogo de fuentes" pregunta="¿Quién publicó este dato, cuándo y con qué límites?"
        texto="Abre cualquier fuente para ver su licencia, qué se le hizo al dato, sus limitaciones y la consulta exacta con la que se descargó.">
        <ConDatos estado={fuentes}>{(f) => <Catalogo fuentes={f} />}</ConDatos>
        <div className="mt-5">
          <Aviso tono="ojo" titulo="Antes de publicar en internet">
            Los geoportales de la Alcaldía y del DANE son públicos, pero hay que confirmar con cada entidad las condiciones para redistribuir sus datos.
            Los datos de residuos los entregaron Emvarias y EPM: solo se publican las toneladas sumadas por barrio, sin rutas, horarios ni puntos.
          </Aviso>
        </div>
      </Seccion>

      <ConDatos estado={calidad}>
        {(c) => (
          <Seccion id="t-pendientes" titulo="Lo que falta comprobar" pregunta="¿Qué no sabemos todavía?"
            texto="Fuentes que mejorarían los análisis pero que aún no se descargaron o no respondieron. Mientras tanto, los módulos que las necesitan lo dicen.">
            <ul className="divide-y divide-nivel border-y border-nivel">
              {c.por_verificar.map((p) => (
                <li key={p.fuente} className="grid gap-1 py-3 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{p.fuente}</p><EtiquetaClase clase="pendiente" /></div>
                    <p className="break-all text-xs text-tinta-tenue">{p.donde}</p>
                  </div>
                  <div className="text-sm">
                    <p>{p.para}</p>
                    <p className="mt-0.5 text-tinta-suave">{p.estado}</p>
                  </div>
                </li>
              ))}
            </ul>
            <h3 className="fuente-titulo mt-8 text-lg font-semibold">Notas de calidad</h3>
            <dl className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-2">
              {c.notas.map((n) => (
                <div key={n.tema}>
                  <dt className="font-semibold">{n.tema}</dt>
                  <dd className="mt-0.5 text-sm text-tinta-suave">{n.nota}</dd>
                </div>
              ))}
            </dl>
          </Seccion>
        )}
      </ConDatos>

      <ConDatos estado={metodologia}>
        {(m) => (
          <Seccion id="t-metodo" titulo="Cómo se calcula cada indicador" pregunta="¿Qué fórmula hay detrás de cada número?"
            texto={`${m.indicadores.length} indicadores con su fórmula, unidad, año y limitaciones. La explicación con gráficos está en Indicadores.`}>
            <ul className="divide-y divide-nivel border-y border-nivel">
              {m.indicadores.map((i) => (
                <li key={i.id}>
                  <details className="group py-3">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold group-open:text-marca">{i.nombre}</span>
                      <span className="text-xs text-tinta-tenue">{i.unidad} · {i.anio}</span>
                      <span className="ml-auto text-xs text-tinta-tenue group-open:hidden">Ver fórmula</span>
                    </summary>
                    <div className="mt-2 grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <p className="font-semibold">Fórmula</p>
                        <code className="mt-0.5 block whitespace-pre-wrap text-xs">{i.formula}</code>
                        <p className="mt-1 text-tinta-suave">{i.metodo}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Qué no dice</p>
                        <p className="mt-0.5 text-tinta-suave">{i.limitaciones}</p>
                        <p className="mt-1 text-xs text-tinta-tenue">Clase: {i.clase}</p>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
            <details className="metodo mt-6">
              <summary>Glosario español / inglés ({m.glosario.length} términos)</summary>
              <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {m.glosario.map((g) => (
                  <li key={g.es}>{g.es} <span className="italic text-tinta-tenue">({g.en})</span></li>
                ))}
              </ul>
            </details>
          </Seccion>
        )}
      </ConDatos>

      <Relacionados ids={["datos", "indicadores", "mapa"]} />
    </div>
  );
}
