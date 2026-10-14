import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Position } from "geojson";
import { useDatos } from "../lib/datos";
import { dec, num } from "../lib/formato";
import { LINEAS_METRO } from "../lib/capas";
import IconoNav from "../components/IconosNav";
import { Cuenta, Revelar, useVisto } from "../components/Animacion";
import { useProyeccion } from "../lib/proyeccion";
import type { Coleccion, Indicadores } from "../lib/tipos";
import { useResumen } from "../lib/resumen";
import { acentoDeRuta } from "../lib/marca";
import { GRUPOS } from "../lib/menu";

const VERDE = "rgb(var(--marca))";
const ROJO = "rgb(var(--peligro))";
const REFERENCIA_M2 = 15; // m² de espacio público por habitante, referencia nacional

// ------------------------------------------------------------------ animaciones al hacer scroll
// ------------------------------------------------------------------ fondo topográfico del hero
/** Curvas de nivel inventadas con ondas (no son datos del territorio), solo para dar textura. */
const CONTORNOS: string[] = (() => {
  const focos = [
    { cx: 960, cy: 250, n: 17, base: 30, paso: 36, fase: 0.7 },
    { cx: 90, cy: 640, n: 11, base: 26, paso: 38, fase: 2.1 },
    { cx: 1050, cy: 1150, n: 13, base: 30, paso: 40, fase: 1.3 },
    { cx: 120, cy: 1700, n: 14, base: 28, paso: 40, fase: 3.4 },
    { cx: 980, cy: 2250, n: 14, base: 30, paso: 40, fase: 4.6 },
    { cx: 140, cy: 2800, n: 13, base: 30, paso: 40, fase: 5.5 },
    { cx: 900, cy: 3300, n: 12, base: 30, paso: 40, fase: 0.2 },
  ];
  const rutas: string[] = [];
  for (const f of focos)
    for (let k = 1; k <= f.n; k++) {
      const r = f.base + k * f.paso;
      const pts: string[] = [];
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const onda = 1 + 0.16 * Math.sin(2 * a + f.fase + k * 0.22) + 0.09 * Math.sin(3 * a + f.fase * 2 - k * 0.31) + 0.05 * Math.sin(5 * a + k * 0.5);
        pts.push(`${(f.cx + Math.cos(a) * r * onda * 1.3).toFixed(1)},${(f.cy + Math.sin(a) * r * onda * 0.82).toFixed(1)}`);
      }
      rutas.push(`M${pts.join("L")}Z`);
    }
  return rutas;
})();

function FondoHero() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" >
      <div className="absolute inset-x-0 top-0 h-[900px]" style={{ background: "radial-gradient(ellipse 62% 70% at 76% 34%, rgb(var(--menta)) 0%, rgb(var(--menta) / 0.5) 42%, transparent 75%)" }} />
      <svg viewBox="0 0 1200 3600" preserveAspectRatio="xMidYMin slice" className="absolute inset-0 h-full w-full" style={{ opacity: 0.05 }}>
        {CONTORNOS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={VERDE} strokeWidth="2" />
        ))}
      </svg>
    </div>
  );
}

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
function Tarjeta({ retraso = 0, tono, children }: { retraso?: number; tono: string; children: (visto: boolean) => ReactNode }) {
  const [ref, visto] = useVisto<HTMLDivElement>(0.2);
  return (
    <div ref={ref} className={`revelar h-full ${visto ? "visto" : ""}`} style={{ transitionDelay: `${retraso}ms` }}>
      <article className="tarjeta-dato flex h-full flex-col rounded-2xl border-t-2 bg-superficie p-5 ring-1 ring-black/5" style={{ borderTopColor: tono }}>
        {children(visto)}
      </article>
    </div>
  );
}

function Cabecera({ icono, color, titulo }: { icono: string; color: string; titulo: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white" style={{ background: color }}>
        <IconoNav nombre={icono} className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-semibold leading-snug">{titulo}</h3>
    </div>
  );
}

/** Una hectárea (100 × 100 m) con un punto por cada persona que vive en ella en promedio. */
function PuntosHectarea({ n, activo }: { n: number; activo: boolean }) {
  const puntos = useMemo(() => {
    let s = 12345;
    const azar = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const g = Math.ceil(Math.sqrt(n * 1.15));
    const celdas = Array.from({ length: g * g }, (_, i) => i);
    for (let i = celdas.length - 1; i > 0; i--) {
      const j = Math.floor(azar() * (i + 1));
      [celdas[i], celdas[j]] = [celdas[j], celdas[i]];
    }
    return celdas.slice(0, Math.round(n)).map((c, i) => ({
      x: ((c % g) + 0.15 + 0.7 * azar()) * (100 / g),
      y: (Math.floor(c / g) + 0.15 + 0.7 * azar()) * (100 / g),
      grupo: i % 4,
    }));
  }, [n]);
  return (
    <figure className="shrink-0">
      <svg viewBox="0 0 100 100" className="h-[6.5rem] w-[6.5rem] rounded-lg bg-menta-2 ring-2 ring-marca/30" role="img" aria-label={`Una hectárea con ${num(Math.round(n))} puntos, uno por cada persona`}>
        {[0, 1, 2, 3].map((gr) => (
          <g key={gr} style={{ opacity: activo ? 1 : 0, transition: "opacity 700ms ease", transitionDelay: `${300 + gr * 260}ms` }}>
            {puntos
              .filter((p) => p.grupo === gr)
              .map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="1.35" fill={VERDE} />
              ))}
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 text-center text-xs font-semibold text-tinta-suave">1 hectárea</figcaption>
    </figure>
  );
}

function Barra({ pct, color, activo, retraso = 0 }: { pct: number; color: string; activo: boolean; retraso?: number }) {
  return (
    <div className="mt-2 h-8 w-full overflow-hidden rounded-full bg-papel-hondo">
      <div
        className="h-full rounded-full"
        style={{ width: activo ? `${Math.max(pct, 1.8)}%` : "0%", background: color, transition: "width 1.5s cubic-bezier(.2,.8,.2,1)", transitionDelay: `${400 + retraso}ms` }}
      />
    </div>
  );
}

/** Mini mapa de los barrios pintado según cuántos atropellos tuvo cada uno. */
function MiniCalor({ valores }: { valores: Record<string, { nombre: string; n: number }> }) {
  const proy = useProyeccion(280, 300, 8);
  if (!proy) return <div className="mt-5 h-48 animate-[suave_2.6s_ease-in-out_infinite] rounded-xl bg-papel-hondo" />;
  const escala = ["#fdeee9", "#f6c9bb", "#e8967b", "#cf6246", "#a02f1a"];
  const max = Math.max(...Object.values(valores).map((v) => v.n), 1);
  return (
    <figure className="mt-5">
      <svg viewBox="0 0 280 300" className="mx-auto h-auto w-full max-w-[13rem]" role="img" aria-label="Mapa de los barrios pintado según el número de atropellos">
        {proy.items.map((b) => {
          const v = valores[b.codigo];
          return (
            <path key={b.codigo} d={b.d} fill={escala[Math.min(4, Math.floor(((v?.n ?? 0) / max) * 5))]} stroke="rgb(var(--superficie))" strokeWidth="1.2" strokeLinejoin="round">
              <title>{`${b.nombre}: ${v?.n ?? 0} atropellos`}</title>
            </path>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex items-center justify-center gap-1.5 whitespace-nowrap text-xs text-tinta-suave">
        menos
        {escala.map((c) => (
          <span key={c} className="h-3 w-5 first:rounded-l last:rounded-r" style={{ background: c }} />
        ))}
        más
      </figcaption>
    </figure>
  );
}

/** Franja "El pulso de la comuna": una cifra de cada módulo, cada una lleva a su página. Viene de la API o, si no está encendida, de inicio.json. */
function PulsoComuna() {
  const r = useResumen();
  if (!r || r.datos.pulso.length === 0) return null;
  return (
    <section className="mt-4 lg:mt-8" aria-labelledby="t-pulso">
      <Revelar>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="t-pulso" className="text-xl font-semibold tracking-tight">El pulso de la comuna</h2>
            <p className="mt-1 max-w-2xl text-sm text-tinta-suave">Una cifra de cada módulo. Toca una y te lleva a ver cómo se calculó.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-superficie px-3 py-1.5 text-xs font-semibold text-tinta-suave ring-1 ring-nivel" title={r.origen === "api" ? "Los datos llegaron de la API" : "La API no está encendida, se leyó el archivo inicio.json"}>
            <span className={`h-2 w-2 rounded-full ${r.origen === "api" ? "bg-[#2d9a5a]" : "bg-[#e0a526]"}`} aria-hidden="true" />
            {r.origen === "api" ? "Datos en vivo" : "Datos guardados en la página"}
          </span>
        </div>
      </Revelar>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {r.datos.pulso.map((p, i) => (
          <Revelar key={p.clave} retraso={(i % 3) * 70}>
            <Link to={p.ruta} className="vidrio group flex h-full flex-col rounded-xl p-4" style={{ ["--glow" as string]: acentoDeRuta(p.ruta).vivo }}>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-tinta-suave"><span className="h-2.5 w-2.5 rounded-full" style={{ background: acentoDeRuta(p.ruta).vivo }} />{p.modulo}</span>
              <span className="mt-1.5 text-[2rem] font-semibold leading-none tabular-nums text-tinta" style={{ textShadow: "0 0 22px rgb(56 189 248 / 0.4)" }}>{p.valor == null ? "—" : String(p.valor).replace(".", ",")}</span>
              <span className="mt-1.5 text-sm leading-snug text-tinta-suave">{p.texto}</span>
              {p.nota && <span className="mt-1 text-xs text-tinta-tenue">{p.nota}</span>}
              <span className="mt-auto pt-3 text-sm font-semibold text-marca opacity-70 transition group-hover:opacity-100">Ver más →</span>
            </Link>
          </Revelar>
        ))}
      </div>
    </section>
  );
}

export default function Inicio() {
  const ind = useDatos<Indicadores>("indicadores.json");
  const d = ind.estado === "listo" ? ind.datos : null;
  const c = d?.comuna ?? null;
  const atropellos = d ? d.barrios.reduce((a, b) => a + b.atropellos, 0) : null;
  const imcv = d?.ecv.imcv ?? null;
  const andenes = d?.infraestructura?.andenes;

  const stats: Stats = useMemo(
    () => Object.fromEntries((d?.barrios ?? []).map((b) => [b.codigo, { poblacion: b.poblacion_2018, densidad: b.densidad_hab_ha ?? 0 }])),
    [d],
  );
  const porBarrio = useMemo(() => Object.fromEntries((d?.barrios ?? []).map((b) => [b.codigo, { nombre: b.nombre, n: b.atropellos }])), [d]);
  const peor = useMemo(() => (d ? [...d.barrios].sort((a, b) => b.atropellos - a.atropellos)[0] : null), [d]);

  return (
    <div className="relative isolate overflow-hidden">
      <FondoHero />
      {/* ------------------------------------------------------------------ HERO */}
      <div className="relative">
        <section className="relative mx-auto grid max-w-[100rem] items-center gap-8 px-4 pb-6 pt-4 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:px-8 lg:pt-6 2xl:px-12">
          <div>
            <Revelar>
              <p className="inline-flex items-center gap-2 rounded-full bg-superficie/80 px-4 py-1.5 text-sm font-semibold text-marca shadow-sm ring-1 ring-marca/15">
                <span className="h-2 w-2 rounded-full bg-[#6ab7ff]" /> Territorio INN 2026 · Reto #4
              </p>
            </Revelar>
            <Revelar retraso={80}>
              <h1 className="mt-4 text-tinta">
                <span className="block text-[1.35rem] font-light leading-[1.15] tracking-tight [text-wrap:balance] sm:text-[1.9rem]">¿Qué tan bien conectada está</span>
                <span className="relative mt-1 inline-block text-[1.7rem] font-semibold leading-[1.1] tracking-tight sm:text-[2.4rem]" style={{ color: VERDE }}>
                  Santa Cruz?
                  <svg viewBox="0 0 330 18" className="subrayado absolute -bottom-3 left-0 w-full" aria-hidden="true">
                    <path d="M3 12 C 50 3, 105 17, 170 8 S 280 4, 327 11" fill="none" stroke="#6ab7ff" strokeWidth="6" strokeLinecap="round" pathLength="1" />
                  </svg>
                </span>
              </h1>
            </Revelar>
            <Revelar retraso={160}>
              <p className="mt-6 max-w-xl text-base text-tinta-suave">
                Una plataforma para entender cómo se mueve la gente en la Comuna 2 de Medellín, dónde faltan andenes, escaleras,
                equipamientos y espacio público, y qué obras ayudarían a más personas.
              </p>
            </Revelar>
            <Revelar retraso={240}>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  to="/mapa"
                  className="group inline-flex items-center gap-3 rounded-xl bg-[#1e40af] px-5 py-2.5 text-base font-semibold text-white shadow-md shadow-[#1e40af]/25 transition duration-200 hover:bg-[#0b1f5c]"
                >
                  <IconoNav nombre="mapa" className="h-5 w-5" trazo={2} />
                  Abrir el mapa
                </Link>
                <Link
                  to="/indicadores"
                  className="inline-flex items-center gap-2 rounded-xl border border-marca/40 bg-superficie/40 px-4 py-2.5 text-base font-semibold text-marca transition hover:border-marca hover:bg-[#1e40af]/5"
                >
                  Ver indicadores
                </Link>
              </div>
              <Link to="/mapa?3d=1" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-tinta-suave transition hover:text-marca">
                <IconoNav nombre="cubo" className="h-5 w-5" /> Explora los 11 barrios en 3D
              </Link>
            </Revelar>
            <Revelar retraso={320}>
              <p className="mt-5 max-w-xl border-l-2 border-[#6ab7ff] pl-4 text-sm italic text-tinta-suave">
                Pregunta del reto: ¿cómo optimizar la infraestructura vial, peatonal y de acceso, facilitando la conexión interna de la
                comuna 2 Santa Cruz con el resto de Medellín?
              </p>
            </Revelar>
          </div>
          <Revelar retraso={200}>
            <figure className="vidrio vidrio--quieto mx-auto w-full max-w-[40rem] p-3 lg:ml-auto">
              <DibujoComuna stats={stats} />
              <figcaption className="px-2 pb-1 pt-3 text-sm text-tinta-suave">
                <strong className="text-tinta">Pase el mouse o toque un barrio.</strong> Las líneas que se mueven son el Metrocable y los
                puntos que laten, sus estaciones.
              </figcaption>
            </figure>
          </Revelar>
        </section>
      </div>

      <div className="mx-auto max-w-[100rem] px-4 lg:px-8 2xl:px-12">
        <PulsoComuna />
        {/* ------------------------------------------------------------------ DATOS */}
        <section className="mt-2 lg:mt-4" aria-labelledby="t-datos">
          <Revelar>
            <h2 id="t-datos" className="text-xl font-semibold tracking-tight">
              Lo que ya muestran los datos oficiales
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-tinta-suave">Tres cifras para entender la comuna. Todas salen de la Alcaldía de Medellín y del DANE.</p>
          </Revelar>
          {c ? (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Tarjeta tono={VERDE}>
                  {(v) => (
                    <>
                      <Cabecera icono="personas" color={VERDE} titulo="Cuántas personas viven aquí" />
                      <p className="mt-3 text-base text-tinta-suave">
                        En{" "}
                        <strong className="text-tinta tabular-nums">
                          <Cuenta hasta={c.area_ha} decimales={1} activo={v} /> hectáreas
                        </strong>{" "}
                        vivían en 2018
                      </p>
                      <p className="text-[1.4rem] font-semibold leading-tight tabular-nums" style={{ color: VERDE }}>
                        <Cuenta hasta={c.poblacion_2018} activo={v} /> <span className="text-xl font-semibold text-tinta">personas</span>
                      </p>
                      <div className="mt-6 flex items-end gap-5">
                        <div>
                          <p className="text-[1.55rem] font-semibold leading-none tabular-nums" style={{ color: VERDE }}>
                            <Cuenta hasta={Math.round(c.densidad_hab_ha ?? 0)} activo={v} />
                          </p>
                          <p className="mt-1 text-base font-semibold">personas por hectárea</p>
                        </div>
                        <PuntosHectarea n={c.densidad_hab_ha ?? 0} activo={v} />
                      </div>
                      <p className="mt-auto pt-5 text-sm text-tinta-suave">Cada punto es una persona: así de llena está, en promedio, una hectárea de la comuna (un cuadro de 100 × 100 metros). Censo 2018.</p>
                    </>
                  )}
                </Tarjeta>

                <Tarjeta tono={ROJO} retraso={120}>
                  {(v, ep = c.espacio_publico_m2_hab) => (
                    <>
                      <Cabecera icono="arbol" color={ROJO} titulo="Espacio público para cada persona" />
                      {ep == null ? (
                        <p className="mt-3 text-base font-semibold text-tinta-suave">Pendiente de datos</p>
                      ) : (
                        <>
                      <div className="mt-7">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold">Santa Cruz hoy</span>
                          <span className="text-[1.55rem] font-semibold leading-none tabular-nums" style={{ color: ROJO }}>
                            <Cuenta hasta={ep} decimales={2} activo={v} /> <span className="text-lg font-semibold">m²</span>
                          </span>
                        </div>
                        <Barra pct={(ep / REFERENCIA_M2) * 100} color={ROJO} activo={v} />
                      </div>
                      <div className="mt-6">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold">Referencia nacional</span>
                          <span className="text-[1.55rem] font-semibold leading-none tabular-nums text-marca">
                            <Cuenta hasta={REFERENCIA_M2} activo={v} /> <span className="text-lg font-semibold">m²</span>
                          </span>
                        </div>
                        <Barra pct={100} color="#3b82f6" activo={v} retraso={250} />
                      </div>
                      <p className="mt-6 rounded-xl bg-ladrillo-claro px-4 py-3 text-base font-semibold text-ladrillo">
                        Faltan unos {dec(REFERENCIA_M2 - ep)} m² por persona: la referencia es casi{" "}
                        {Math.round(REFERENCIA_M2 / ep)} veces lo que hay.
                      </p>
                      <p className="mt-auto pt-4 text-sm text-tinta-suave">Metros cuadrados de espacio público por habitante. El POT proyecta {num(c.espacio_publico_proyectado_m2)} m² de espacio público dentro de la comuna.</p>
                        </>
                      )}
                    </>
                  )}
                </Tarjeta>

                <Tarjeta tono={ROJO} retraso={240}>
                  {(v) => (
                    <>
                      <Cabecera icono="alerta" color={ROJO} titulo="Personas atropelladas" />
                      <p className="mt-6 text-[1.55rem] font-semibold leading-none tabular-nums" style={{ color: ROJO }}>
                        <Cuenta hasta={atropellos ?? 0} activo={v} />
                      </p>
                      <p className="mt-2 text-base font-semibold">atropellos entre 2019 y 2025</p>
                      <p className="text-sm text-tinta-suave">dentro de los barrios de la comuna, de {num(c.siniestros_total)} siniestros viales registrados.</p>
                      <MiniCalor valores={porBarrio} />
                      {peor && (
                        <p className="mt-3 text-sm text-tinta-suave">
                          El barrio con más atropellos es <strong className="text-tinta">{peor.nombre}</strong> ({num(peor.atropellos)}).
                        </p>
                      )}
                    </>
                  )}
                </Tarjeta>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Revelar>
                  <div className="flex h-full gap-4 rounded-2xl bg-superficie/70 p-5 ring-1 ring-black/5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-menta text-marca"><IconoNav nombre="tren" className="h-6 w-6" /></span>
                    <p className="text-base text-tinta-suave">
                      <strong className="text-tinta">{c.estaciones_en_comuna.length === 1 ? "Una sola estación" : `${c.estaciones_en_comuna.length} estaciones`}</strong> del sistema Metro queda dentro de la comuna ({c.estaciones_en_comuna.join(", ")}). Acevedo y Tricentenario, de la línea A, quedan fuera.
                    </p>
                  </div>
                </Revelar>
                {imcv && (
                  <Revelar retraso={100}>
                    <div className="flex h-full gap-4 rounded-2xl bg-superficie/70 p-5 ring-1 ring-black/5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-menta text-marca"><IconoNav nombre="corazon" className="h-6 w-6" /></span>
                      <p className="text-base text-tinta-suave">
                        En calidad de vida (IMCV {imcv.ultimo_anio}) Santa Cruz ocupa el <strong className="text-tinta">puesto {imcv.posicion} de {imcv.de}</strong> comunas y corregimientos de Medellín.
                      </p>
                    </div>
                  </Revelar>
                )}
                {andenes && (
                  <Revelar retraso={200}>
                    <div className="flex h-full gap-4 rounded-2xl bg-superficie/70 p-5 ring-1 ring-black/5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-menta text-marca"><IconoNav nombre="andenes" className="h-6 w-6" /></span>
                      <p className="text-base text-tinta-suave">
                        <strong className="text-tinta">La Alcaldía sí tiene un inventario de andenes:</strong> {dec(andenes.km)} km en la comuna, con un ancho típico de {dec(andenes.ancho_mediano_m)} m. Con él se calcula cuánto camina de verdad cada manzana.
                      </p>
                    </div>
                  </Revelar>
                )}
              </div>
            </>
          ) : (
            <p className="mt-6 text-tinta-suave">{ind.estado === "error" ? "No se pudieron cargar los indicadores." : "Cargando cifras…"}</p>
          )}
        </section>

        {/* ------------------------------------------------------------------ MÓDULOS */}
        <section className="mt-8 lg:mt-10" aria-labelledby="t-modulos">
          <Revelar>
            <h2 id="t-modulos" className="text-xl font-semibold tracking-tight">
              Qué hay en la plataforma
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-tinta-suave">Toque cualquiera para entrar.</p>
          </Revelar>
          <div className="mt-4 divide-y divide-nivel/70 border-y border-nivel/70">
            {GRUPOS.map((g) => ({ ...g, modulos: g.modulos.filter((m) => m.ruta !== "/") })).filter((g) => g.modulos.length > 0).map((g) => (
              <div key={g.id} className="gap-4 py-3.5 lg:grid lg:grid-cols-[9rem_minmax(0,1fr)]">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-marca">{g.titulo}</h3>
                  <p className="mt-1 text-sm text-tinta-tenue">{g.modulos.length === 1 ? "1 módulo" : `${g.modulos.length} módulos`}</p>
                </div>
                <ul className="mt-2 grid gap-2.5 sm:grid-cols-2 lg:mt-0 xl:grid-cols-3">
                  {g.modulos.map((m) => (
                    <li key={m.ruta}>
                      <Link to={m.ruta} className="fila-modulo group flex h-full items-start gap-3 rounded-xl border border-nivel bg-superficie p-3 shadow-sm">
                        <span className="fila-modulo-icono grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-menta text-marca">
                          <IconoNav nombre={m.icono} className="h-5 w-5" trazo={1.7} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-[0.95rem] font-semibold leading-snug">
                            {m.nombre}
                            {m.fase && <span className="rounded-full bg-ambar-claro px-2 py-0.5 text-xs font-semibold text-ambar-texto">{m.fase}</span>}
                          </span>
                          <span className="mt-0.5 block text-sm text-tinta-suave">{m.detalle}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------ FUENTES */}
        <section className="mt-8 lg:mt-10" aria-labelledby="t-fuentes">
          <Revelar>
            <aside className="relative rounded-r-2xl border-l-4 border-marca bg-menta-2 px-5 py-5 sm:px-8">
              <span aria-hidden="true" className="absolute right-6 top-2 select-none text-[6rem] font-semibold leading-none text-marca/10">”</span>
              <h2 id="t-fuentes" className="text-sm font-semibold uppercase tracking-widest text-marca">
                Fuentes y calidad
              </h2>
              <p className="mt-2 max-w-3xl text-base font-medium leading-relaxed text-tinta">
                Todos los datos de esta versión vienen de la Alcaldía de Medellín y del DANE. Nada está inventado: lo que todavía no se
                sabe aparece marcado como pendiente.
              </p>
              <Link to="/fuentes" className="mt-5 inline-flex items-center gap-2 text-base font-semibold text-marca underline-offset-4 hover:underline">
                Ver fuentes y calidad <IconoNav nombre="flecha" className="h-5 w-5" trazo={2.2} />
              </Link>
            </aside>
          </Revelar>
        </section>
      </div>

      <footer className="mx-auto mt-12 max-w-[100rem] border-t border-nivel px-4 py-8 text-center text-sm text-tinta-suave lg:px-8">
        Datos de la Alcaldía de Medellín y del DANE (Censo 2018) <span className="mx-2 text-nivel">|</span> Proyecto Territorio INN 2026 · Reto #4
      </footer>
    </div>
  );
}
