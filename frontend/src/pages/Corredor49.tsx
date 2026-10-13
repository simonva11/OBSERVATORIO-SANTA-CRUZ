import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Position } from "geojson";
import { useDatos } from "../lib/datos";
import { dec, num } from "../lib/formato";
import { useProyeccion } from "../lib/proyeccion";
import { Cuenta, Revelar, useVisto } from "../components/Animacion";
import { ConDatos } from "../components/Estado";
import IconoNav from "../components/IconosNav";
import type { Coleccion } from "../lib/tipos";
import { BotonCabecera, Cabecera, Relacionados, Seccion } from "../components/Pagina";

const VERDE = "#1e40af";
const AMBAR = "#6ab7ff";

interface PorBarrio { barrio: string; personas: number; minutos_ruta_rapida: number; minutos_por_la_49: number; pct_49_en_el_camino: number }
interface Destino {
  nombre: string; personas: number; minutos_ruta_rapida: number; minutos_por_la_49: number; minutos_extra: number;
  pct_49_en_el_camino: number; pct_ruta_rapida_ya_usa_49: number; minutos_por_la_49_si_se_cierra_tramo: number; por_barrio: PorBarrio[];
}
interface Eje49 {
  eje: { tramos: { nombre: string; estado: string; metros: number }[]; metros_existente: number; metros_proyectado: number; metros_cierre_simulado: number | null };
  destinos: Record<string, Destino>;
  estado_del_eje: {
    siniestros: number; siniestros_por_km: number; siniestros_por_km_comuna: number | null; calles_km_comuna: number;
    por_clase: Record<string, number>; por_gravedad: Record<string, number>; por_anio: Record<string, number>;
    muertes_viales: number; ancho_andén_mediana_m: number | null; andenes_menores_1_5_m_pct: number | null; andenes_tramos: number;
    paradas_cerca: number; camaras_cerca: number; semaforos_cerca: number; largo_km: number;
    rutas_de_bus_sobre_el_eje: { nombre: string; codigo: string; tipo: string; empresa: string; metros_sobre_el_eje: number }[];
  };
  supuestos: string[];
}

const ORDEN: { id: string; corto: string; icono: string }[] = [
  { id: "transporte_masivo", corto: "Metro o Metrocable", icono: "tren" },
  { id: "parada_bus", corto: "Parada de bus", icono: "mapa" },
  { id: "colegio", corto: "Colegio", icono: "personas" },
  { id: "salud", corto: "Centro de salud", icono: "corazon" },
  { id: "parque", corto: "Parque", icono: "arbol" },
];

// Escala de "minutos extra por ir por la 49"
const ESCALA = [
  { hasta: 1, color: "#2f8f5b", texto: "La 49 le queda de camino (hasta 1 min más)" },
  { hasta: 4, color: "#e3b93a", texto: "1 a 4 min más" },
  { hasta: 8, color: "#e07b39", texto: "4 a 8 min más" },
  { hasta: Infinity, color: "#b3321f", texto: "Más de 8 min más" },
];
const colorExtra = (m: number) => ESCALA.find((e) => m <= e.hasta)!.color;

const ANCHO = 560;
const ALTO = 640;

function MapaEje({ tipo }: { tipo: string }) {
  const proy = useProyeccion(ANCHO, ALTO, 20);
  const eje = useDatos<Coleccion>("eje49.geojson");
  const manz = useDatos<Coleccion>("eje49_manzanas.geojson");
  const est = useDatos<Coleccion>("estaciones.geojson");
  const [tip, setTip] = useState<{ x: number; y: number; texto: string } | null>(null);

  const dibujo = useMemo(() => {
    if (!proy || eje.estado !== "listo" || manz.estado !== "listo") return null;
    const { xy } = proy;
    const ruta = (ps: Position[]) => "M" + ps.map((p) => xy(p).map((v) => v.toFixed(1)).join(",")).join("L");
    const tramos = eje.datos.features.map((f) => ({
      nombre: String(f.properties?.nombre), proyectado: f.properties?.estado === "Proyectado",
      d: f.geometry.type === "LineString" ? ruta(f.geometry.coordinates) : "",
    }));
    const puntos = manz.datos.features.map((f) => {
      const [x, y] = xy((f.geometry as { coordinates: Position }).coordinates);
      const p = f.properties as Record<string, number | string | undefined>;
      return { x, y, personas: Number(p.personas), barrio: String(p.barrio ?? ""), extra: p[`e_${tipo}`] as number | undefined, rapida: p[`r_${tipo}`] as number | undefined };
    });
    const estaciones = est.estado === "listo"
      ? est.datos.features
          .filter((f) => f.geometry.type === "Point" && ["Metro", "Metrocable"].includes(String(f.properties?.modo)))
          .map((f) => ({ nombre: String(f.properties?.nombre), p: xy((f.geometry as { coordinates: Position }).coordinates) }))
          .filter((e) => e.p[0] > 0 && e.p[0] < ANCHO && e.p[1] > 0 && e.p[1] < ALTO)
      : [];
    return { tramos, puntos, estaciones };
  }, [proy, eje, manz, est, tipo]);

  if (!proy || !dibujo) return <div className="aspect-[56/64] w-full animate-[suave_2.6s_ease-in-out_infinite] rounded-2xl bg-papel-hondo" aria-label="Cargando mapa" />;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full rounded-2xl bg-menta-2" role="img" aria-label="Mapa de la comuna con la Carrera 49 y los minutos extra de ir por ella">
        {proy.items.map((b) => (
          <path key={b.codigo} d={b.d} fill="#ffffff" stroke="#c3c4e6" strokeWidth="1" strokeLinejoin="round" />
        ))}
        {dibujo.tramos.map((t, i) => (
          <g key={i}>
            <path d={t.d} fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
            <path d={t.d} fill="none" stroke={t.proyectado ? AMBAR : VERDE} strokeWidth="6" strokeLinecap="round" strokeDasharray={t.proyectado ? "2 9" : undefined} />
          </g>
        ))}
        {dibujo.puntos.map((p, i) => {
          const ex = p.extra;
          if (ex == null) return null;
          return (
            <circle
              key={i} cx={p.x} cy={p.y} r={2.2 + Math.min(3.4, Math.sqrt(p.personas) / 14)} fill={colorExtra(ex)} fillOpacity="0.85" stroke="#fff" strokeWidth="0.8"
              onMouseEnter={() => setTip({ x: p.x, y: p.y, texto: `${p.barrio} · ${num(p.personas)} personas · ${ex <= 0.05 ? "la 49 le queda en el camino" : `${dec(ex)} min más por la 49`}` })}
              onMouseLeave={() => setTip(null)}
              onClick={() => setTip({ x: p.x, y: p.y, texto: `${p.barrio} · ${num(p.personas)} personas · ${ex <= 0.05 ? "la 49 le queda en el camino" : `${dec(ex)} min más por la 49`}` })}
            />
          );
        })}
        {dibujo.estaciones.map((e) => (
          <g key={e.nombre}>
            <circle cx={e.p[0]} cy={e.p[1]} r="6" fill="#1d4fa0" stroke="#fff" strokeWidth="2" />
          </g>
        ))}
      </svg>
      {tip && (
        <div className="pointer-events-none absolute z-10 max-w-[14rem] -translate-x-1/2 -translate-y-full rounded-lg bg-[#1e40af] px-3 py-2 text-xs font-medium text-white shadow-lg" style={{ left: `${(tip.x / ANCHO) * 100}%`, top: `${(tip.y / ALTO) * 100 - 2}%` }}>
          {tip.texto}
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-tinta-suave">
        {ESCALA.map((e) => (
          <li key={e.color} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: e.color }} />{e.texto}</li>
        ))}
        <li className="flex items-center gap-1.5"><span className="h-1.5 w-6 rounded bg-[#1e40af]" />Carrera 49 existente</li>
        <li className="flex items-center gap-1.5"><span className="h-1.5 w-6 rounded border-t-4 border-dotted border-[#6ab7ff]" />Tramo proyectado en el POT</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#1d4fa0]" />Estación</li>
      </ul>
    </div>
  );
}

function Barra({ valor, max, color }: { valor: number; max: number; color: string }) {
  const [ref, visto] = useVisto<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className="h-3 w-full overflow-hidden rounded-full bg-papel-hondo">
      <div className="h-full rounded-full transition-[width] duration-[1400ms] ease-out" style={{ width: visto ? `${valor <= 0 ? 0 : Math.max(1.5, (valor / max) * 100)}%` : "0%", background: color }} />
    </div>
  );
}

function Contenido({ d }: { d: Eje49 }) {
  const [tipo, setTipo] = useState("transporte_masivo");
  const dest = d.destinos[tipo];
  const e = d.estado_del_eje;
  const metro = d.destinos.transporte_masivo;
  const mejores = [...metro.por_barrio].sort((a, b) => b.pct_49_en_el_camino - a.pct_49_en_el_camino).slice(0, 3);
  const maxMin = Math.max(...dest.por_barrio.map((b) => b.minutos_por_la_49));
  const veces = e.siniestros_por_km_comuna ? e.siniestros_por_km / e.siniestros_por_km_comuna : null;
  const anchoMax = Math.max(e.siniestros_por_km, e.siniestros_por_km_comuna ?? 0);

  return (
    <div className="space-y-8">
      <Cabecera etiqueta="Corredor Carrera 49 · Avenida Venezuela" icono="corredor" titulo="¿Conviene ir por la 49?"
        texto={<>Lo medimos con la red de calles, andenes y escaleras de la comuna, caminando, y con las {num(metro.personas)} personas del Censo 2018. La respuesta corta: <strong>depende de dónde vivas y a dónde vayas</strong>.</>}>
        <BotonCabecera to="/mapa?capas=eje49">Ver el eje en el mapa</BotonCabecera>
        <BotonCabecera to="/accesibilidad" claro>Accesibilidad por barrio</BotonCabecera>
      </Cabecera>

      {/* ------------------------------------------------------------------ resumen */}
      <Revelar>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border-l-4 border-marca bg-menta-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-marca">Para toda la comuna</p>
            <p className="mt-2 text-base">
              Al Metro, la ruta más rápida toma <strong>{dec(metro.minutos_ruta_rapida)} min</strong>. Obligando a caminar por la 49 sube a <strong>{dec(metro.minutos_por_la_49)} min</strong>.
            </p>
          </div>
          <div className="rounded-2xl border-l-4 border-[#6ab7ff] bg-aviso-fondo p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ambar-texto">Para quién sí sirve</p>
            <p className="mt-2 text-base">
              Le queda de camino al Metro a {mejores.map((b, i) => `${dec(b.pct_49_en_el_camino)} % de ${b.barrio}${i < mejores.length - 2 ? ", " : i === mejores.length - 2 ? " y " : ""}`).join("")}.
            </p>
          </div>
          <div className="rounded-2xl border-l-4 border-[#c2301a] bg-ladrillo-claro p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-peligro">Lo que sí es seguro</p>
            <p className="mt-2 text-base">
              {veces ? <>Tiene <strong>{dec(veces)} veces</strong> los siniestros por kilómetro del promedio de las calles de la comuna.</> : "Concentra muchos siniestros viales."}
            </p>
          </div>
        </div>
      </Revelar>

      {/* ------------------------------------------------------------------ mapa interactivo */}
      <Seccion id="t-mapa" titulo="Dónde le sirve y dónde no" texto="Cada punto es una manzana, más grande si vive más gente. El color dice cuántos minutos más caminaría esa gente si va por la 49 en vez de por su ruta más rápida.">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Destino">
          {ORDEN.filter((o) => d.destinos[o.id]).map((o) => (
            <button
              key={o.id} role="tab" aria-selected={tipo === o.id} onClick={() => setTipo(o.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold transition ${tipo === o.id ? "bg-[#1e40af] text-white shadow-md" : "bg-superficie text-tinta ring-1 ring-black/10 hover:bg-menta"}`}
            >
              <IconoNav nombre={o.icono} className="h-5 w-5" />
              {o.corto}
            </button>
          ))}
        </div>
        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
          <MapaEje tipo={tipo} />
          <div>
            <h3 className="text-base font-semibold">Hacia: {dest.nombre.toLowerCase()}</h3>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              {[
                { k: "Ruta más rápida", v: dest.minutos_ruta_rapida, u: "min", c: "rgb(var(--marca))" },
                { k: "Obligando la 49", v: dest.minutos_por_la_49, u: "min", c: "rgb(var(--peligro))" },
              ].map((x) => (
                <div key={x.k} className="rounded-2xl bg-superficie p-5 shadow-sm ring-1 ring-black/5">
                  <dt className="text-sm font-semibold text-tinta-suave">{x.k}</dt>
                  <dd className="mt-1 text-3xl font-semibold leading-none tabular-nums" style={{ color: x.c }}>
                    <Cuenta hasta={x.v} decimales={1} activo duracion={900} /> <span className="text-lg font-semibold">{x.u}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="mt-5 space-y-3 text-base">
              <li><strong>{dec(dest.pct_49_en_el_camino)} %</strong> de las personas la tienen de camino (cuesta a lo sumo 1 minuto más).</li>
              <li>En la ruta más rápida, <strong>{dec(dest.pct_ruta_rapida_ya_usa_49)} %</strong> ya camina más de 100 m por la 49 sin proponérselo.</li>
              {d.eje.metros_proyectado > 0 && (
                <li className="text-tinta-suave">
                  Si se construyera el tramo de {num(d.eje.metros_proyectado)} m que el POT proyecta en la 49C (simulado con una línea recta), el tiempo hacia aquí pasaría de {dec(dest.minutos_por_la_49)} a {dec(dest.minutos_por_la_49_si_se_cierra_tramo)} min.
                </li>
              )}
            </ul>
          </div>
        </div>
      </Seccion>

      {/* ------------------------------------------------------------------ tabla por barrio */}
      <Seccion id="t-barrios" titulo="Barrio por barrio" texto={`Minutos promedio hacia ${dest.nombre.toLowerCase()}, ponderados por las personas de cada manzana.`}>
        <div className="overflow-x-auto rounded-2xl bg-superficie shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[40rem] text-left text-base">
            <thead className="border-b border-nivel text-sm text-tinta-suave">
              <tr>
                <th className="px-5 py-3 font-semibold">Barrio</th>
                <th className="px-3 py-3 text-right font-semibold">Personas</th>
                <th className="px-3 py-3 text-right font-semibold">Ruta rápida</th>
                <th className="px-3 py-3 text-right font-semibold">Por la 49</th>
                <th className="px-5 py-3 font-semibold">La 49 le queda de camino</th>
              </tr>
            </thead>
            <tbody>
              {[...dest.por_barrio].sort((a, b) => b.pct_49_en_el_camino - a.pct_49_en_el_camino).map((b) => (
                <tr key={b.barrio} className="border-b border-nivel/60 last:border-0">
                  <td className="px-5 py-3 font-semibold">{b.barrio}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{num(b.personas)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{dec(b.minutos_ruta_rapida)} min</td>
                  <td className="px-3 py-3 text-right tabular-nums">{dec(b.minutos_por_la_49)} min</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-32"><Barra valor={b.pct_49_en_el_camino} max={100} color="#2f8f5b" /></div>
                      <span className="w-14 tabular-nums">{dec(b.pct_49_en_el_camino)} %</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-tinta-tenue">El tiempo máximo por la 49 en esta vista es {dec(maxMin)} min. Los barrios en 0 % quedan lejos del trazado o al otro lado de la montaña.</p>
      </Seccion>

      {/* ------------------------------------------------------------------ estado de la vía */}
      <Seccion id="t-estado" titulo="Cómo está la 49 por dentro" texto={`Datos oficiales a menos de 25 m de sus ${dec(e.largo_km)} km existentes (Venezuela, 49B y 49C).`}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { n: e.siniestros, t: "siniestros viales entre 2019 y 2025", c: "rgb(var(--peligro))" },
            { n: e.por_clase["Atropello"] ?? 0, t: "de ellos, atropellos", c: "rgb(var(--peligro))" },
            { n: e.rutas_de_bus_sobre_el_eje.length, t: "líneas de bus que van por ella", c: "rgb(var(--marca))" },
            { n: e.paradas_cerca, t: "paradas de bus a menos de 40 m", c: "rgb(var(--marca))" },
          ].map((x) => (
            <Revelar key={x.t}>
              <div className="h-full rounded-2xl bg-superficie p-6 shadow-sm ring-1 ring-black/5">
                <p className="text-3xl font-semibold leading-none tabular-nums" style={{ color: x.c }}><Cuenta hasta={x.n} activo /></p>
                <p className="mt-2 text-base font-semibold">{x.t}</p>
              </div>
            </Revelar>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <Revelar>
            <div className="rounded-2xl bg-superficie p-6 shadow-sm ring-1 ring-black/5">
              <h3 className="text-base font-semibold">Siniestros por kilómetro</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-base"><span className="font-semibold">Carrera 49</span><span className="tabular-nums font-semibold text-peligro">{dec(e.siniestros_por_km)}</span></div>
                  <Barra valor={e.siniestros_por_km} max={anchoMax} color="#c2301a" />
                </div>
                {e.siniestros_por_km_comuna != null && (
                  <div>
                    <div className="flex justify-between text-base"><span className="font-semibold">Promedio de las calles de la comuna</span><span className="tabular-nums font-bold">{dec(e.siniestros_por_km_comuna)}</span></div>
                    <Barra valor={e.siniestros_por_km_comuna} max={anchoMax} color="#3b82f6" />
                  </div>
                )}
              </div>
              <p className="mt-4 text-sm text-tinta-suave">Por ella van {e.rutas_de_bus_sobre_el_eje.length} líneas de bus, así que parte de la diferencia puede ser simplemente más gente expuesta. Aun así, {e.siniestros} siniestros en {dec(e.largo_km)} km son una señal clara de dónde intervenir primero. Los siniestros se cuentan a menos de 25 m del trazado; el promedio usa {dec(e.calles_km_comuna)} km de calles de la red.</p>
            </div>
          </Revelar>
          <Revelar retraso={120}>
            <div className="h-full rounded-2xl bg-superficie p-6 shadow-sm ring-1 ring-black/5">
              <h3 className="text-base font-semibold">Andenes de la 49</h3>
              {e.ancho_andén_mediana_m != null ? (
                <>
                  <p className="mt-3 text-3xl font-semibold leading-none tabular-nums text-peligro">{dec(e.ancho_andén_mediana_m)} m</p>
                  <p className="mt-1 text-base font-semibold">ancho mediano del andén</p>
                  <p className="mt-3 text-base"><strong>{dec(e.andenes_menores_1_5_m_pct)} %</strong> de los {num(e.andenes_tramos)} tramos miden menos de 1,5 m.</p>
                </>
              ) : (
                <p className="mt-3 text-lg font-semibold text-tinta-suave">Pendiente de datos</p>
              )}
              <p className="mt-3 text-sm text-tinta-suave">Inventario oficial de andenes, sin diccionario publicado para estado y material. El umbral de 1,5 m es de referencia, no una norma verificada aquí.</p>
            </div>
          </Revelar>
        </div>

        <Revelar>
          <div className="rounded-2xl bg-superficie p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="text-base font-semibold">Líneas de bus que recorren la 49 (más de 200 m)</h3>
            <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {e.rutas_de_bus_sobre_el_eje.map((r) => (
                <li key={r.nombre + r.codigo} className="flex items-baseline justify-between gap-3 border-b border-nivel/60 py-1.5">
                  <span><strong>{r.nombre}</strong> <span className="text-sm text-tinta-suave">({r.codigo}, {r.empresa})</span></span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-sm text-tinta-suave">{num(r.metros_sobre_el_eje)} m</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-tinta-suave">Hay {e.camaras_cerca} cámaras y {e.semaforos_cerca} semáforos a menos de 40 m. Para el recorrido en bus o carro faltan velocidades reales y sentidos de circulación completos; ver más abajo.</p>
          </div>
        </Revelar>
      </Seccion>

      {/* ------------------------------------------------------------------ qué sigue */}
      <Seccion id="t-sigue" titulo="Qué dice esto y qué falta">
        <div className="grid gap-6 lg:grid-cols-2">
          <Revelar>
            <div className="h-full rounded-2xl border-l-4 border-marca bg-menta-2 p-6">
              <h3 className="text-base font-semibold">Lo que podemos afirmar</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-base">
                <li>A pie, la 49 no es la ruta más rápida para la comuna entera: a la mayoría de las manzanas no les queda de camino hacia ningún destino.</li>
                <li>Sí es el camino natural de {mejores.map((b) => b.barrio).join(", ")}, y por ella van varias líneas de bus.</li>
                <li>Es la vía donde más conviene mejorar andenes y cruces: concentra siniestros, buses y andenes angostos.</li>
              </ul>
            </div>
          </Revelar>
          <Revelar retraso={120}>
            <div className="h-full rounded-2xl border-l-4 border-[#6ab7ff] bg-aviso-fondo p-6">
              <h3 className="text-base font-semibold">Lo que todavía no podemos afirmar</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-base">
                <li>Cuánto se demora un bus o un carro por la 49: no hay datos abiertos de velocidades reales.</li>
                <li>El estado de los andenes (código sin diccionario) y la iluminación.</li>
                <li>Cuánta gente la usa de verdad: haría falta aforo peatonal o la Encuesta Origen Destino.</li>
              </ul>
              <Link to="/datos" className="mt-4 inline-flex items-center gap-2 font-semibold text-marca underline underline-offset-4">
                Ver qué datos se pueden bajar <IconoNav nombre="flecha" className="h-5 w-5" trazo={2} />
              </Link>
            </div>
          </Revelar>
        </div>
        <details className="mt-6 rounded-2xl bg-superficie p-5 shadow ring-1 ring-black/5">
          <summary className="cursor-pointer text-base font-semibold">Cómo se calculó (supuestos)</summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base text-tinta-suave">
            {d.supuestos.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <p className="mt-3 text-sm text-tinta-tenue">Script: <code>data-pipeline/eje49.py</code>. Tramos del eje: {d.eje.tramos.map((t) => `${t.nombre} (${t.estado.toLowerCase()}, ${num(t.metros)} m)`).join("; ")}.</p>
        </details>
        <div>
          <Link to="/mapa" className="inline-flex items-center gap-3 rounded-2xl bg-[#1e40af] px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
            <IconoNav nombre="mapa" className="h-6 w-6" trazo={2} /> Probar mi propia ruta en el mapa
          </Link>
        </div>
      </Seccion>
      <Relacionados ids={["problematicas", "accesibilidad", "prioridades"]} />
    </div>
  );
}

export default function Corredor49() {
  const estado = useDatos<Eje49>("eje49.json");
  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-papel" />
      <div className="mx-auto max-w-[112rem] space-y-10 px-4 py-6 lg:px-8 2xl:px-12">
        <ConDatos estado={estado}>{(d) => <Contenido d={d} />}</ConDatos>
      </div>
    </div>
  );
}
