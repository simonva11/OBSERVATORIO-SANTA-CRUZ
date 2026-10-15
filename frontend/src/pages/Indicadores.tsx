import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ConDatos } from "../components/Estado";
import { useDatos } from "../lib/datos";
import { csvBarrios, descargar } from "../lib/csv";
import { dec, fecha, num, pct, dec2 } from "../lib/formato";
import type { FichaBarrio as Ficha, Indicadores as Ind } from "../lib/tipos";
import { BotonCabecera, Cabecera, EtiquetaClase, Fuente, Kpi, Relacionados, Seccion, type ClaseDato } from "../components/Pagina";
import { cop } from "../lib/formato";

const C = {
  barra: "#1f40cc",
  resaltada: "#101729",
  apagada: "#c9cfe0",
  rejilla: "#dedbd1",
  eje: "#626a7c",
};

// Paleta categórica validada (luz, contraste y daltonismo) para las clases de siniestro.
const CLASES_SINIESTRO: [string, string][] = [
  ["Atropello", "#a8452b"],
  ["Choque", "#1f63a8"],
  ["Caida ocupante", "#b7791f"],
  ["Volcamiento", "#7a4e9b"],
  ["Otro", "#2a8ac8"],
];

function Panel({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-tinta pt-3">
      <h3 className="fuente-titulo text-lg font-bold">{titulo}</h3>
      {descripcion && <p className="mt-0.5 text-sm text-tinta-suave">{descripcion}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const estiloTooltip = {
  contentStyle: { borderRadius: 6, border: "1px solid #d0def4", fontSize: 13, fontFamily: "DM Sans, sans-serif" },
  cursor: { fill: "rgba(31,64,204,0.06)" },
};

/* ------------------------------------------------------------------ explorador de indicadores */
type Met = { id: string; nombre: string; formula: string; unidad: string; fuentes: string[]; anio: string; metodo: string; clase: string; limitaciones: string };
type Def = { id: string; tema: string; valor: (b: Ficha, d: Ind) => number | null; comuna: (d: Ind) => number | null; fmt: (v: number) => string; mayorEsMejor: boolean | null; referencia?: { v: number; t: string } };
type FilaA = Record<string, number | string | null>;
const acc = (d: Ind, b: Ficha, k: string) => ((d.accesibilidad?.barrios as FilaA[] | undefined)?.find((x) => x.barrio === b.nombre)?.[k] as number | undefined) ?? null;
const and = (d: Ind, b: Ficha, k: string) => ((d.infraestructura?.andenes.barrios as FilaA[] | undefined)?.find((x) => x.barrio === b.nombre)?.[k] as number | undefined) ?? null;
const DEFS: Def[] = [
  { id: "poblacion", tema: "Población", valor: (b) => b.poblacion_2018, comuna: (d) => d.comuna.poblacion_2018, fmt: (v) => num(v), mayorEsMejor: null },
  { id: "densidad", tema: "Población", valor: (b) => b.densidad_hab_ha, comuna: (d) => d.comuna.densidad_hab_ha, fmt: (v) => num(Math.round(v)), mayorEsMejor: null },
  { id: "espacio_publico_hab", tema: "Espacio público", valor: (b) => b.espacio_publico_m2_hab, comuna: (d) => d.comuna.espacio_publico_m2_hab, fmt: (v) => dec2(v), mayorEsMejor: true, referencia: { v: 15, t: "Referencia nacional: 15" } },
  { id: "tiempo_caminata", tema: "Moverse a pie", valor: (b, d) => acc(d, b, "transporte_masivo_promedio_min"), comuna: (d) => (d.accesibilidad?.comuna as FilaA | undefined)?.transporte_masivo_promedio_min as number ?? null, fmt: (v) => dec(v), mayorEsMejor: false },
  { id: "poblacion_umbral", tema: "Moverse a pie", valor: (b, d) => acc(d, b, "transporte_masivo_10min_pct"), comuna: (d) => (d.accesibilidad?.comuna as FilaA | undefined)?.transporte_masivo_10min_pct as number ?? null, fmt: (v) => dec(v), mayorEsMejor: true },
  { id: "rodeo", tema: "Moverse a pie", valor: (b, d) => acc(d, b, "rodeo_mediano_transporte"), comuna: (d) => (d.accesibilidad?.comuna as FilaA | undefined)?.rodeo_mediano_transporte as number ?? null, fmt: (v) => dec2(v), mayorEsMejor: false },
  { id: "andenes_angostos", tema: "Moverse a pie", valor: (b, d) => and(d, b, "andenes_angostos_pct"), comuna: (d) => d.infraestructura?.andenes.angostos_pct ?? null, fmt: (v) => dec(v), mayorEsMejor: false },
  { id: "ancho_andenes", tema: "Moverse a pie", valor: (b, d) => and(d, b, "ancho_mediano_m"), comuna: (d) => d.infraestructura?.andenes.ancho_mediano_m ?? null, fmt: (v) => dec2(v), mayorEsMejor: true, referencia: { v: 1.2, t: "Referencia: 1,2 m" } },
  { id: "atropellos_mil", tema: "Seguridad vial", valor: (b) => (b.poblacion_2018 ? (b.atropellos / b.poblacion_2018) * 1000 : null), comuna: (d) => (d.comuna.poblacion_2018 ? (d.barrios.reduce((t, x) => t + x.atropellos, 0) / d.comuna.poblacion_2018) * 1000 : null), fmt: (v) => dec2(v), mayorEsMejor: false },
  { id: "amenaza_alta", tema: "Riesgo", valor: (b) => b.amenaza_alta_pct, comuna: (d) => d.comuna.amenaza_pct?.Alta ?? null, fmt: (v) => dec(v), mayorEsMejor: false },
  { id: "precio_m2_oferta", tema: "Vivienda", valor: (b) => b.mediana_precio_m2_venta ?? null, comuna: () => null, fmt: (v) => cop(v), mayorEsMejor: null },
];
const claseDe = (t: string): ClaseDato => (/oficial|descargado/i.test(t) ? "oficial" : "derivado");

function Explorador({ d, sel, onSel }: { d: Ind; sel: string; onSel: (c: string) => void }) {
  const met = useDatos<{ indicadores: Met[] }>("metodologia.json");
  const [id, setId] = useState("espacio_publico_hab");
  const def = DEFS.find((x) => x.id === id)!;
  const m = met.estado === "listo" ? met.datos.indicadores.find((x) => x.id === id) : undefined;
  const filas = d.barrios.map((b) => ({ b, v: def.valor(b, d) })).sort((x, y) => (y.v ?? -1) - (x.v ?? -1));
  const cv = def.comuna(d);
  const max = Math.max(...filas.map((f) => f.v ?? 0), cv ?? 0, def.referencia?.v ?? 0) || 1;
  const temas = [...new Set(DEFS.map((x) => x.tema))];
  const nombreDe = (x: Def) => (met.estado === "listo" ? met.datos.indicadores.find((y) => y.id === x.id)?.nombre.replace(/^A\. /, "") : x.id) ?? x.id;
  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <nav aria-label="Elegir indicador" className="grid content-start gap-4">
        {temas.map((t) => (
          <div key={t}>
            <p className="mono text-[0.68rem] uppercase tracking-[0.06em] text-tinta-tenue">{t}</p>
            <ul className="mt-1 grid gap-0.5">
              {DEFS.filter((x) => x.tema === t).map((x) => (
                <li key={x.id}>
                  <button type="button" aria-pressed={x.id === id} onClick={() => setId(x.id)} className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[0.92rem] transition ${x.id === id ? "bg-tinta font-semibold text-papel" : "hover:bg-papel-hondo"}`}>
                    {nombreDe(x)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="min-w-0">
        {m ? (
          <div className="border-t-2 border-tinta pt-3">
            <div className="flex flex-wrap items-center gap-2"><EtiquetaClase clase={claseDe(m.clase)} /><span className="mono text-[0.72rem] text-tinta-tenue">{m.unidad} · {m.anio}</span></div>
            <h3 className="fuente-titulo mt-2 text-2xl font-extrabold tracking-[-0.02em]">{m.nombre.replace(/^A\. /, "")}</h3>
            <p className="mt-1 text-tinta-suave"><span className="mono text-[0.78rem] text-tinta">{m.formula}</span></p>
            {cv != null && <p className="mt-3 text-lg">Toda la comuna: <strong className="fuente-titulo text-2xl">{def.fmt(cv)}</strong> <span className="text-tinta-suave">{m.unidad}</span></p>}
          </div>
        ) : <p className="text-tinta-tenue">Cargando la definición…</p>}
        <ul className="mt-5 grid gap-1.5" aria-label="Valor por barrio">
          {filas.map(({ b, v }) => {
            const peor = v != null && cv != null && def.mayorEsMejor != null && (def.mayorEsMejor ? v < cv : v > cv);
            return (
              <li key={b.codigo} className={`grid grid-cols-[9.5rem_minmax(0,1fr)_6.5rem] items-center gap-3 rounded-md px-1 py-0.5 text-sm ${b.codigo === sel ? "bg-papel-hondo font-semibold" : ""}`}>
                <button type="button" onClick={() => onSel(b.codigo === sel ? "" : b.codigo)} className="truncate text-left hover:text-marca" title="Resaltar este barrio">{b.nombre}</button>
                <span className="relative h-3 rounded-full bg-papel-hondo">
                  {v != null && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(v / max) * 100}%`, background: b.codigo === sel ? "rgb(var(--tinta))" : peor ? "rgb(var(--peligro))" : "rgb(var(--marca))" }} />}
                  {cv != null && <span aria-hidden="true" className="absolute -inset-y-1 w-0.5 bg-tinta" style={{ left: `${(cv / max) * 100}%` }} title="Comuna" />}
                  {def.referencia && <span aria-hidden="true" className="absolute -inset-y-1 w-0 border-l-2 border-dashed border-ladera" style={{ left: `${(def.referencia.v / max) * 100}%` }} />}
                </span>
                <span className="text-right tabular-nums">{v == null ? <span className="text-tinta-tenue">sin dato</span> : def.fmt(v)}</span>
              </li>
            );
          })}
        </ul>
        <p className="mono mt-2 flex flex-wrap gap-x-4 text-[0.7rem] text-tinta-tenue">
          {cv != null && <span>▮ raya negra: toda la comuna</span>}
          {def.referencia && <span>┆ raya verde: {def.referencia.t}</span>}
          {def.mayorEsMejor != null && <span>en rojo: peor que la comuna</span>}
        </p>
        {m && (
          <div className="seccion-pie">
            <Fuente ids={m.fuentes.filter((f) => !["osm_caminos", "dem_terrarium"].includes(f))} calculo={claseDe(m.clase) === "derivado" ? "cálculo de OTEA" : undefined} />
            <details className="metodo">
              <summary>Cómo se calculó y qué no dice</summary>
              <div className="metodo-cuerpo">
                <p><strong>Método:</strong> {m.metodo}.</p>
                <p><strong>Limitaciones:</strong> {m.limitaciones}.</p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function Contenido({ d }: { d: Ind }) {
  const [sel, setSel] = useState("");
  const { comuna, barrios, ecv } = d;
  const ficha = barrios.find((b) => b.codigo === sel);
  const atropellos = barrios.reduce((a, b) => a + b.atropellos, 0);

  const siniestros = useMemo(
    () =>
      comuna.siniestros_por_anio.map((r) => ({
        anio: String(r.anio),
        Atropello: r.Atropello ?? 0,
        Choque: r.Choque ?? 0,
        "Caida ocupante": r["Caida ocupante"] ?? 0,
        Volcamiento: r.Volcamiento ?? 0,
        Otro: (r.Otro ?? 0) + (r.Incendio ?? 0),
      })),
    [comuna],
  );

  const imcv = ecv.imcv;

  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Indicadores" icono="indicadores" titulo="Indicadores de Santa Cruz"
        texto={<>Cifras por barrio calculadas con datos de la Alcaldía de Medellín y del DANE, cada una con su fórmula, su unidad, su año y su fuente. Cálculo actualizado el {fecha(d.generado)}.</>}
        pregunta="¿Cómo se comparan los barrios en cada indicador y cómo ha cambiado la comuna?">
        <BotonCabecera to="/mapa">Verlos en el mapa</BotonCabecera>
        <button type="button" onClick={() => descargar("otea-barrios.csv", csvBarrios(d))} className="boton boton-2">Descargar CSV de los 11 barrios</button>
      </Cabecera>

      <Seccion id="t-i-cifras" pregunta="¿Cómo es la comuna en números?" titulo="Cifras principales" texto="Lo esencial de Santa Cruz en ocho cifras. Cada una se explica y se compara por barrio en el explorador de abajo." fuente={<Fuente ids={["manzanas_censo", "espacio_publico", "equipamientos", "siniestros_viales", "andenes"]} calculo="cifras de comuna calculadas por OTEA" />}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valor={num(comuna.poblacion_2018)} texto="personas (Censo 2018)" nota={`${num(comuna.viviendas_2018)} viviendas`} />
        <Kpi valor={`${num(Math.round(comuna.densidad_hab_ha ?? 0))}`} texto="habitantes por hectárea" nota={`${dec(comuna.area_ha)} ha en total`} />
        <Kpi valor={`${dec2(comuna.espacio_publico_m2_hab)} m²`} texto="de espacio público por habitante" nota="Referencia nacional: 15 m²" tono="rojo" />
        <Kpi valor={num(comuna.equipamientos)} texto="equipamientos colectivos" nota={`${comuna.sedes_educativas} sedes educativas, ${comuna.escenarios_deportivos} escenarios deportivos`} />
        <Kpi
          valor={String(comuna.estaciones_en_comuna.length)}
          texto={comuna.estaciones_en_comuna.length === 1 ? "estación de Metro o cable dentro de la comuna" : "estaciones de Metro o cable dentro de la comuna"}
          nota={comuna.estaciones_en_comuna.join(", ")}
        />
        <Kpi valor={num(atropellos)} texto="atropellos entre 2019 y 2025" nota={`${num(comuna.siniestros_total)} siniestros viales en total`} />
        <Kpi
          valor={d.infraestructura ? `${dec(d.infraestructura.andenes.km)} km` : "Sin dato"}
          texto="de andén en el inventario oficial"
          nota={d.infraestructura ? `Ancho mediano ${dec2(d.infraestructura.andenes.ancho_mediano_m)} m` : undefined}
        />
        <Kpi
          valor={d.accesibilidad ? `${dec(d.accesibilidad.comuna.transporte_masivo_promedio_min)} min` : "Sin dato"}
          texto="caminando en promedio hasta una estación"
          nota="Estimación por la red de calles y con pendiente"
        />
      </div>
      </Seccion>

      <Seccion id="t-i-explorar" pregunta="¿Cómo le va a cada barrio?" titulo="Explorar un indicador" texto="Elige un indicador a la izquierda: verás qué mide, con qué fórmula y cómo queda cada barrio frente a la comuna. Toca un barrio para resaltarlo." siguiente={ficha ? [{ to: `/barrios/${ficha.codigo}`, texto: `Abrir la ficha de ${ficha.nombre}` }] : [{ to: "/barrios", texto: "Ver la ficha completa de un barrio" }]}>
        <Explorador d={d} sel={sel} onSel={setSel} />
      </Seccion>

      <Seccion id="t-i-tiempo" pregunta="¿Cómo ha cambiado?" titulo="Con el paso del tiempo" texto="Las dos series que se pueden seguir año a año para la comuna: siniestros viales y calidad de vida." fuente={<Fuente ids={["siniestros_viales", "indicadores_ecv"]} />}>
      <div className="grid gap-8 lg:grid-cols-2">
      <Panel
        titulo="Siniestros viales por año en la comuna"
        descripcion="Secretaría de Movilidad. La forma de clasificar cambia entre años y 2025 puede estar incompleto: compare con cuidado."
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={siniestros} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={C.rejilla} />
              <XAxis dataKey="anio" tick={{ fontSize: 12, fill: C.eje }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: C.eje }} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => num(v)} />
              <Tooltip {...estiloTooltip} />
              <Legend wrapperStyle={{ fontSize: 13 }} iconType="square" />
              {CLASES_SINIESTRO.map(([clase, color], i) => (
                <Bar
                  key={clase}
                  dataKey={clase}
                  name={clase === "Caida ocupante" ? "Caída de ocupante" : clase}
                  stackId="s"
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  radius={i === CLASES_SINIESTRO.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {imcv && (
        <Panel
          titulo="Índice Multidimensional de Condiciones de Vida"
          descripcion={`Encuesta de Calidad de Vida. En ${imcv.ultimo_anio} Santa Cruz quedó en el puesto ${imcv.posicion} de ${imcv.de} comunas y corregimientos (el mejor fue ${imcv.mejor_territorio}, con ${dec(imcv.mejor_valor_ciudad)}).`}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={imcv.serie} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.rejilla} />
                <XAxis dataKey="anio" tick={{ fontSize: 12, fill: C.eje }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
                  allowDecimals={false}
                  tickFormatter={(v: number) => num(v)}
                  tick={{ fontSize: 12, fill: C.eje }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip {...estiloTooltip} formatter={(v: number) => [dec(v), "IMCV"]} cursor={{ stroke: "#626a7c", strokeDasharray: "3 3" }} />
                <Line type="monotone" dataKey="valor" stroke="#1f40cc" strokeWidth={2.5} dot={{ r: 4, fill: "#1f40cc", stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-tinta-tenue">No hay dato publicado para 2020.</p>
        </Panel>
      )}

      </div>
      </Seccion>

      <Seccion id="t-i-tabla" pregunta="¿Necesitas todas las cifras juntas?" titulo="Detalle por barrio" texto="Todas las cifras en una sola tabla. El nombre de cada barrio abre su ficha. La misma tabla se descarga en CSV desde el encabezado." fuente={<Fuente ids={["manzanas_censo", "equipamientos", "espacio_publico", "amenaza_movimiento_masa", "siniestros_viales", "estaciones"]} calculo="cifras por barrio calculadas por OTEA" />}>
      <div>
        <div className="overflow-x-auto">
          <table className="tabla min-w-[760px]">
            <thead>
              <tr>
                <th>Barrio</th>
                <th className="py-2 pr-3 text-right font-semibold">Población 2018</th>
                <th className="py-2 pr-3 text-right font-semibold">hab/ha</th>
                <th className="py-2 pr-3 text-right font-semibold">Equipamientos</th>
                <th className="py-2 pr-3 text-right font-semibold">Espacio público m²/hab</th>
                <th className="py-2 pr-3 text-right font-semibold">Amenaza alta</th>
                <th className="py-2 pr-3 text-right font-semibold">Atropellos</th>
                <th className="py-2 text-left font-semibold">Estación más cercana (línea recta)</th>
              </tr>
            </thead>
            <tbody>
              {barrios.map((b) => (
                <tr key={b.codigo} className={b.codigo === sel ? "bg-papel-hondo" : ""}>
                  <td className="py-1.5 pr-3">
                    <Link to={`/barrios/${b.codigo}`} className="font-semibold text-marca underline-offset-2 hover:underline">
                      {b.nombre}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{num(b.poblacion_2018)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{num(b.densidad_hab_ha && Math.round(b.densidad_hab_ha))}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{num(b.equipamientos)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{dec2(b.espacio_publico_m2_hab)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{pct(b.amenaza_alta_pct)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{num(b.atropellos)}</td>
                  <td className="whitespace-nowrap py-1.5 text-left">
                    {b.estacion_mas_cercana} <span className="text-tinta-suave">({num(b.estacion_distancia_lineal_m)} m)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </Seccion>

      <section className="vacio">
        <div>
        <h2 className="font-semibold text-tinta">Indicadores que todavía no se pueden calcular</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-tinta-suave">
          <li>Estado de los andenes: el inventario oficial trae códigos sin diccionario publicado.</li>
          <li>Costos de obra: no hay precios unitarios públicos confiables; se pueden registrar con su fuente en Prioridad de obras.</li>
          <li>Reportes ciudadanos validados: todavía no está disponible.</li>
          <li>Seguridad reciente: la Alcaldía publica hurto y homicidio por barrio solo hasta 2017.</li>
        </ul>
        </div>
      </section>
      <Relacionados ids={["problematicas", "accesibilidad", "prioridades"]} />
    </div>
  );
}

export default function Indicadores() {
  const estado = useDatos<Ind>("indicadores.json");
  return <ConDatos estado={estado}>{(d) => <Contenido d={d} />}</ConDatos>;
}
