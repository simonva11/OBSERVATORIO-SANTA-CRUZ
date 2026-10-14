import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Feature, FeatureCollection, Position } from "geojson";
import { useDatos } from "../lib/datos";
import { dec, num } from "../lib/formato";
import { useProyeccion } from "../lib/proyeccion";
import IconoNav from "../components/IconosNav";
import type { Coleccion } from "../lib/tipos";
import { LIMITE_BYTES, guardarConjuntos, leerCSV, leerConjuntos, leerGeoJSON, type ConjuntoPropio } from "../lib/misdatos";
import { Cabecera, Relacionados, Seccion } from "../components/Pagina";

const VERDE = "rgb(var(--marca))";
const MORADO = "#7a4e9b";
const ANCHO = 560;
const ALTO = 560;

// ------------------------------------------------------------------ punto dentro de polígono
function dentroAnillo(p: Position, anillo: Position[]) {
  let d = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
function dentroDe(p: Position, f: Feature) {
  const g = f.geometry;
  const poligonos = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  return poligonos.some((rs) => dentroAnillo(p, rs[0]) && !rs.slice(1).some((h) => dentroAnillo(p, h)));
}
const primerPunto = (f: Feature): Position | null => {
  const g = f.geometry as { type: string; coordinates: unknown };
  let c = g.coordinates;
  while (Array.isArray(c) && Array.isArray(c[0])) c = c[0];
  return Array.isArray(c) && typeof c[0] === "number" ? (c as Position) : null;
};

const PLANTILLA = "nombre;lat;lon;tipo;valor\nEjemplo (borrar esta fila);6.2988;-75.5560;ejemplo;1\n";

// ------------------------------------------------------------------ mapa pequeño con lo que se subió
function MapaMuestra({ col }: { col: FeatureCollection | null }) {
  const proy = useProyeccion(ANCHO, ALTO, 20);
  const dibujo = useMemo(() => {
    if (!proy || !col) return null;
    const { xy } = proy;
    const ruta = (ps: Position[]) => "M" + ps.map((p) => xy(p).map((v) => v.toFixed(1)).join(",")).join("L");
    const items: ReactNode[] = [];
    col.features.slice(0, 4000).forEach((f, i) => {
      const g = f.geometry;
      if (g.type === "Point") {
        const [x, y] = xy(g.coordinates);
        if (x > -20 && x < ANCHO + 20 && y > -20 && y < ALTO + 20) items.push(<circle key={i} cx={x} cy={y} r="4.2" fill={MORADO} fillOpacity="0.85" stroke="#fff" strokeWidth="1" />);
      } else if (g.type === "LineString") items.push(<path key={i} d={ruta(g.coordinates)} fill="none" stroke={MORADO} strokeWidth="2.4" />);
      else if (g.type === "MultiLineString") items.push(<path key={i} d={g.coordinates.map(ruta).join("")} fill="none" stroke={MORADO} strokeWidth="2.4" />);
      else if (g.type === "Polygon") items.push(<path key={i} d={g.coordinates.map((r) => ruta(r) + "Z").join("")} fill={MORADO} fillOpacity="0.3" stroke={MORADO} strokeWidth="1.6" />);
      else if (g.type === "MultiPolygon") items.push(<path key={i} d={g.coordinates.flatMap((p) => p.map((r) => ruta(r) + "Z")).join("")} fill={MORADO} fillOpacity="0.3" stroke={MORADO} strokeWidth="1.6" />);
    });
    return items;
  }, [proy, col]);
  if (!proy) return <div className="aspect-square w-full animate-[suave_2.6s_ease-in-out_infinite] rounded-2xl bg-papel-hondo" />;
  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full rounded-2xl bg-menta-2" role="img" aria-label="Mapa de la comuna con tus datos encima">
      {proy.items.map((b) => <path key={b.codigo} d={b.d} fill="rgb(var(--menta))" stroke="rgb(var(--nivel))" strokeWidth="1" strokeLinejoin="round" />)}
      {dibujo}
    </svg>
  );
}

// ------------------------------------------------------------------ subir archivos
interface Lectura { nombre: string; geojson: FeatureCollection; campos: string[]; descartadas: number }

function SubirDatos() {
  const navegar = useNavigate();
  const barrios = useDatos<Coleccion>("barrios.geojson");
  const comuna = useDatos<Coleccion>("comuna.geojson");
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [guardados, setGuardados] = useState<ConjuntoPropio[]>(() => leerConjuntos());
  const [aviso, setAviso] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const f = () => setGuardados(leerConjuntos());
    window.addEventListener("mis-datos", f);
    return () => window.removeEventListener("mis-datos", f);
  }, []);

  const abrir = useCallback(async (archivo: File) => {
    setError(null); setAviso(null);
    if (archivo.size > LIMITE_BYTES) { setError(`El archivo pesa ${dec(archivo.size / 1e6)} MB y el límite es ${dec(LIMITE_BYTES / 1e6)} MB, porque se guarda en tu navegador.`); setLectura(null); return; }
    try {
      const txt = await archivo.text();
      const esJson = /\.(geo)?json$/i.test(archivo.name) || txt.trimStart().startsWith("{") || txt.trimStart().startsWith("[");
      const r = esJson ? leerGeoJSON(txt) : leerCSV(txt);
      setLectura({ nombre: archivo.name.replace(/\.[^.]+$/, ""), ...r });
    } catch (e) {
      setLectura(null);
      setError((e as Error).message);
    }
  }, []);

  const analisis = useMemo(() => {
    if (!lectura || barrios.estado !== "listo" || comuna.estado !== "listo") return null;
    const porBarrio: Record<string, number> = {};
    let dentro = 0, fuera = 0;
    for (const f of lectura.geojson.features) {
      const p = primerPunto(f);
      if (!p) continue;
      if (comuna.datos.features.some((c) => dentroDe(p, c as Feature))) {
        dentro++;
        const b = barrios.datos.features.find((x) => dentroDe(p, x as Feature));
        const nombre = String(b?.properties?.nombre ?? "Sin barrio");
        porBarrio[nombre] = (porBarrio[nombre] ?? 0) + 1;
      } else fuera++;
    }
    const numericos = lectura.campos.filter((c) => lectura.geojson.features.slice(0, 50).every((f) => f.properties?.[c] == null || typeof f.properties[c] === "number") && lectura.geojson.features.some((f) => typeof f.properties?.[c] === "number"));
    return { dentro, fuera, porBarrio: Object.entries(porBarrio).sort((a, b) => b[1] - a[1]), numericos };
  }, [lectura, barrios, comuna]);

  const [campoNum, setCampoNum] = useState<string>("");
  const resumenNum = useMemo(() => {
    if (!lectura || !campoNum) return null;
    const v = lectura.geojson.features.map((f) => f.properties?.[campoNum]).filter((x): x is number => typeof x === "number");
    if (!v.length) return null;
    const suma = v.reduce((a, b) => a + b, 0);
    return { n: v.length, suma, prom: suma / v.length, min: Math.min(...v), max: Math.max(...v) };
  }, [lectura, campoNum]);

  const guardar = (verEnMapa: boolean) => {
    if (!lectura) return;
    const nuevo: ConjuntoPropio = { id: String(Date.now()), nombre: lectura.nombre, creado: new Date().toISOString(), filas: lectura.geojson.features.length, campos: lectura.campos, geojson: lectura.geojson };
    const lista = [...leerConjuntos(), nuevo];
    if (!guardarConjuntos(lista)) { setAviso("No cupo en el navegador. Borra un archivo guardado o sube uno más pequeño."); return; }
    setGuardados(lista);
    setLectura(null);
    if (verEnMapa) navegar("/mapa?capas=mis_datos");
    else setAviso(`Guardado "${nuevo.nombre}". Lo ves en el mapa prendiendo la capa "Mis datos".`);
  };
  const borrar = (id: string) => {
    const lista = leerConjuntos().filter((c) => c.id !== id);
    guardarConjuntos(lista);
    setGuardados(lista);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); const f = e.dataTransfer.files[0]; if (f) void abrir(f); }}
        className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${arrastrando ? "border-[#7a4e9b] bg-[#f3ecfa]" : "border-marca/35 bg-superficie/70"}`}
      >
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-menta text-marca"><IconoNav nombre="subir" className="h-9 w-9" trazo={1.8} /></span>
        <p className="mt-4 text-base font-semibold">Arrastra aquí tu archivo</p>
        <p className="mt-1 max-w-xl text-base text-tinta-suave">CSV con columnas <code>lat</code> y <code>lon</code>, o un GeoJSON. Se lee en tu computador: no se manda a ningún servidor.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => input.current?.click()} className="rounded-2xl bg-[#1e40af] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5">Elegir archivo</button>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(PLANTILLA)}`} download="plantilla-mis-datos.csv" className="rounded-2xl border-2 border-marca/40 px-5 py-2.5 text-sm font-semibold text-marca transition hover:bg-menta">Bajar plantilla CSV</a>
        </div>
        <input ref={input} type="file" accept=".csv,.txt,.json,.geojson,text/csv,application/json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void abrir(f); e.target.value = ""; }} />
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-ladrillo/40 bg-ladrillo-claro p-4 text-base font-semibold text-ladrillo">{error}</p>}
      {aviso && <p role="status" className="mt-4 rounded-xl bg-menta p-4 text-base font-semibold text-marca">{aviso}</p>}

      {lectura && (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
          <MapaMuestra col={lectura.geojson} />
          <div>
            <h3 className="text-base font-semibold">{lectura.nombre}</h3>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              {[{ k: "Elementos", v: num(lectura.geojson.features.length) }, { k: "Dentro de la comuna", v: analisis ? num(analisis.dentro) : "…" }, { k: "Fuera", v: analisis ? num(analisis.fuera) : "…" }].map((x) => (
                <div key={x.k} className="rounded-2xl bg-superficie p-4 shadow ring-1 ring-black/5">
                  <dt className="text-sm font-semibold text-tinta-suave">{x.k}</dt>
                  <dd className="mt-1 text-3xl font-semibold tabular-nums" style={{ color: VERDE }}>{x.v}</dd>
                </div>
              ))}
            </dl>
            {lectura.descartadas > 0 && <p className="mt-3 text-sm text-ladrillo">Se ignoraron {num(lectura.descartadas)} filas sin coordenadas válidas.</p>}
            {analisis && analisis.porBarrio.length > 0 && (
              <div className="mt-5">
                <h4 className="font-semibold">Por barrio</h4>
                <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
                  {analisis.porBarrio.map(([b, n]) => (
                    <li key={b} className="flex justify-between border-b border-nivel/60 py-1.5"><span>{b}</span><strong className="tabular-nums">{num(n)}</strong></li>
                  ))}
                </ul>
              </div>
            )}
            {analisis && analisis.numericos.length > 0 && (
              <div className="mt-5">
                <label className="font-semibold" htmlFor="campo-num">Resumir una columna numérica</label>
                <select id="campo-num" value={campoNum} onChange={(e) => setCampoNum(e.target.value)} className="mt-1 block w-full rounded-xl border border-nivel bg-superficie px-3 py-2 text-base">
                  <option value="">Elegir…</option>
                  {analisis.numericos.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {resumenNum && (
                  <p className="mt-2 text-base">Suma <strong>{dec(resumenNum.suma)}</strong> · promedio <strong>{dec(resumenNum.prom)}</strong> · de {dec(resumenNum.min)} a {dec(resumenNum.max)} ({num(resumenNum.n)} valores)</p>
                )}
              </div>
            )}
            <div className="mt-6">
              <h4 className="font-semibold">Primeras filas</h4>
              <div className="mt-2 overflow-x-auto rounded-xl ring-1 ring-black/10">
                <table className="w-full min-w-[26rem] text-left text-sm">
                  <thead className="bg-papel-hondo"><tr>{lectura.campos.slice(0, 5).map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}</tr></thead>
                  <tbody>
                    {lectura.geojson.features.slice(0, 5).map((f, i) => (
                      <tr key={i} className="border-t border-nivel/60">{lectura.campos.slice(0, 5).map((c) => <td key={c} className="px-3 py-1.5">{String(f.properties?.[c] ?? "")}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => guardar(true)} className="inline-flex items-center gap-2 rounded-2xl bg-[#1e40af] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5"><IconoNav nombre="mapa" className="h-6 w-6" trazo={2} /> Guardar y verlo en el mapa</button>
              <button type="button" onClick={() => guardar(false)} className="rounded-2xl border-2 border-marca/40 px-5 py-2.5 text-sm font-semibold text-marca transition hover:bg-menta">Solo guardar</button>
              <button type="button" onClick={() => setLectura(null)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-tinta-suave hover:underline">Descartar</button>
            </div>
          </div>
        </div>
      )}

      {guardados.length > 0 && (
        <div className="mt-10">
          <h3 className="text-base font-semibold">Lo que ya guardaste en este navegador</h3>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {guardados.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-superficie p-4 shadow ring-1 ring-black/5">
                <div><p className="font-semibold">{c.nombre}</p><p className="text-sm text-tinta-suave">{num(c.filas)} elementos · {new Date(c.creado).toLocaleDateString("es-CO")}</p></div>
                <div className="flex gap-2">
                  <Link to="/mapa?capas=mis_datos" className="rounded-xl bg-menta px-3 py-2 text-sm font-semibold text-marca">Ver en el mapa</Link>
                  <button type="button" onClick={() => borrar(c.id)} className="rounded-xl px-3 py-2 text-sm font-semibold text-ladrillo hover:bg-ladrillo-claro">Borrar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ catálogo
interface Fuente { id: string; nombre: string; estado?: string; registros?: number | null; fecha_descarga?: string | null }

const URL_MED = "https://www.medellin.gov.co/servidormapas/rest/services";
const POR_BAJAR: { que: string; donde: string; para: string; estado: "comprobada" | "por_verificar" }[] = [
  { que: "Sentidos de circulación y segmentos viales (flujo)", donde: `${URL_MED}/transporte/VA_SIGMOV_Segmentovial/MapServer, capa 1`, para: "Armar una red de bus y carro con sentidos. Falta la velocidad real para medir tiempos.", estado: "comprobada" },
  { que: "Señales verticales y horizontales", donde: `${URL_MED}/transporte/VA_SIGMOV_Seniales/MapServer`, para: "Pasos peatonales, límites de velocidad y reductores.", estado: "comprobada" },
  { que: "Hurto, riña y homicidio 2015 y 2016", donde: `${URL_MED}/seguridad_defensa/VM_Indicador_Seguridad/MapServer, capas 0 a 7`, para: "Series de seguridad por barrio (la plataforma ya trae 2017).", estado: "comprobada" },
  { que: "Densidad habitacional, índice de construcción y altura del POT por franja", donde: `${URL_MED}/ordenamiento_ter/VM_24_Densidad_Habitacional_Max/MapServer`, para: "Cuánto se puede construir en cada lote. Pedir los campos por nombre porque el servicio rechaza todos a la vez.", estado: "comprobada" },
  { que: "Sistema público y colectivo, movilidad y servicios públicos del POT", donde: `${URL_MED}/ordenamiento_ter (VM_10, VM_16, VM_19, VM_15)`, para: "Qué prevé el plan para espacio público, vías y redes.", estado: "comprobada" },
  { que: "POT 2025: red hídrica, corredores verdes, retiros a quebradas", donde: `${URL_MED}/ordenamiento_ter/VM_34_POT_2025/MapServer`, para: "Revisión de mediano plazo del POT en curso.", estado: "comprobada" },
  { que: "Licencias de construcción", donde: `${URL_MED}/vivienda_ciudad_terri/VM_Licencias/MapServer`, para: "Dónde se está construyendo y cuánta vivienda nueva llega.", estado: "por_verificar" },
  { que: "Cierres y pico y placa", donde: `${URL_MED}/transporte/VM_Cierres_Movilidad/MapServer`, para: "Contexto de movilidad en vehículo.", estado: "comprobada" },
  { que: "Encuesta Origen Destino 2017 del Área Metropolitana", donde: "Publicada en el hub de datos de TUMI (hub.tumidata.org)", para: "Cuánta gente viaja de dónde a dónde y en qué modo. Es la base para hablar de bus y carro.", estado: "comprobada" },
  { que: "Marco Geoestadístico Nacional y Censo 2018 (manzanas, secciones)", donde: "Geoportal del DANE (geoportal.dane.gov.co)", para: "Replicar la población por manzana en cualquier municipio.", estado: "por_verificar" },
  { que: "Calidad del aire y clima (SIATA)", donde: "siata.gov.co", para: "Exposición a contaminación por barrio.", estado: "por_verificar" },
  { que: "Red de salud y primera infancia", donde: "Secretaría de Salud, REPS, ICBF", para: "Destinos de salud completos (hoy hay muy pocos en la capa de equipamientos).", estado: "por_verificar" },
];

const MUNICIPIOS = ["Medellín", "Bello", "Itagüí", "Envigado", "Sabaneta", "La Estrella", "Caldas", "Copacabana", "Girardota", "Barbosa"];

function Catalogo() {
  const f = useDatos<Fuente[]>("fuentes.json");
  const total = f.estado === "listo" ? f.datos.length : null;
  const ok = f.estado === "listo" ? f.datos.filter((x) => x.registros != null && x.registros > 0).length : null;
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-3">
        {[{ n: total, t: "capas y fuentes en la plataforma" }, { n: ok, t: "con datos cargados hoy" }, { n: POR_BAJAR.length, t: "más encontradas para bajar" }].map((x) => (
          <div key={x.t} className="rounded-2xl bg-superficie p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-3xl font-semibold leading-none tabular-nums" style={{ color: VERDE }}>{x.n ?? "…"}</p>
            <p className="mt-2 text-base font-semibold">{x.t}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-base text-tinta-suave">De cada capa que ya está, con fecha, número de registros y limitaciones, hay detalle en <Link to="/fuentes" className="font-semibold text-marca underline underline-offset-4">Fuentes y calidad</Link>.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl bg-superficie shadow-sm ring-1 ring-black/5">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-nivel text-sm text-tinta-suave">
            <tr><th className="px-5 py-3 font-semibold">Qué</th><th className="px-3 py-3 font-semibold">Dónde</th><th className="px-3 py-3 font-semibold">Para qué sirve</th><th className="px-5 py-3 font-semibold">Estado</th></tr>
          </thead>
          <tbody>
            {POR_BAJAR.map((r) => (
              <tr key={r.que} className="border-b border-nivel/60 align-top last:border-0">
                <td className="w-56 px-5 py-3 font-semibold">{r.que}</td>
                <td className="px-3 py-3 text-xs text-tinta-suave break-all">{r.donde}</td>
                <td className="px-3 py-3 text-sm">{r.para}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${r.estado === "comprobada" ? "bg-menta text-marca" : "bg-ambar-claro text-ambar-texto"}`}>
                    {r.estado === "comprobada" ? "Existe y responde" : "Por verificar"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-tinta-tenue">"Existe y responde" significa que se consultó el servicio el 10 de octubre de 2026 desde el computador del equipo. "Por verificar" es una fuente conocida cuya descarga todavía no se comprobó aquí.</p>
    </div>
  );
}

// ------------------------------------------------------------------ Valle de Aburrá
function ValleDeAburra() {
  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <ol className="space-y-4">
          {[
            { t: "Cambiar la comuna por el territorio", d: "El pipeline filtra hoy por el código de comuna 02. Con un parámetro (comuna o municipio) la misma descarga sirve para cualquier otra." },
            { t: "Usar lo que ya es nacional", d: "Población por manzana del Censo 2018 (DANE), caminos de OpenStreetMap y relieve del modelo de elevación existen para todo el país, sin depender de una alcaldía." },
            { t: "Conseguir lo local", d: "Equipamientos, andenes, paradas, siniestros y normas del POT los publica cada alcaldía. Medellín lo hace por su geoportal; para los otros nueve municipios hay que verificar qué publican." },
            { t: "Medir con el mismo método", d: "La red peatonal con pendiente, los tiempos de Tobler y los indicadores son los mismos. Lo que cambia es la fuente, que queda documentada en Fuentes y calidad." },
            { t: "Comparar entre municipios", d: "Con el mismo método se pueden poner lado a lado espacio público por habitante, tiempo al transporte masivo y atropellos por mil habitantes." },
          ].map((p, i) => (
            <li key={p.t} className="flex gap-4 rounded-2xl bg-superficie p-5 shadow ring-1 ring-black/5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1e40af] text-base font-semibold text-white">{i + 1}</span>
              <div><p className="text-base font-semibold">{p.t}</p><p className="mt-0.5 text-base text-tinta-suave">{p.d}</p></div>
            </li>
          ))}
        </ol>
        <div className="rounded-2xl border-l-4 border-marca bg-menta-2 p-6">
          <h3 className="text-base font-semibold">Qué es el POT y por qué importa</h3>
          <p className="mt-2 text-base leading-relaxed">El Plan de Ordenamiento Territorial define qué se puede construir y dónde: usos del suelo, densidades, alturas, espacio público, vías y zonas de riesgo. En Medellín rige el Acuerdo 48 de 2014 y hoy está en revisión de mediano plazo.</p>
          <p className="mt-3 text-base leading-relaxed">Según la prensa y la Alcaldía, el 2 de junio de 2026 el Distrito y el Área Metropolitana firmaron el acta de concertación de las determinantes ambientales y metropolitanas, y el siguiente paso es la concertación rural con Corantioquia y la discusión en el Concejo. La revisión toca cerca del 78 % del articulado.</p>
          <p className="mt-3 text-base leading-relaxed">Cada municipio tiene su propio plan, y las determinantes metropolitanas son un marco común. Por eso un observatorio que cruce el POT con datos reales sirve en todo el Valle.</p>
        </div>
      </div>
      <div className="mt-8 overflow-x-auto rounded-2xl bg-superficie shadow-sm ring-1 ring-black/5">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-nivel text-sm text-tinta-suave">
            <tr><th className="px-5 py-3 font-semibold">Municipio</th><th className="px-3 py-3 font-semibold">Censo 2018, OSM y relieve</th><th className="px-5 py-3 font-semibold">Datos locales (equipamientos, andenes, siniestros, POT)</th></tr>
          </thead>
          <tbody>
            {MUNICIPIOS.map((m) => (
              <tr key={m} className="border-b border-nivel/60 last:border-0">
                <td className="px-5 py-3 font-semibold">{m}</td>
                <td className="px-3 py-3"><span className="rounded-full bg-ambar-claro px-3 py-1 text-xs font-semibold text-ambar-texto">{m === "Medellín" ? "Descargado" : "Por verificar"}</span></td>
                <td className="px-5 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${m === "Medellín" ? "bg-menta text-marca" : "bg-ambar-claro text-ambar-texto"}`}>{m === "Medellín" ? "Geoportal de la Alcaldía (ya integrado)" : "Por verificar"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-tinta-tenue">No se afirma qué publica cada municipio hasta comprobarlo capa por capa, igual que se hizo con Medellín.</p>
      <Relacionados ids={["fuentes", "mapa", "indicadores"]} />
    </div>
  );
}

export default function Datos() {
  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-papel" />
      <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
        <Cabecera className="mb-10" etiqueta="Mis datos y descargas" icono="subir" titulo="Todo lo que bajes, aquí se ve"
          texto="Sube un archivo y míralo al instante sobre la comuna, mira qué otros datos se pueden bajar y de dónde, y entiende cómo llevar esto a todo el Valle de Aburrá." />
        <Seccion id="t-subir" titulo="Sube tus datos" texto="Pueden ser encuestas, recorridos de campo, puntos de obras, lo que tengas con una ubicación.">
          <SubirDatos />
        </Seccion>
        <Seccion id="t-catalogo" titulo="Qué datos podemos bajar y de dónde" texto="Lo que ya está en la plataforma y lo que encontramos disponible, con su dirección.">
          <Catalogo />
        </Seccion>
        <Seccion id="t-valle" titulo="De la Comuna 2 a todo el Valle de Aburrá" texto="El método no depende de Santa Cruz. Lo que cambia es la fuente de cada capa.">
          <ValleDeAburra />
        </Seccion>
      </div>
    </div>
  );
}
