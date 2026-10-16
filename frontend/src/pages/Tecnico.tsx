import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Position } from "geojson";
import { useDatos } from "../lib/datos";
import { num } from "../lib/formato";
import { LINEAS_METRO } from "../lib/capas";
import { Cuenta, useVisto } from "../components/Animacion";
import { useProyeccion } from "../lib/proyeccion";
import type { Coleccion, Indicadores } from "../lib/tipos";
import { useResumen } from "../lib/resumen";
import IconoNav from "../components/IconosNav";
import { Fuente } from "../components/Pagina";
import Foto from "../components/ciudadano/Foto";

const VERDE = "rgb(var(--marca))";

// ------------------------------------------------------------------ mapa de los barrios
const ANCHO = 560;
const ALTO = 600;

type Stats = Record<string, { poblacion: number | null; densidad: number }>;

/** Mapa vivo: barrios que se encienden, estaciones que laten y líneas de cable con movimiento. */
function DibujoComuna({ stats }: { stats: Stats }) {
  const proy = useProyeccion(ANCHO, ALTO, 24);
  const lineas = useDatos<Coleccion>("lineas_transporte.geojson");
  const estaciones = useDatos<Coleccion>("estaciones.geojson");
  const [encima, setEncima] = useState<string | null>(null);
  const navegar = useNavigate();

  const extras = useMemo(() => {
    if (!proy) return null;
    const { xy } = proy;
    let n = 0;
    const trazos =
      lineas.estado === "listo"
        ? lineas.datos.features.flatMap((f) => {
            const g = f.geometry;
            const nombre = String(f.properties?.linea);
            const animada = ["Línea K", "Línea L", "Línea P"].includes(nombre); // Metrocable: entra y sale
            const partes = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
            return partes.map((ps, i) => ({
              clave: `${nombre}-${i}`,
              color: LINEAS_METRO[nombre] ?? "#1d4fa0",
              animada,
              inverso: animada && n++ % 2 === 1,
              d: "M" + ps.map((p) => xy(p).map((v) => v.toFixed(1)).join(",")).join("L"),
            }));
          })
        : [];
    const puntos =
      estaciones.estado === "listo"
        ? estaciones.datos.features
            .filter((f) => f.geometry.type === "Point" && ["Metro", "Metrocable"].includes(String(f.properties?.modo)))
            .map((f) => {
              const [x, y] = xy((f.geometry as { coordinates: Position }).coordinates);
              return { nombre: String(f.properties?.nombre), linea: String(f.properties?.linea), x, y };
            })
            .filter((p) => p.x > 0 && p.x < ANCHO && p.y > 0 && p.y < ALTO)
            .map((p, i, todos) => ({ ...p, etiqueta: todos.findIndex((q) => q.nombre === p.nombre) === i }))
        : [];
    return { trazos, puntos };
  }, [proy, lineas, estaciones]);

  if (!proy || !extras) return <div className="aspect-[56/60] w-full animate-[suave_2.6s_ease-in-out_infinite] rounded-2xl bg-papel-hondo" aria-label="Cargando mapa de la comuna" />;

  const activo = proy.items.find((b) => b.codigo === encima);
  const st = activo ? stats[activo.codigo] : undefined;
  const izq = activo ? Math.min(80, Math.max(20, (activo.centro[0] / ANCHO) * 100)) : 0;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="group" aria-label="Mapa de los 11 barrios de la comuna Santa Cruz con las líneas de Metro y Metrocable cercanas">
        <defs>
          <clipPath id="marco">
            <rect width={ANCHO} height={ALTO} rx="20" />
          </clipPath>
          <filter id="brillo" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#101729" floodOpacity="0.35" />
          </filter>
        </defs>
        <g clipPath="url(#marco)">
          <rect width={ANCHO} height={ALTO} fill="rgb(var(--papel-hondo))" />
          {Array.from({ length: 12 }, (_, k) => <path key={`g${k}`} d={`M0 ${k * 52 + 20} C ${ANCHO * 0.3} ${k * 52 - 10}, ${ANCHO * 0.6} ${k * 52 + 50}, ${ANCHO} ${k * 52 + 10}`} stroke="rgb(var(--tinta))" strokeOpacity="0.06" fill="none" />)}
          {extras.trazos.map((t) => (
            <path key={t.clave} d={t.d} stroke={t.color} strokeWidth="4" fill="none" strokeLinecap="round" opacity={t.animada ? 0.3 : 0.8} />
          ))}
          {proy.items.map((b) => (
            <path
              key={b.codigo}
              d={b.d}
              fill="rgb(var(--superficie))"
              fillOpacity="0.92"
              stroke={VERDE}
              strokeOpacity="0.55"
              strokeWidth="1.4"
              className="cursor-pointer"
              onMouseEnter={() => setEncima(b.codigo)}
              onMouseLeave={() => setEncima(null)}
              onClick={() => navegar(`/barrios/${b.codigo}`)}
              tabIndex={0}
              role="link"
              aria-label={`Abrir la ficha de ${b.nombre}`}
              onFocus={() => setEncima(b.codigo)}
              onBlur={() => setEncima(null)}
              onKeyDown={(e) => e.key === "Enter" && navegar(`/barrios/${b.codigo}`)}
            />
          ))}
          {/* El barrio bajo el mouse se enciende en verde y se levanta */}
          {activo && <path d={activo.d} fill="#1f40cc" fillOpacity="0.88" stroke={VERDE} strokeWidth="2.4" filter="url(#brillo)" className="barrio-resalte pointer-events-none" />}
          {extras.trazos
            .filter((t) => t.animada)
            .map((t) => (
              <path key={`f-${t.clave}`} d={t.d} stroke={t.color} strokeWidth="4.5" fill="none" strokeLinecap="round" className={`flujo-linea pointer-events-none ${t.inverso ? "flujo-inverso" : ""}`} />
            ))}
          {proy.items.map((b) => (
            <text
              key={`t-${b.codigo}`}
              x={b.centro[0]}
              y={b.centro[1]}
              textAnchor="middle"
              className="pointer-events-none select-none"
              fontSize="13"
              fontWeight="600"
              fill={encima === b.codigo ? "rgb(var(--superficie))" : "rgb(var(--tinta))"}
              stroke={encima === b.codigo ? VERDE : "rgb(var(--superficie))"}
              strokeWidth="3"
              paintOrder="stroke"
            >
              {b.nombre.replace("Playón de Los Comuneros", "Playón").replace("Villa del Socorro", "V. del Socorro")}
            </text>
          ))}
          {extras.puntos.map((p, i) => (
            <g key={`${p.nombre}-${p.linea}`} className="pointer-events-none">
              <circle cx={p.x} cy={p.y} r="7" fill={LINEAS_METRO[p.linea] ?? "#1d4fa0"} className="pulso-estacion" style={{ animationDelay: `${(i % 4) * 0.55}s` }} />
              <circle cx={p.x} cy={p.y} r="7" fill={LINEAS_METRO[p.linea] ?? "#1d4fa0"} stroke="#fff" strokeWidth="2.5" />
              {p.etiqueta && (
                <text x={p.x + 11} y={p.y + 4} fontSize="12.5" fontWeight="600" fill="rgb(var(--tinta))" stroke="rgb(var(--papel-hondo))" strokeWidth="3" paintOrder="stroke" className="select-none">
                  {p.nombre}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
      {activo && (
        <div role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[135%] whitespace-nowrap rounded-xl bg-[#101729] px-4 py-2.5 text-white shadow-xl" style={{ left: `${izq}%`, top: `${(activo.centro[1] / ALTO) * 100}%` }}>
          <p className="text-base font-bold leading-tight">{activo.nombre}</p>
          {st && (
            <p className="text-sm text-white/80">
              {st.poblacion != null ? num(st.poblacion) : "Sin dato de"} personas · {num(Math.round(st.densidad))} por hectárea
            </p>
          )}
          <span aria-hidden="true" className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 bg-[#101729]" />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ portada
function Numero({ valor, decimales = 0, className = "" }: { valor: number; decimales?: number; className?: string }) {
  const [ref, visto] = useVisto<HTMLSpanElement>(0.2);
  return (
    <span ref={ref} className={className}>
      <Cuenta hasta={valor} decimales={decimales} activo={visto} duracion={800} />
    </span>
  );
}

/** Cómo trabaja OTEA, en cuatro pasos que sí son una secuencia. */
const PASOS = [
  { t: "Reunir", d: "Capas de la Alcaldía, el DANE e INDER que hoy viven en portales distintos, más reportes y noticias." },
  { t: "Cruzar", d: "Se ponen sobre las mismas manzanas del Censo 2018 y la misma red de calles, andenes y escaleras." },
  { t: "Calcular", d: "Minutos caminando, gente expuesta, prioridad de obras: cada cálculo con su método escrito." },
  { t: "Explicar", d: "Cada cifra dice de dónde sale, de qué fecha es y qué no se puede concluir con ella." },
];

const PARA_QUIEN = [
  {
    quien: "Si vives o trabajas en la comuna",
    usos: [
      { to: "/barrios", t: "Ver la ficha de tu barrio", d: "Gente, servicios, riesgos y reportes en una página." },
      { to: "/reclamos", t: "Saber qué ya se reportó", d: "Huecos y obras pedidas, con cuánto llevan esperando." },
      { to: "/lideres", t: "Preparar una solicitud", d: "Carta de derecho de petición, plazos y a quién acudir." },
    ],
  },
  {
    quien: "Si planeas, investigas o asesoras",
    usos: [
      { to: "/indicadores", t: "Comparar barrios", d: "Cifras por barrio con fórmula, unidad y fuente." },
      { to: "/prioridades", t: "Ordenar obras posibles", d: "Qué espacio público o andén ayudaría a más gente." },
      { to: "/fuentes", t: "Revisar las fuentes", d: "Catálogo de cada conjunto de datos, fecha y licencia." },
    ],
  },
];

export default function Tecnico() {
  const ind = useDatos<Indicadores>("indicadores.json");
  const d = ind.estado === "listo" ? ind.datos : null;
  const r = useResumen();
  const cat = useDatos<{ id: string; entidad: string }[]>("fuentes.json");
  const nFuentes = cat.estado === "listo" ? cat.datos.length : null;
  const pulso = (k: string) => r?.datos.pulso.find((p) => p.clave === k) ?? null;
  const metro = pulso("metro_10min")?.valor ?? null;
  const m49 = pulso("minutos_49")?.valor ?? null;
  const rapida = (() => {
    const m = /rápida: (\d+),(\d)/.exec(pulso("minutos_49")?.texto ?? "");
    return m ? Number(m[1] + "." + m[2]) : null;
  })();
  const espacio = pulso("espacio_publico")?.valor ?? null;
  const comuna = r?.datos.comuna;

  const stats: Stats = useMemo(
    () => Object.fromEntries((d?.barrios ?? []).map((b) => [b.codigo, { poblacion: b.poblacion_2018, densidad: b.densidad_hab_ha ?? 0 }])),
    [d],
  );

  return (
    <div className="mx-auto max-w-[84rem] px-4 lg:px-8">
      {/* ---------------------------------------------------------------- portada */}
      <section className="grid items-center gap-10 pb-12 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-12">
        <div className="min-w-0">
          <p className="mono text-[0.75rem] uppercase tracking-[0.07em] text-marca">OTEA Técnico · para JAC, JAL, entidades y analistas · Comuna 2 Santa Cruz</p>
          <h1 className="fuente-titulo mt-5 text-[clamp(2.5rem,5.4vw,4.4rem)] font-extrabold leading-[0.98] tracking-[-0.035em] [text-wrap:balance]">
            Los datos de la comuna, por fin en un solo lugar.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.2rem] leading-relaxed text-tinta-suave">
            OTEA junta lo que la Alcaldía, el DANE y la propia gente saben de Santa Cruz y lo convierte en respuestas: quién llega caminando al Metro, quién vive en ladera, qué obra ayudaría a más personas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/mapa" className="boton boton-1 !px-6 !py-3 !text-base">
              <IconoNav nombre="mapa" className="h-5 w-5" trazo={2} />
              Explorar el mapa
            </Link>
            <Link to="/propuesta" className="boton boton-2 !px-6 !py-3 !text-base">Qué hace OTEA</Link>
          </div>
          <p className="mt-5 max-w-md rounded-xl bg-papel-hondo px-4 py-3 text-[0.95rem] text-tinta-suave">
            ¿Buscas la versión para vecinos, con los problemas explicados en sencillo? <Link to="/" className="font-semibold text-marca underline">Ir a la vista ciudadana</Link>.
          </p>
          <form
            className="mt-8 max-w-md"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Ir a la ficha de un barrio"
          >
            <label htmlFor="ir-barrio" className="mono text-[0.72rem] uppercase tracking-[0.06em] text-tinta-tenue">O ve directo a tu barrio</label>
            <select
              id="ir-barrio"
              className="campo mt-1.5"
              defaultValue=""
              onChange={(e) => e.target.value && (window.location.hash = `#/barrios/${e.target.value}`)}
            >
              <option value="" disabled>Elige uno de los 11 barrios</option>
              {(d?.barrios ?? []).map((b) => <option key={b.codigo} value={b.codigo}>{b.nombre}</option>)}
            </select>
          </form>
        </div>
        <figure className="min-w-0">
          <DibujoComuna stats={stats} />
          <figcaption className="mt-2 text-sm text-tinta-tenue">Los 11 barrios con las líneas de Metro y Metrocable cercanas. Toca un barrio para abrir su ficha.</figcaption>
        </figure>
      </section>

      {/* ---------------------------------------------------------------- respaldo */}
      <section aria-label="Qué hay detrás" className="grid gap-x-8 gap-y-5 border-y border-tinta/80 py-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [comuna ? num(comuna.poblacion_2018) : "—", "personas viven en la comuna", "Censo DANE 2018"],
          [comuna ? String(comuna.barrios) : "—", "barrios, con ficha propia cada uno", "Límites oficiales del POT"],
          [nFuentes != null ? String(nFuentes) : "—", "conjuntos de datos catalogados", "Cada uno con entidad, fecha y licencia"],
          ["19", "módulos para mirar el territorio", "Del mapa a la carta de petición"],
        ].map(([v, t, n]) => (
          <div key={t}>
            <p className="fuente-titulo text-[2rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{v}</p>
            <p className="mt-1 font-medium">{t}</p>
            <p className="mono mt-0.5 text-[0.7rem] text-tinta-tenue">{n}</p>
          </div>
        ))}
      </section>

      {/* ---------------------------------------------------------------- territorio detrás de los datos */}
      <section aria-labelledby="t-territorio" className="pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-tinta-tenue">Contexto</p>
            <h2 id="t-territorio" className="fuente-titulo mt-2 max-w-3xl text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">El territorio detrás de los datos</h2>
            <p className="mt-2 max-w-2xl text-tinta-suave">Fotos de Santa Cruz publicadas por la Alcaldía (2015). Sirven para ubicar el análisis, no como evidencia: no tienen lugar exacto ni fecha reciente. Cada una lleva a la versión para vecinos del tema.</p>
          </div>
        </div>
        <div className="foto-banda mt-6">
          {[
            { foto: "calle", t: "Moverse por el barrio", to: "/historias/movilidad-mayores", tec: "/accesibilidad" },
            { foto: "pasaje", t: "Basuras y limpieza", to: "/historias/basuras", tec: "/residuos" },
            { foto: "callejon-tierra", t: "Calles y andenes", to: "/historias/huecos", tec: "/reclamos" },
          ].map((x, i) => (
            <figure key={x.foto} className="foto-banda-item">
              <Foto id={x.foto} className={i === 0 ? "aspect-[16/10] w-full md:aspect-auto md:h-full md:min-h-[15rem]" : "aspect-[16/10] w-full"} sizes={i === 0 ? "(min-width: 768px) 45vw, 100vw" : "(min-width: 768px) 28vw, 100vw"} />
              <figcaption className="text-sm">
                <span className="font-semibold">{x.t}</span>
                <span className="mt-0.5 flex flex-wrap gap-x-3"><Link to={x.tec} className="text-marca underline">Análisis técnico</Link><Link to={x.to} className="text-marca underline">Versión para vecinos</Link></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- tres preguntas */}
      <section aria-labelledby="t-preguntas" className="py-16">
        <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-tinta-tenue">Lo que OTEA ya responde</p>
        <h2 id="t-preguntas" className="fuente-titulo mt-2 max-w-3xl text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">Tres preguntas sobre moverse y vivir en la comuna</h2>
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <article className="flex flex-col border-t-2 border-tinta pt-4">
            <h3 className="text-lg font-semibold leading-snug">¿Cuánta gente llega caminando al Metro o al Metrocable en 10 minutos?</h3>
            {metro != null ? <p className="fuente-titulo mt-5 text-[4rem] font-extrabold leading-none tracking-[-0.04em] text-marca"><Numero valor={metro} decimales={1} /> %</p> : <p className="mt-5 text-tinta-tenue">Cargando…</p>}
            <p className="mt-3 text-tinta-suave">de las personas de la comuna. Las demás caminan más o dependen de un bus alimentador.</p>
            <p className="mt-3 text-sm text-tinta-tenue">Minutos estimados sobre la red de calles, andenes y escaleras, con la pendiente de cada tramo. No es un recorrido medido en campo.</p>
            <div className="mt-auto pt-5"><Fuente ids={["manzanas_censo", "vias"]} calculo="tiempo de caminata calculado por OTEA" /><Link to="/accesibilidad" className="siguiente-a mt-3">Ver cuánto camina cada barrio <IconoNav nombre="flecha" className="h-3.5 w-3.5" trazo={2.2} /></Link></div>
          </article>
          <article className="flex flex-col border-t-2 border-tinta pt-4">
            <h3 className="text-lg font-semibold leading-snug">¿Conviene caminar por la Carrera 49 para llegar a la estación?</h3>
            {m49 != null && rapida != null ? (
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div><p className="fuente-titulo text-[3.2rem] font-extrabold leading-none tracking-[-0.04em]"><Numero valor={rapida} decimales={1} /></p><p className="mt-1 text-sm text-tinta-suave">min por la ruta más rápida</p></div>
                <div><p className="fuente-titulo text-[3.2rem] font-extrabold leading-none tracking-[-0.04em] text-peligro"><Numero valor={m49} decimales={1} /></p><p className="mt-1 text-sm text-tinta-suave">min si se obliga a pasar por la 49</p></div>
              </div>
            ) : <p className="mt-5 text-tinta-tenue">Cargando…</p>}
            <p className="mt-3 text-tinta-suave">En promedio no conviene: la 49 sirve a algunos barrios y a otros los desvía.</p>
            <p className="mt-3 text-sm text-tinta-tenue">Promedio ponderado por población. Los minutos cambian mucho según dónde vivas.</p>
            <div className="mt-auto pt-5"><Fuente ids={["vias", "manzanas_censo"]} calculo="comparación de rutas hecha por OTEA" /><Link to="/corredor-49" className="siguiente-a mt-3">Ver a quién le sirve <IconoNav nombre="flecha" className="h-3.5 w-3.5" trazo={2.2} /></Link></div>
          </article>
          <article className="flex flex-col border-t-2 border-tinta pt-4">
            <h3 className="text-lg font-semibold leading-snug">¿Cuánto espacio público le toca a cada persona?</h3>
            {espacio != null ? (
              <div className="mt-5">
                <p className="fuente-titulo text-[4rem] font-extrabold leading-none tracking-[-0.04em] text-peligro"><Numero valor={espacio} decimales={2} /> <span className="text-2xl">m²</span></p>
                <div className="mt-4 grid gap-1.5" role="img" aria-label={`${String(espacio).replace(".", ",")} metros cuadrados frente a una referencia de 15`}>
                  <div className="h-2.5 rounded-full bg-papel-hondo"><div className="h-full rounded-full bg-peligro" style={{ width: `${(espacio / 15) * 100}%`, minWidth: "6px" }} /></div>
                  <div className="h-2.5 rounded-full bg-tinta" />
                  <p className="mono text-[0.7rem] text-tinta-tenue">comuna · {String(espacio).replace(".", ",")} m² — referencia nacional · 15 m²</p>
                </div>
              </div>
            ) : <p className="mt-5 text-tinta-tenue">Cargando…</p>}
            <p className="mt-3 text-tinta-suave">por habitante, frente a la referencia nacional de 15 m².</p>
            <p className="mt-3 text-sm text-tinta-tenue">Suma de la capa de espacio público existente dividida por la población. No es el indicador oficial de espacio público efectivo.</p>
            <div className="mt-auto pt-5"><Fuente ids={["espacio_publico", "manzanas_censo"]} calculo="m² por habitante calculado por OTEA" /><Link to="/indicadores" className="siguiente-a mt-3">Comparar barrios <IconoNav nombre="flecha" className="h-3.5 w-3.5" trazo={2.2} /></Link></div>
          </article>
        </div>
      </section>

      {/* ---------------------------------------------------------------- cómo trabaja */}
      <section aria-labelledby="t-como" className="-mx-4 bg-[rgb(var(--noche))] px-4 py-16 text-[#E9ECF4] lg:-mx-8 lg:px-8 lg:rounded-2xl">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-[#9FB0D8]">Cómo trabaja</p>
            <h2 id="t-como" className="fuente-titulo mt-2 text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">De datos sueltos a una respuesta que se puede revisar</h2>
            <p className="mt-4 max-w-md text-[#C2CBE0]">Hoy, para saber qué pasa en un barrio hay que abrir varios portales, descargar archivos y cruzarlos a mano. OTEA hace ese trabajo una vez, lo deja escrito y lo actualiza.</p>
            <Link to="/fuentes" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-white underline underline-offset-4">Ver el catálogo de fuentes <IconoNav nombre="flecha" className="h-4 w-4" trazo={2.2} /></Link>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-2">
            {PASOS.map((p, i) => (
              <li key={p.t} className="bg-[rgb(var(--noche))] p-6">
                <p className="mono text-[0.75rem] text-[#9FB0D8]">0{i + 1}</p>
                <p className="fuente-titulo mt-2 text-2xl font-bold text-white">{p.t}</p>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-[#C2CBE0]">{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- para quién */}
      <section aria-labelledby="t-quien" className="py-16">
        <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-tinta-tenue">Para quién es</p>
        <h2 id="t-quien" className="fuente-titulo mt-2 max-w-3xl text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">Sirve a quien vive el territorio y a quien lo planea</h2>
        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          {PARA_QUIEN.map((g) => (
            <div key={g.quien}>
              <h3 className="text-xl font-semibold">{g.quien}</h3>
              <ul className="mt-3 border-t border-tinta/80">
                {g.usos.map((u) => (
                  <li key={u.to}>
                    <Link to={u.to} className="group flex items-center gap-4 border-b border-nivel py-4">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold group-hover:text-marca">{u.t}</span>
                        <span className="block text-sm text-tinta-suave">{u.d}</span>
                      </span>
                      <IconoNav nombre="flecha" className="h-5 w-5 shrink-0 text-tinta-tenue transition group-hover:translate-x-1 group-hover:text-marca" trazo={2} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- barrios */}
      <section id="barrios" aria-labelledby="t-barrios" className="border-t border-tinta/80 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="t-barrios" className="fuente-titulo text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">Empieza por tu barrio</h2>
            <p className="mt-2 max-w-xl text-tinta-suave">Cada ficha reúne población, servicios cercanos, riesgo, reportes y cómo se compara con el resto de la comuna.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {(d?.barrios ?? []).map((b) => (
            <Link key={b.codigo} to={`/barrios/${b.codigo}`} className="chip !px-4 !py-2.5 !text-base">
              {b.nombre}
              <span className="mono text-[0.7rem] text-tinta-tenue">{b.poblacion_2018 != null ? num(b.poblacion_2018) : ""}</span>
            </Link>
          ))}
        </div>
        <p className="mono mt-3 text-[0.7rem] text-tinta-tenue">Personas por barrio según el Censo DANE 2018.</p>
      </section>

      {/* ---------------------------------------------------------------- cierre */}
      <section aria-labelledby="t-cierre" className="mb-16 grid gap-8 rounded-2xl bg-papel-hondo p-8 lg:grid-cols-[minmax(0,1.3fr)_auto] lg:items-center lg:p-12">
        <div>
          <h2 id="t-cierre" className="fuente-titulo text-[clamp(1.6rem,2.6vw,2.2rem)] font-extrabold leading-[1.08] tracking-[-0.025em]">¿Te sirve algo así para otro territorio?</h2>
          <p className="mt-3 max-w-2xl text-tinta-suave">OTEA está hecho con datos públicos y su código está publicado. La Propuesta de valor explica qué hace hoy, qué falta y qué se necesita para montarlo en otra comuna o municipio.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/propuesta?ir=implementar" className="boton boton-1 !px-6 !py-3 !text-base">Ver cómo implementarlo</Link>
          <Link to="/mapa" className="boton boton-2 !px-6 !py-3 !text-base">Seguir explorando</Link>
        </div>
      </section>

      <footer className="mono border-t border-nivel py-6 text-[0.72rem] text-tinta-tenue">
        OTEA · Observatorio territorial de Santa Cruz · Territorio INN 2026, reto 4. Datos de la Alcaldía de Medellín, el DANE e INDER; reportes y noticias públicas.
      </footer>
    </div>
  );
}
