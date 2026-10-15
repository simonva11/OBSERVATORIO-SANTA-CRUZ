import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Feature, FeatureCollection, Position } from "geojson";
import { useDatos } from "../lib/datos";
import { dec, num } from "../lib/formato";
import { useProyeccion } from "../lib/proyeccion";
import IconoNav from "../components/IconosNav";
import type { Coleccion } from "../lib/tipos";
import { LIMITE_BYTES, guardarConjuntos, leerCSV, leerConjuntos, leerGeoJSON, type ConjuntoPropio } from "../lib/misdatos";
import { Aviso, Cabecera, EtiquetaClase, Kpi, Relacionados, Seccion } from "../components/Pagina";

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
  if (!proy) return <div className="aspect-square w-full animate-[suave_2.6s_ease-in-out_infinite] rounded-[14px] bg-papel-hondo" />;
  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full rounded-[14px] border border-nivel bg-papel-hondo" role="img" aria-label="Mapa de la comuna con tus datos encima">
      {proy.items.map((b) => <path key={b.codigo} d={b.d} fill="rgb(var(--superficie))" stroke="rgb(var(--nivel))" strokeWidth="1" strokeLinejoin="round" />)}
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
    else setAviso(`Se guardó "${nuevo.nombre}" en este navegador. Para verlo, prende la capa "Mis datos" en el mapa.`);
  };
  const borrar = (id: string) => {
    const lista = leerConjuntos().filter((c) => c.id !== id);
    guardarConjuntos(lista);
    setGuardados(lista);
  };

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div
          onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastrando(false); const f = e.dataTransfer.files[0]; if (f) void abrir(f); }}
          className={`flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-6 py-12 text-center transition ${arrastrando ? "border-marca bg-menta-2" : "border-nivel bg-superficie"}`}
        >
          <IconoNav nombre="subir" className="h-10 w-10 text-marca" trazo={1.6} />
          <p className="mt-4 text-lg font-semibold">Arrastra aquí tu archivo</p>
          <p className="mt-1 max-w-md text-sm text-tinta-suave">o elígelo desde tu computador. Se lee aquí mismo: no se manda a ningún servidor.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => input.current?.click()} className="boton boton-1">Elegir archivo</button>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(PLANTILLA)}`} download="plantilla-mis-datos.csv" className="boton boton-2">Bajar plantilla CSV</a>
          </div>
          <input ref={input} type="file" accept=".csv,.txt,.json,.geojson,text/csv,application/json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void abrir(f); e.target.value = ""; }} />
        </div>
        <div className="text-sm">
          <p className="font-mono text-xs uppercase tracking-wider text-tinta-tenue">Qué acepta</p>
          <dl className="mt-2 divide-y divide-nivel border-y border-nivel">
            {[
              ["CSV", "Separado por punto y coma, coma o tabulador. Columnas de coordenadas llamadas lat y lon (también latitud y longitud), en grados decimales."],
              ["GeoJSON", "Puntos, líneas o polígonos en coordenadas geográficas (WGS84, las de cualquier GPS o Google Maps)."],
              ["Tamaño", `Hasta ${dec(LIMITE_BYTES / 1e6)} MB en total, porque se guarda en tu navegador.`],
              ["Otras columnas", "Se conservan. Las numéricas se pueden sumar y promediar."],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2">
                <dt className="font-semibold">{k}</dt>
                <dd className="text-tinta-suave">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-tinta-tenue">No subas nombres, cédulas ni teléfonos de personas: no hace falta para ubicar puntos en el mapa.</p>
        </div>
      </div>

      {error && <div className="mt-5"><Aviso tono="demo" titulo="No se pudo leer el archivo">{error}</Aviso></div>}
      {aviso && <div role="status" className="mt-5"><Aviso tono="info">{aviso}</Aviso></div>}

      {lectura && (
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
          <MapaMuestra col={lectura.geojson} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="fuente-titulo text-xl font-semibold">{lectura.nombre}</h3>
              <span className="clase clase-ciudadano">Tus datos · vista previa</span>
            </div>
            <p className="mt-1 text-sm text-tinta-suave">Todavía no está guardado. Revisa que los puntos caigan donde esperas.</p>
            <div className="mt-5 grid grid-cols-3 gap-5">
              <Kpi valor={num(lectura.geojson.features.length)} texto="elementos leídos" />
              <Kpi valor={analisis ? num(analisis.dentro) : "…"} texto="dentro de la comuna" />
              <Kpi valor={analisis ? num(analisis.fuera) : "…"} tono={analisis && analisis.fuera > 0 ? "ambar" : "verde"} texto="fuera de la comuna" />
            </div>
            {lectura.descartadas > 0 && <p className="mt-3 text-sm text-peligro">Se ignoraron {num(lectura.descartadas)} filas sin coordenadas válidas.</p>}
            {analisis && analisis.fuera > 0 && analisis.dentro === 0 && (
              <div className="mt-4"><Aviso tono="ojo" titulo="Ningún punto cae en la Comuna 2">Revisa que lat y lon no estén al revés y que estén en grados decimales (por ejemplo 6.29 y -75.55).</Aviso></div>
            )}
            {analisis && analisis.porBarrio.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold">Cuántos caen en cada barrio</h4>
                <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
                  {analisis.porBarrio.map(([b, n]) => (
                    <li key={b} className="flex justify-between border-b border-nivel py-1.5 text-sm"><span>{b}</span><strong className="tabular-nums">{num(n)}</strong></li>
                  ))}
                </ul>
              </div>
            )}
            {analisis && analisis.numericos.length > 0 && (
              <div className="mt-6">
                <label className="etiqueta-campo" htmlFor="campo-num">Resumir una columna numérica</label>
                <select id="campo-num" value={campoNum} onChange={(e) => setCampoNum(e.target.value)} className="campo">
                  <option value="">Elegir…</option>
                  {analisis.numericos.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {resumenNum && (
                  <p className="mt-2 text-sm">Suma <strong>{dec(resumenNum.suma)}</strong> · promedio <strong>{dec(resumenNum.prom)}</strong> · de {dec(resumenNum.min)} a {dec(resumenNum.max)} ({num(resumenNum.n)} valores)</p>
                )}
              </div>
            )}
            {lectura.campos.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold">Primeras filas</h4>
                <div className="mt-2 overflow-x-auto">
                  <table className="tabla min-w-[26rem]">
                    <thead><tr>{lectura.campos.slice(0, 5).map((c) => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>
                      {lectura.geojson.features.slice(0, 5).map((f, i) => (
                        <tr key={i}>{lectura.campos.slice(0, 5).map((c) => <td key={c}>{String(f.properties?.[c] ?? "")}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => guardar(true)} className="boton boton-1"><IconoNav nombre="mapa" className="h-5 w-5" trazo={2} /> Guardar y verlo en el mapa</button>
              <button type="button" onClick={() => guardar(false)} className="boton boton-2">Solo guardar</button>
              <button type="button" onClick={() => setLectura(null)} className="boton text-tinta-suave hover:underline">Descartar</button>
            </div>
            <p className="mt-3 text-xs text-tinta-tenue">Guardar significa guardarlo en este navegador. Nadie más lo ve, y se pierde si borras los datos del navegador o cambias de equipo.</p>
          </div>
        </div>
      )}

      {guardados.length > 0 ? (
        <div className="mt-10">
          <h3 className="font-semibold">Lo que ya guardaste en este navegador</h3>
          <ul className="mt-3 divide-y divide-nivel border-y border-nivel">
            {guardados.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-semibold">{c.nombre}</p><p className="text-sm text-tinta-suave">{num(c.filas)} elementos · subido el {new Date(c.creado).toLocaleDateString("es-CO")}</p></div>
                <div className="flex gap-2">
                  <Link to="/mapa?capas=mis_datos" className="chip">Ver en el mapa</Link>
                  <button type="button" onClick={() => borrar(c.id)} className="chip text-peligro">Borrar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : !lectura && (
        <p className="mt-8 text-sm text-tinta-tenue">Todavía no has guardado archivos en este navegador.</p>
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
  const comprobadas = POR_BAJAR.filter((r) => r.estado === "comprobada").length;
  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-3">
        <Kpi valor={total ?? "…"} texto="fuentes ya cargadas" nota={<Link to="/fuentes" className="fuente-enlace">Ver el catálogo completo</Link>} />
        <Kpi valor={comprobadas} texto="encontradas y que responden" nota="Aún no están en la plataforma" />
        <Kpi valor={POR_BAJAR.length - comprobadas} tono="ambar" texto="conocidas, sin comprobar" nota="No se sabe si se pueden descargar" />
      </div>
      <ul className="mt-8 divide-y divide-nivel border-y border-nivel">
        {POR_BAJAR.map((r) => (
          <li key={r.que} className="grid gap-1 py-3 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] md:gap-6">
            <p className="font-semibold">{r.que}</p>
            <div className="min-w-0 text-sm">
              <p>{r.para}</p>
              <p className="mt-0.5 break-all text-xs text-tinta-tenue">{r.donde}</p>
            </div>
            <span className="self-start">{r.estado === "comprobada" ? <span className="clase clase-oficial">Existe y responde</span> : <EtiquetaClase clase="pendiente" />}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-tinta-tenue">“Existe y responde” significa que el servicio se consultó el 10 de octubre de 2026 y devolvió datos. “Pendiente” es una fuente conocida cuya descarga todavía no se comprobó.</p>
    </div>
  );
}

// ------------------------------------------------------------------ Valle de Aburrá
function ValleDeAburra() {
  return (
    <div>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <ol className="space-y-5">
          {[
            { t: "Cambiar la comuna por el territorio", d: "El programa de descarga filtra hoy por el código de comuna 02. Con un parámetro (comuna o municipio) la misma descarga sirve para cualquier otra." },
            { t: "Usar lo que ya es nacional", d: "Población por manzana del Censo 2018 (DANE), caminos de OpenStreetMap y relieve existen para todo el país, sin depender de una alcaldía." },
            { t: "Conseguir lo local", d: "Equipamientos, andenes, paradas, siniestros y normas del POT los publica cada alcaldía. Medellín lo hace por su geoportal; para los otros nueve municipios hay que verificar qué publican." },
            { t: "Medir con el mismo método", d: "La red peatonal con pendiente, los tiempos a pie y los indicadores son los mismos. Lo que cambia es la fuente, que queda documentada." },
            { t: "Comparar entre municipios", d: "Con el mismo método se pueden poner lado a lado espacio público por habitante, tiempo al transporte masivo y atropellos por mil habitantes." },
          ].map((p, i) => (
            <li key={p.t} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="font-mono text-sm text-tinta-tenue">{String(i + 1).padStart(2, "0")}</span>
              <div><p className="font-semibold">{p.t}</p><p className="mt-0.5 text-sm text-tinta-suave">{p.d}</p></div>
            </li>
          ))}
        </ol>
        <div className="panel-hondo p-6">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">Qué es el POT y por qué importa</h3></div>
          <p className="mt-2 text-sm leading-relaxed">El Plan de Ordenamiento Territorial define qué se puede construir y dónde: usos del suelo, densidades, alturas, espacio público, vías y zonas de riesgo. En Medellín rige el Acuerdo 48 de 2014 y hoy está en revisión de mediano plazo.</p>
          <p className="mt-3 text-sm leading-relaxed"><EtiquetaClase clase="prensa" /> Según la prensa y la Alcaldía, el 2 de junio de 2026 el Distrito y el Área Metropolitana firmaron el acta de concertación de las determinantes ambientales y metropolitanas; el siguiente paso es la concertación rural con Corantioquia y la discusión en el Concejo.</p>
          <p className="mt-3 text-sm leading-relaxed">Cada municipio tiene su propio plan y las determinantes metropolitanas son un marco común. Por eso un observatorio que cruce el POT con datos reales serviría en todo el Valle.</p>
        </div>
      </div>
      <div className="mt-10 overflow-x-auto">
        <table className="tabla min-w-[36rem]">
          <thead><tr><th>Municipio</th><th>Censo 2018, OSM y relieve</th><th>Datos locales (equipamientos, andenes, siniestros, POT)</th></tr></thead>
          <tbody>
            {MUNICIPIOS.map((m) => (
              <tr key={m}>
                <td className="font-semibold">{m}</td>
                <td>{m === "Medellín" ? <span className="clase clase-oficial">Descargado</span> : <EtiquetaClase clase="pendiente" />}</td>
                <td>{m === "Medellín" ? <span className="clase clase-oficial">Geoportal integrado</span> : <EtiquetaClase clase="pendiente" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-tinta-tenue">No se afirma qué publica cada municipio hasta comprobarlo capa por capa, igual que se hizo con Medellín.</p>
    </div>
  );
}

export default function Datos() {
  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Mis datos" icono="subir" titulo="Pon tus propios datos sobre la comuna"
        pregunta="¿Cómo se ven mis puntos junto a los datos de la comuna?"
        texto="Sube una encuesta, un recorrido de campo o una lista de obras con coordenadas y mírala al instante sobre el mapa, contada por barrio. Tu archivo no sale de tu computador." />
      <Seccion id="t-subir" titulo="Sube tus datos" pregunta="¿Dónde caen mis puntos y en qué barrios?"
        texto="Lo que subas se queda en este navegador. OTEA no lo recibe, no lo publica y no lo mezcla con los datos oficiales: en el mapa aparece como una capa aparte llamada “Mis datos”.">
        <SubirDatos />
      </Seccion>
      <Seccion id="t-catalogo" titulo="Datos que se podrían sumar" pregunta="¿Qué más existe y todavía no está?"
        texto="Fuentes públicas que encontramos y que mejorarían los análisis. Ninguna está todavía en la plataforma.">
        <Catalogo />
      </Seccion>
      <Seccion id="t-valle" titulo="De la Comuna 2 a todo el Valle de Aburrá" pregunta="¿Sirve esto para otra comuna o municipio?"
        texto="El método no depende de Santa Cruz. Lo que cambia es la fuente de cada capa.">
        <ValleDeAburra />
      </Seccion>
      <Relacionados ids={["fuentes", "mapa", "indicadores"]} />
    </div>
  );
}
