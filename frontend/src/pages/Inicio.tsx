import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Position } from "geojson";
import { useDatos } from "../lib/datos";
import { num } from "../lib/formato";
import { LINEAS_METRO } from "../lib/capas";
import { Cuenta, Revelar, useVisto } from "../components/Animacion";
import { useProyeccion } from "../lib/proyeccion";
import type { Coleccion, Indicadores } from "../lib/tipos";
import { useResumen } from "../lib/resumen";

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
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#1e40af" floodOpacity="0.45" />
          </filter>
        </defs>
        <g clipPath="url(#marco)">
          <rect width={ANCHO} height={ALTO} fill="rgb(var(--papel-hondo))" />
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
              onClick={() => navegar(`/mapa?barrio=${b.codigo}`)}
              tabIndex={0}
              role="link"
              aria-label={`Abrir ${b.nombre} en el mapa`}
              onFocus={() => setEncima(b.codigo)}
              onBlur={() => setEncima(null)}
              onKeyDown={(e) => e.key === "Enter" && navegar(`/mapa?barrio=${b.codigo}`)}
            />
          ))}
          {/* El barrio bajo el mouse se enciende en verde y se levanta */}
          {activo && <path d={activo.d} fill="#8a7bff" fillOpacity="0.9" stroke={VERDE} strokeWidth="2.4" filter="url(#brillo)" className="barrio-resalte pointer-events-none" />}
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
        <div role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[135%] whitespace-nowrap rounded-xl bg-[#0b1f5c] px-4 py-2.5 text-white shadow-xl" style={{ left: `${izq}%`, top: `${(activo.centro[1] / ALTO) * 100}%` }}>
          <p className="text-base font-bold leading-tight">{activo.nombre}</p>
          {st && (
            <p className="text-sm text-white/80">
              {st.poblacion != null ? num(st.poblacion) : "Sin dato de"} personas · {num(Math.round(st.densidad))} por hectárea
            </p>
          )}
          <span aria-hidden="true" className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 bg-[#0b1f5c]" />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ tarjetas de datos

// ------------------------------------------------------------------ portada nueva: una historia con scroll + elige tu barrio
function Gigante({ valor, decimales = 0, sufijo = "", className = "" }: { valor: number; decimales?: number; sufijo?: string; className?: string }) {
  const [ref, visto] = useVisto<HTMLSpanElement>(0.3);
  return (
    <span ref={ref} className={className}>
      <Cuenta hasta={valor} decimales={decimales} activo={visto} duracion={1400} />
      {sufijo}
    </span>
  );
}

const CAPITULOS = [
  { n: "01", t: "Moverse", d: "Metro, buses, andenes y escaleras.", a: "/accesibilidad" },
  { n: "02", t: "Vivir seguro", d: "Riesgo de ladera y atropellos.", a: "/riesgo" },
  { n: "03", t: "Servicios", d: "Aseo, equipamientos y espacio público.", a: "/residuos" },
  { n: "04", t: "Qué hacer primero", d: "Obras en orden de prioridad.", a: "/prioridades" },
  { n: "05", t: "Participar", d: "Reporta un problema y vota.", a: "/participacion" },
  { n: "06", t: "Los datos", d: "Fuentes y cómo se calculó cada cifra.", a: "/fuentes", oscuro: true },
];

export default function Inicio() {
  const ind = useDatos<Indicadores>("indicadores.json");
  const d = ind.estado === "listo" ? ind.datos : null;
  const r = useResumen();
  const pulso = (k: string) => r?.datos.pulso.find((p) => p.clave === k) ?? null;
  const metro = pulso("metro_10min")?.valor ?? null;
  const m49 = pulso("minutos_49")?.valor ?? null;
  const rapida = (() => {
    const m = /rápida: (\d+),(\d)/.exec(pulso("minutos_49")?.texto ?? "");
    return m ? Number(m[1] + "." + m[2]) : null;
  })();
  const espacio = pulso("espacio_publico")?.valor ?? null;

  const stats: Stats = useMemo(
    () => Object.fromEntries((d?.barrios ?? []).map((b) => [b.codigo, { poblacion: b.poblacion_2018, densidad: b.densidad_hab_ha ?? 0 }])),
    [d],
  );

  return (
    <div>
      {/* portada */}
      <section className="mx-auto flex max-w-[84rem] flex-wrap items-center gap-12 px-6 pb-20 pt-10 lg:px-10">
        <div className="min-w-0 flex-[1_1_28rem]">
          <Revelar>
            <p className="text-sm font-bold uppercase tracking-wider text-marca">Comuna 2 · Medellín · Territorio INN 2026</p>
            <h1 className="fuente-titulo mt-5 text-[clamp(3.2rem,8vw,6.2rem)] font-extrabold leading-[0.95] tracking-[-0.015em]">
              Santa Cruz,<br />a pie.
            </h1>
            <p className="mt-7 max-w-[30rem] text-[1.35rem] leading-snug text-tinta-suave">
              Cómo se mueve la gente de once barrios de ladera, y qué obras la ayudarían más.
            </p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              <a href="#barrios" className="rounded-full bg-acento px-7 py-4 text-lg font-bold text-white transition hover:brightness-110">Elige tu barrio</a>
              <Link to="/mapa" className="rounded-full border-2 border-tinta px-6 py-3.5 text-lg font-bold transition hover:bg-tinta hover:text-papel">Abrir el mapa</Link>
            </div>
          </Revelar>
        </div>
        <div className="min-w-0 flex-[1_1_28rem]">
          <figure className="mx-auto w-full max-w-[38rem] rounded-[2rem] bg-papel-hondo p-4">
            <DibujoComuna stats={stats} />
            <figcaption className="px-2 pb-1 pt-3 text-sm text-tinta-suave">Pase el mouse o toque un barrio. Las líneas que se mueven son el Metrocable y los puntos que laten, sus estaciones.</figcaption>
          </figure>
        </div>
      </section>

      {/* dato 1 */}
      {metro != null && (
        <section className="bg-[#0A1A3F] text-white">
          <div className="mx-auto flex max-w-[84rem] flex-wrap items-center gap-14 px-6 py-24 lg:px-10">
            <div className="min-w-0 flex-[1_1_24rem]">
              <Gigante valor={metro} decimales={1} sufijo=" %" className="fuente-titulo block text-[clamp(5rem,15vw,12rem)] font-extrabold leading-[0.9] tracking-[-0.02em] text-[#7FB0FF]" />
            </div>
            <div className="min-w-0 flex-[1_1_22rem]">
              <p className="fuente-titulo text-[clamp(1.8rem,3.4vw,2.8rem)] font-bold leading-[1.1] tracking-tight">de las personas llegan caminando al Metro o al Metrocable.</p>
              <div className="mt-8 h-3.5 overflow-hidden rounded-full bg-[#1C2F63]"><div className="h-full rounded-full bg-[#7FB0FF]" style={{ width: `${metro}%` }} /></div>
              <p className="mt-3.5 text-[#A9BEE8]">En 10 minutos o menos. El resto sube escaleras o toma un bus alimentador.</p>
              <Link to="/accesibilidad" className="mt-6 inline-block font-bold text-[#7FB0FF] hover:underline">Ver cómo se calculó →</Link>
            </div>
          </div>
        </section>
      )}

      {/* dato 2 */}
      {m49 != null && rapida != null && (
        <section className="mx-auto flex max-w-[84rem] flex-wrap gap-8 px-6 py-24 lg:px-10">
          <div className="min-w-0 flex-[1_1_22rem]">
            <p className="text-sm font-bold uppercase tracking-wider text-marca">Corredor Carrera 49</p>
            <h2 className="fuente-titulo mt-3 text-[clamp(2.2rem,4vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.015em]">¿Conviene ir por la 49?</h2>
            <p className="mt-5 text-xl text-tinta-suave">Depende de dónde vivas y a dónde vayas.</p>
            <Link to="/corredor-49" className="mt-6 inline-block font-bold text-marca hover:underline">Ver el corredor →</Link>
          </div>
          <div className="min-w-0 flex-[1_1_16rem] rounded-[1.75rem] bg-papel-hondo p-9">
            <p className="text-tinta-tenue">Ruta más rápida al Metro</p>
            <Gigante valor={rapida} decimales={1} className="fuente-titulo block text-[clamp(3.5rem,7vw,5.5rem)] font-extrabold leading-none tracking-[-0.015em] text-acento" />
            <p className="font-bold text-acento">minutos</p>
          </div>
          <div className="min-w-0 flex-[1_1_16rem] rounded-[1.75rem] bg-acento p-9 text-white">
            <p className="text-white/80">Obligando a ir por la 49</p>
            <Gigante valor={m49} decimales={1} className="fuente-titulo block text-[clamp(3.5rem,7vw,5.5rem)] font-extrabold leading-none tracking-[-0.015em]" />
            <p className="font-bold">minutos</p>
          </div>
        </section>
      )}

      {/* dato 3 */}
      {espacio != null && (
        <section className="bg-papel-hondo">
          <div className="mx-auto flex max-w-[84rem] flex-wrap items-center gap-14 px-6 py-20 lg:px-10">
            <h2 className="fuente-titulo min-w-0 flex-[1_1_22rem] text-[clamp(2.2rem,4vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.015em]">Cada persona tiene casi nada de espacio público.</h2>
            <div className="min-w-0 flex-[1_1_22rem]">
              <p className="text-tinta-suave">Metros cuadrados por habitante (referencia nacional: 15)</p>
              {[{ t: "Comuna 2", v: espacio, c: "bg-acento" }, { t: "Meta", v: 15, c: "bg-tinta" }].map((f) => (
                <div key={f.t} className="mt-4 flex items-center gap-4">
                  <span className="w-24 shrink-0 font-bold">{f.t}</span>
                  <div className="h-9 flex-1 overflow-hidden rounded-xl bg-superficie"><div className={`h-full ${f.c}`} style={{ width: `${Math.max(2, (f.v / 15) * 100)}%` }} /></div>
                  <span className="fuente-titulo w-14 text-3xl font-extrabold">{String(f.v).replace(".", ",")}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* elige tu barrio */}
      <section id="barrios" className="mx-auto max-w-[64rem] px-6 pb-8 pt-24 text-center lg:px-10">
        <h2 className="fuente-titulo text-[clamp(2.6rem,6vw,4.4rem)] font-extrabold leading-none tracking-[-0.035em]">¿Y tu barrio?</h2>
        <p className="mt-5 text-xl text-tinta-suave">Toca el tuyo y ve solo lo que te afecta: tu ficha, tu camino al Metro y las obras que te tocan.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {(d?.barrios ?? []).map((b) => (
            <Link key={b.codigo} to={`/barrios/${b.codigo}`} className="rounded-full bg-papel-hondo px-6 py-3.5 text-lg font-medium transition hover:bg-acento hover:text-white">{b.nombre}</Link>
          ))}
        </div>
      </section>

      {/* capítulos */}
      <section className="mx-auto max-w-[84rem] px-6 pb-24 pt-16 lg:px-10">
        <h2 className="fuente-titulo mb-8 text-4xl font-extrabold tracking-tight">Sigue leyendo</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPITULOS.map((c) => (
            <Link key={c.n} to={c.a} className={`block rounded-3xl p-7 transition hover:-translate-y-0.5 ${c.oscuro ? "bg-[#0A1A3F] text-white" : "bg-papel-hondo"}`}>
              <p className={`text-sm font-bold ${c.oscuro ? "text-[#7FB0FF]" : "text-marca"}`}>{c.n}</p>
              <p className="fuente-titulo mt-2 text-[1.7rem] font-bold leading-tight">{c.t}</p>
              <p className={`mt-1 ${c.oscuro ? "text-[#A9BEE8]" : "text-tinta-suave"}`}>{c.d}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-nivel px-6 py-8 text-center text-sm text-tinta-suave">
        Observatorio Santa Cruz · Territorio INN 2026 · Reto #4. Datos abiertos de la Alcaldía de Medellín, el DANE, EPM y Emvarias.
      </footer>
    </div>
  );
}
