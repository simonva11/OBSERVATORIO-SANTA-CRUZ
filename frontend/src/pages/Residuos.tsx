import { useMemo, useState } from "react";
import { ConDatos } from "../components/Estado";
import MapaResiduos, { COLOR_FRECUENCIA, ESCALA, NOMBRE_FRECUENCIA, cortesBarrios, cortesValidos } from "../components/MapaResiduos";
import type { BarrioRes, Cortes, Modo, Seleccion, Variable } from "../components/MapaResiduos";
import { Cabecera, Kpi, Relacionados, Seccion } from "../components/Pagina";
import { useDatos } from "../lib/datos";
import { dec, fecha, num } from "../lib/formato";

interface Ruta {
  cod_ruta: string; denominacion: string; bloque: string; dias: string; horario: string | null;
  planeacion_emvarias: { ton_teoric: number | null; ton_1era_frecuencia: number | null };
  t_mes: number; viajes: number; vehiculos: number; kg_viaje: number; instalaciones_ruta: number; instalaciones_comuna: number;
  pct_ruta_en_comuna2: number; kg_inst_mes: number; t_mes_atribuible_comuna2: number;
}
interface BarrioFila extends BarrioRes { en_comuna2: boolean; pct_en_barrio: number }
interface Resumen {
  generado: string; periodo: { desde: string; hasta: string; meses: number };
  kpis: {
    t_mes_comuna: number; t_mes_rutas_completas: number; instalaciones: number; kg_inst_mes: number; rutas: number;
    dias_predominante: string; pct_instalaciones_bloque: number; horario_predominante: string; pct_instalaciones_horario: number;
    km_recoleccion: number; km_sin_recoleccion: number; pesajes: number; instalaciones_otros_barrios_epm: number; estrato_prom: number;
  };
  cortes: Cortes; rutas: Ruta[]; barrios: BarrioFila[];
  serie_diaria: { fecha: string; t: number }[];
  por_dia_semana: { dia: string; t_total: number; t_promedio: number; dias_con_dato: number }[];
  por_hora: { hora: number; pesajes: number; t: number }[];
  mensual: { mes: string; t: number }[];
}

const VARIABLES: { id: Variable; nombre: string }[] = [
  { id: "frecuencia", nombre: "Días de recolección" },
  { id: "t_mes", nombre: "Toneladas al mes" },
  { id: "kg_inst_mes", nombre: "Kilos por instalación" },
  { id: "vehiculos", nombre: "Vehículos distintos" },
];
const MODOS: { id: Modo; nombre: string; texto: string }[] = [
  { id: "rutas", nombre: "Por ruta", texto: "Cada zona es una ruta de Emvarias. Mientras más oscuro, más toneladas (o lo que elijas abajo)." },
  { id: "calles", nombre: "Calle por calle", texto: "Las calles por donde pasa el camión, tramo por tramo: en naranja recoge basura y en gris punteado solo pasa." },
  { id: "barrios", nombre: "Por barrio", texto: "Cada barrio pintado según las toneladas al mes que se estiman para él (más oscuro, más basura)." },
  { id: "densidad", nombre: "Instalaciones", texto: "Cuántas instalaciones (casas, apartamentos y locales) hay en cada cuadro de 100 m. Más oscuro, más instalaciones." },
];
const UNIDAD: Record<string, string> = { t_mes: "t/mes", kg_inst_mes: "kg/inst./mes", vehiculos: "vehículos" };

function hora12(h: number) {
  const s = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 === 0 ? 12 : h % 12} ${s}`;
}
function horarioLindo(h: string | null | undefined) {
  if (!h) return "Sin horario";
  return h.replace(/(\d{1,2}):(\d{2})(AM|PM)/g, (_, a, b, c) => `${Number(a)}${b === "00" ? "" : ":" + b} ${c === "AM" ? "a. m." : "p. m."}`);
}

function Escala({ titulo, rangos }: { titulo: string; rangos: string[] }) {
  return (
    <div className="text-xs">
      <p className="mb-1.5 font-semibold">{titulo}</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
        {rangos.map((r, i) => (
          <li key={r} className="flex items-center gap-1.5">
            <span aria-hidden className="h-3.5 w-6 rounded-sm border border-black/10" style={{ background: ESCALA[i] }} />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
function rangosDe(c: number[], unidad = ""): string[] {
  return [...c, null].map((b, i) => {
    const a = i === 0 ? null : c[i - 1];
    if (a == null) return `Hasta ${dec(b)}${unidad}`;
    if (b == null) return `Más de ${dec(a)}${unidad}`;
    return `${dec(a)} a ${dec(b)}${unidad}`;
  });
}

function Leyenda({ modo, variable, cortes, barrios, verCalles }: { modo: Modo; variable: Variable; cortes: Cortes; barrios: BarrioRes[]; verCalles: boolean }) {
  const calles = (modo === "calles" || verCalles) && (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      <li className="flex items-center gap-1.5"><span aria-hidden className="h-1 w-7 rounded bg-[#f08c1a]" />Calle donde el camión recoge</li>
      <li className="flex items-center gap-1.5"><span aria-hidden className="w-7 border-t-[3px] border-dashed border-[#64748b]" />Calle donde solo pasa</li>
    </ul>
  );
  let principal: React.ReactNode = null;
  if (modo === "rutas" && variable === "frecuencia")
    principal = (
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {Object.keys(COLOR_FRECUENCIA).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span aria-hidden className="h-3.5 w-6 rounded-sm border border-black/10" style={{ background: COLOR_FRECUENCIA[k] }} />
            {NOMBRE_FRECUENCIA[k]}
          </li>
        ))}
      </ul>
    );
  else if (modo === "rutas") {
    const c = cortesValidos(cortes[variable as "t_mes"]);
    principal = <Escala titulo={`${VARIABLES.find((v) => v.id === variable)?.nombre} (${UNIDAD[variable]})`} rangos={rangosDe(c)} />;
  } else if (modo === "barrios") principal = <Escala titulo="Toneladas al mes estimadas por barrio" rangos={rangosDe(cortesBarrios(barrios))} />;
  else if (modo === "densidad") principal = <Escala titulo="Instalaciones por cuadro de 100 m" rangos={["Menos de 5", "5 a 19", "20 a 59", "60 a 149", "150 o más"]} />;
  return <div className="space-y-2">{principal}{calles}<p className="flex items-center gap-1.5 text-xs text-tinta-suave"><span aria-hidden className="w-7 border-t-2 border-dashed border-tinta" />Línea punteada oscura: límite de la Comuna 2</p></div>;
}

function Detalle({ sel, rutas, barrios }: { sel: Seleccion | null; rutas: Ruta[]; barrios: BarrioFila[] }) {
  if (!sel)
    return (
      <div className="rounded-2xl border border-dashed border-nivel p-4 text-sm text-tinta-suave">
        <p className="font-semibold text-tinta">Toca el mapa</p>
        <p className="mt-1">Toca una ruta, una calle, un barrio o un cuadro y aquí aparece su detalle.</p>
      </div>
    );
  const p = sel.props;
  const filas: [string, string][] = [];
  let titulo = "", sub = "", nota = "";
  const n = (v: unknown, f = dec, suf = "") => (typeof v === "number" ? f(v) + suf : "Sin dato");
  if (sel.capa === "macrorutas" || sel.capa === "ruteo") {
    const r = rutas.find((x) => x.cod_ruta === p.COD_RUTA);
    titulo = `Ruta ${r?.denominacion ?? p.COD_RUTA}`;
    if (sel.capa === "ruteo") {
      sub = p.RECOLEC === "RECOLECCION" ? "Tramo donde el camión recoge" : "Tramo donde el camión solo pasa";
      filas.push(["Largo del tramo", n(p.long_m, num, " m")]);
    }
    if (r) {
      filas.push(["Días", r.dias], ["Horario", horarioLindo(r.horario)], ["Toneladas al mes", n(r.t_mes)], ["Kilos por viaje", n(r.kg_viaje, num)],
        ["Kilos por instalación al mes", n(r.kg_inst_mes)], ["Vehículos distintos", n(r.vehiculos, num)], ["Instalaciones de la ruta", n(r.instalaciones_ruta, num)], ["Parte dentro de la comuna", n(r.pct_ruta_en_comuna2, dec, " %")]);
    } else nota = "Esta zona es de refuerzo: no tiene pesajes propios.";
  } else if (sel.capa === "barrios") {
    const b = barrios.find((x) => x.nombre === p.nombre);
    titulo = String(p.nombre ?? "Barrio");
    sub = "Barrio";
    filas.push(["Instalaciones", n(b?.instalaciones, num)], ["Estrato promedio", n(b?.estrato_prom)], ["Toneladas al mes (estimadas)", n(b?.t_mes_estimadas)], ["Ruta principal", b?.ruta_principal ?? "Sin dato"]);
    nota = "Las toneladas del barrio son una estimación, no un pesaje.";
  } else {
    titulo = "Cuadro de 100 × 100 m";
    filas.push(["Instalaciones", n(p.n, num)], ["Estrato promedio", n(p.estrato_prom)], ["Toneladas al mes (estimadas)", n(p.t_mes_est)]);
  }
  return (
    <div className="vidrio rounded-2xl p-4">
      {sub && <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-marca">{sub}</p>}
      <h3 className="text-lg font-bold leading-tight">{titulo}</h3>
      <dl className="mt-2 divide-y divide-nivel/50 text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-1.5"><dt className="text-tinta-suave">{k}</dt><dd className="text-right font-semibold tabular-nums">{v}</dd></div>
        ))}
      </dl>
      {nota && <p className="mt-2 text-xs text-tinta-tenue">{nota}</p>}
    </div>
  );
}

/** Barras verticales simples con etiqueta abajo y valor arriba. */
function Barras({ datos, etiquetaY, formato = (v: number) => dec(v) }: { datos: { k: string; v: number }[]; etiquetaY: string; formato?: (v: number) => string }) {
  const max = Math.max(1, ...datos.map((d) => d.v));
  const W = 560, H = 190, base = 150, ancho = W / datos.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={etiquetaY} className="w-full">
      <line x1="0" x2={W} y1={base} y2={base} stroke="rgb(var(--nivel))" />
      {datos.map((d, i) => {
        const h = (d.v / max) * 120;
        const x = i * ancho + ancho * 0.18;
        return (
          <g key={d.k}>
            <rect x={x} y={base - h} width={ancho * 0.64} height={Math.max(1, h)} rx="3" fill="rgb(var(--marca))" opacity={d.v === max ? 1 : 0.62}>
              <title>{`${d.k}: ${formato(d.v)}`}</title>
            </rect>
            {(datos.length <= 12 || i % 3 === 0) && <text x={x + ancho * 0.32} y={base + 16} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">{d.k}</text>}
            {datos.length <= 12 && d.v > 0 && <text x={x + ancho * 0.32} y={base - h - 5} textAnchor="middle" fontSize="10" fill="currentColor">{formato(d.v)}</text>}
          </g>
        );
      })}
      <text x="2" y="12" fontSize="10" fill="currentColor" opacity="0.65">{etiquetaY}</text>
    </svg>
  );
}

/** Serie diaria: línea con área; al pasar el dedo o el mouse muestra el día. */
function SerieDiaria({ serie }: { serie: { fecha: string; t: number }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const W = 720, H = 220, izq = 34, base = 190;
  const t0 = new Date(serie[0].fecha).getTime(), t1 = new Date(serie[serie.length - 1].fecha).getTime();
  const max = Math.max(...serie.map((s) => s.t));
  const X = (f: string) => izq + ((new Date(f).getTime() - t0) / (t1 - t0 || 1)) * (W - izq - 8);
  const Y = (v: number) => base - (v / max) * 160;
  const d = serie.map((s, i) => `${i ? "L" : "M"}${X(s.fecha).toFixed(1)},${Y(s.t).toFixed(1)}`).join("");
  const p = sel != null ? serie[sel] : null;
  const mover = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let mejor = 0, dist = Infinity;
    serie.forEach((s, i) => { const dd = Math.abs(X(s.fecha) - x); if (dd < dist) { dist = dd; mejor = i; } });
    setSel(mejor);
  };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Toneladas pesadas por día" className="w-full touch-pan-y" onPointerMove={mover} onPointerLeave={() => setSel(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={izq} x2={W - 8} y1={Y(max * f)} y2={Y(max * f)} stroke="rgb(var(--nivel))" strokeDasharray={f ? "3 4" : undefined} />
            <text x={izq - 4} y={Y(max * f) + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.65">{num(Math.round(max * f))}</text>
          </g>
        ))}
        <path d={`${d}L${X(serie[serie.length - 1].fecha)},${base}L${X(serie[0].fecha)},${base}Z`} fill="rgb(var(--marca))" opacity="0.14" />
        <path d={d} fill="none" stroke="rgb(var(--marca))" strokeWidth="1.4" strokeLinejoin="round" />
        {p && <circle cx={X(p.fecha)} cy={Y(p.t)} r="4" fill="rgb(var(--marca))" stroke="#fff" strokeWidth="1.5" />}
        <text x={izq} y={H - 4} fontSize="10" fill="currentColor" opacity="0.65">{fecha(serie[0].fecha)}</text>
        <text x={W - 8} y={H - 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.65">{fecha(serie[serie.length - 1].fecha)}</text>
      </svg>
      <p className="mt-1 min-h-5 text-sm tabular-nums text-tinta-suave" aria-live="polite">
        {p ? <><b className="text-tinta">{dec(p.t)} t</b> el {fecha(p.fecha)}</> : "Pasa el dedo o el mouse por la línea para ver un día."}
      </p>
    </div>
  );
}

type Orden<K extends string> = { col: K; asc: boolean };
function Th<K extends string>({ col, orden, set, children, der = true }: { col: K; orden: Orden<K>; set: (o: Orden<K>) => void; children: React.ReactNode; der?: boolean }) {
  const act = orden.col === col;
  return (
    <th scope="col" aria-sort={act ? (orden.asc ? "ascending" : "descending") : "none"} className={`px-2 py-2 font-semibold ${der ? "text-right" : "text-left"}`}>
      <button type="button" onClick={() => set({ col, asc: act ? !orden.asc : false })} className="inline-flex items-center gap-1 hover:text-marca">
        {children}
        <span aria-hidden className="text-[0.65rem] opacity-70">{act ? (orden.asc ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

function TablaBarrios({ barrios, sel, onSel }: { barrios: BarrioFila[]; sel: string | null; onSel: (b: BarrioFila) => void }) {
  const [o, setO] = useState<Orden<"nombre" | "instalaciones" | "estrato_prom" | "t_mes_estimadas" | "ruta_principal">>({ col: "t_mes_estimadas", asc: false });
  const filas = useMemo(() => {
    const f = [...barrios];
    f.sort((a, b) => {
      const x = o.col === "nombre" ? (a.nombre ?? "~") : a[o.col];
      const y = o.col === "nombre" ? (b.nombre ?? "~") : b[o.col];
      const r = typeof x === "string" ? x.localeCompare(y as string, "es") : (x as number) - (y as number);
      return o.asc ? r : -r;
    });
    return f;
  }, [barrios, o]);
  return (
    <div className="max-h-[26rem] overflow-auto rounded-xl border border-nivel/70">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="sticky top-0 bg-superficie text-xs text-tinta-suave shadow-[0_1px_0_rgb(var(--nivel))]">
          <tr>
            <Th col="nombre" orden={o} set={setO} der={false}>Barrio</Th>
            <Th col="instalaciones" orden={o} set={setO}>Instalaciones</Th>
            <Th col="estrato_prom" orden={o} set={setO}>Estrato prom.</Th>
            <Th col="t_mes_estimadas" orden={o} set={setO}>t/mes estimadas</Th>
            <Th col="ruta_principal" orden={o} set={setO} der={false}>Ruta principal</Th>
          </tr>
        </thead>
        <tbody>
          {filas.map((b) => (
            <tr key={b.cod_barrio_epm} className={`cursor-pointer border-t border-nivel/50 hover:bg-acento/10 ${sel === b.nombre ? "bg-acento/15" : ""}`} onClick={() => onSel(b)}>
              <td className="px-2 py-1.5">
                <button type="button" className="text-left font-medium hover:text-marca" onClick={() => onSel(b)}>{b.nombre ?? "Sin nombre en la capa oficial"}</button>
                <span className="block text-[0.68rem] text-tinta-tenue">Código EPM …{b.cod_barrio_epm.slice(-3)}</span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{num(b.instalaciones)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{dec(b.estrato_prom)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{dec(b.t_mes_estimadas)}</td>
              <td className="px-2 py-1.5 tabular-nums">{b.ruta_principal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaRutas({ rutas }: { rutas: Ruta[] }) {
  const [o, setO] = useState<Orden<"cod_ruta" | "t_mes" | "kg_inst_mes" | "vehiculos" | "pct_ruta_en_comuna2" | "instalaciones_comuna">>({ col: "t_mes", asc: false });
  const filas = useMemo(() => [...rutas].sort((a, b) => {
    const r = o.col === "cod_ruta" ? a.cod_ruta.localeCompare(b.cod_ruta) : a[o.col] - b[o.col];
    return o.asc ? r : -r;
  }), [rutas, o]);
  return (
    <div className="max-h-[26rem] overflow-auto rounded-xl border border-nivel/70">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="sticky top-0 bg-superficie text-xs text-tinta-suave shadow-[0_1px_0_rgb(var(--nivel))]">
          <tr>
            <Th col="cod_ruta" orden={o} set={setO} der={false}>Ruta</Th>
            <th scope="col" className="px-2 py-2 text-left font-semibold">Días y horario</th>
            <Th col="t_mes" orden={o} set={setO}>t/mes</Th>
            <Th col="kg_inst_mes" orden={o} set={setO}>kg/inst./mes</Th>
            <Th col="vehiculos" orden={o} set={setO}>Vehículos</Th>
            <Th col="instalaciones_comuna" orden={o} set={setO}>Instalaciones</Th>
            <Th col="pct_ruta_en_comuna2" orden={o} set={setO}>% en la comuna</Th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">Planeación de Emvarias</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((r) => (
            <tr key={r.cod_ruta} className="border-t border-nivel/50">
              <td className="px-2 py-1.5"><b>{r.cod_ruta}</b><span className="block text-[0.68rem] text-tinta-tenue">{r.denominacion}</span></td>
              <td className="px-2 py-1.5 text-xs">{r.dias}<span className="block text-tinta-tenue">{horarioLindo(r.horario)}</span></td>
              <td className="px-2 py-1.5 text-right tabular-nums">{dec(r.t_mes)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{dec(r.kg_inst_mes)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{num(r.vehiculos)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{num(r.instalaciones_comuna)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{dec(r.pct_ruta_en_comuna2)} %</td>
              <td className="px-2 py-1.5 text-right text-xs tabular-nums text-tinta-suave">{r.planeacion_emvarias.ton_teoric != null ? num(Math.round(r.planeacion_emvarias.ton_teoric)) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Contenido({ d }: { d: Resumen }) {
  const [modo, setModo] = useState<Modo>("barrios");
  const [variable, setVariable] = useState<Variable>("t_mes");
  const [verCalles, setVerCalles] = useState(false);
  const [sel, setSel] = useState<Seleccion | null>(null);
  const modoActual = MODOS.find((m) => m.id === modo)!;
  const k = d.kpis;
  const dias = d.por_dia_semana.map((x) => ({ k: x.dia.slice(0, 3), v: x.t_promedio }));
  const horas = d.por_hora.map((x) => ({ k: String(x.hora), v: x.t }));
  const meses = d.mensual.map((x) => ({ k: x.mes.slice(2).replace("-", "/"), v: x.t }));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi grande valor={num(k.t_mes_comuna)} texto="Toneladas al mes atribuibles a la comuna" nota="Rutas completas repartidas según sus instalaciones" />
        <Kpi valor={dec(k.kg_inst_mes)} texto="Kilos por instalación al mes" nota="Promedio de las 30 rutas" />
        <Kpi valor={num(k.rutas)} texto="Rutas que pasan por la comuna" nota={`${num(k.instalaciones)} instalaciones`} />
        <Kpi valor={`${dec(k.pct_instalaciones_bloque)} %`} texto={`Con recolección ${k.dias_predominante.toLowerCase()}`} nota={`Horario ${horarioLindo(k.horario_predominante)}`} />
        <Kpi valor={`${dec(k.km_recoleccion)} km`} texto="De calles con recolección" nota="Tramos que el camión recorre recogiendo" />
        <Kpi tono="ambar" valor={`${dec(k.km_sin_recoleccion)} km`} texto="De calles sin recolección" nota="Tramos de paso, sin recoger" />
      </div>

      <Seccion id="mapa-res" titulo="Mapa de la recolección" texto="Tres pasos: elige qué quieres ver, mira los colores y toca el mapa para ver el detalle.">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="vidrio overflow-hidden rounded-2xl">
            <div className="space-y-3 border-b border-nivel/60 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tinta-tenue"><span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-marca text-[0.7rem] text-white">1</span>Elige qué quieres ver</p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="tablist" aria-label="Vista del mapa">
                {MODOS.map((m) => (
                  <button key={m.id} type="button" role="tab" aria-selected={modo === m.id} onClick={() => { setModo(m.id); setSel(null); }}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${modo === m.id ? "border-marca bg-marca text-white shadow" : "border-nivel bg-superficie hover:bg-acento/10"}`}>
                    {m.nombre}
                  </button>
                ))}
              </div>
              <p className="rounded-lg bg-acento/10 px-3 py-2 text-sm">{modoActual.texto}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {modo === "rutas" && (
                  <label className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Pintar las rutas según</span>
                    <select value={variable} onChange={(e) => setVariable(e.target.value as Variable)} className="rounded-lg border border-nivel bg-superficie px-2 py-1.5 text-sm">
                      {VARIABLES.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                    </select>
                  </label>
                )}
                {modo !== "calles" && (
                  <label className="flex items-center gap-2"><input type="checkbox" checked={verCalles} onChange={(e) => setVerCalles(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--marca))]" />Mostrar también las calles del camión</label>
                )}
              </div>
            </div>
            <div className="h-[64vh] min-h-[24rem]">
              <MapaResiduos modo={modo} variable={variable} verCalles={verCalles} cortes={d.cortes} barrios={d.barrios} seleccion={sel} onSeleccion={setSel} />
            </div>
            <div className="border-t border-nivel/60 p-3 sm:p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-tinta-tenue"><span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-marca text-[0.7rem] text-white">2</span>Así se leen los colores</p>
              <Leyenda modo={modo} variable={variable} cortes={d.cortes} barrios={d.barrios} verCalles={verCalles} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-tinta-tenue"><span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-marca text-[0.7rem] text-white">3</span>Toca el mapa o un barrio de la tabla</p>
              <Detalle sel={sel} rutas={d.rutas} barrios={d.barrios} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Barrios de la comuna</h3>
              <TablaBarrios barrios={d.barrios} sel={sel?.capa === "barrios" ? String(sel.props.nombre) : null} onSel={(b) => { setModo("barrios"); setSel({ capa: "barrios", props: { nombre: b.nombre } }); }} />
              <p className="mt-2 text-xs text-tinta-tenue">Las toneladas por barrio son una estimación: instalaciones del barrio por los kilos que mueve cada instalación de su ruta.</p>
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion mitad id="serie-res" titulo="Toneladas pesadas por día" texto={`Pesajes de todas las rutas completas, del ${fecha(d.periodo.desde)} al ${fecha(d.periodo.hasta)}.`}>
        <div className="vidrio rounded-2xl p-4"><SerieDiaria serie={d.serie_diaria} /></div>
      </Seccion>
      <Seccion mitad id="mes-res" titulo="Toneladas por mes" texto="Total pesado cada mes (el primero y el último pueden estar incompletos).">
        <div className="vidrio rounded-2xl p-4"><Barras datos={meses} etiquetaY="Toneladas" formato={(v) => num(Math.round(v))} /></div>
      </Seccion>
      <Seccion mitad id="dia-res" titulo="Toneladas por día de la semana" texto="Promedio de lo pesado en los días que sí hubo pesaje.">
        <div className="vidrio rounded-2xl p-4"><Barras datos={dias} etiquetaY="Toneladas por día" /></div>
      </Seccion>
      <Seccion mitad id="hora-res" titulo="Pesajes por hora" texto="Es la hora en que el camión pasó por la báscula, no la hora en que recogió en la calle.">
        <div className="vidrio rounded-2xl p-4"><Barras datos={horas} etiquetaY="Toneladas pesadas" formato={(v) => num(Math.round(v))} /></div>
        <p className="mt-2 text-xs text-tinta-tenue">Pico: {hora12(d.por_hora.reduce((a, b) => (b.t > a.t ? b : a)).hora)} (medianoche).</p>
      </Seccion>

      <Seccion id="rutas-res" titulo="Las 30 rutas" texto="Ordena por la columna que quieras. La última columna es un dato de planeación de Emvarias; no se compara con las toneladas reales.">
        <TablaRutas rutas={d.rutas} />
      </Seccion>

      <Seccion id="metodo-res" titulo="Nota de método" texto="Cómo leer estas cifras y qué no dicen.">
        <div className="vidrio rounded-2xl p-5 text-sm leading-relaxed text-tinta-suave">
          <ul className="list-disc space-y-2 pl-5">
            <li><b className="text-tinta">Toneladas de la comuna.</b> Cada ruta pesa su carga completa y pasa por varias comunas. Aquí se le atribuye a la Comuna 2 la parte que le toca según qué porción de las instalaciones de la ruta queda dentro: {num(k.t_mes_comuna)} t/mes de {num(k.t_mes_rutas_completas)} t/mes de las rutas completas.</li>
            <li><b className="text-tinta">Toneladas por barrio.</b> Son una estimación: instalaciones del barrio por los kilos por instalación al mes de su ruta. No es un pesaje del barrio.</li>
            <li><b className="text-tinta">Hora.</b> Es la hora de la báscula (cuando el camión descarga), no la hora en que recogió en la calle.</li>
            <li><b className="text-tinta">Periodo.</b> Del {fecha(d.periodo.desde)} al {fecha(d.periodo.hasta)} ({dec(d.periodo.meses)} meses; {num(k.pesajes)} pesajes). Los datos se pasaron a mensual dividiendo por esos meses.</li>
            <li><b className="text-tinta">Estado de la instalación (EPM).</b> No se interpreta: el dato viene sin una definición oficial, así que no se usa para filtrar ni se muestra.</li>
            <li><b className="text-tinta">Planeación de Emvarias.</b> Las toneladas teóricas son un dato de planeación de Emvarias y no se comparan con las toneladas reales.</li>
            <li><b className="text-tinta">Nombres de barrio.</b> Cada código de barrio de EPM se cruzó con la capa oficial de barrios por ubicación (el barrio donde cae la mayoría de sus instalaciones). {k.instalaciones_otros_barrios_epm ? `Otras ${num(k.instalaciones_otros_barrios_epm)} instalaciones traen códigos de barrios de otras comunas y no se muestran en la tabla.` : ""}</li>
            <li><b className="text-tinta">Privacidad.</b> No se publican direcciones, placas ni números de ticket: las instalaciones se agrupan en cuadros de 100 m.</li>
            <li><b className="text-tinta">Fuentes.</b> Emvarias (macrorrutas, ruteo, pesajes en báscula) y EPM (instalaciones). Datos generados el {fecha(d.generado)}. Detalle en <a className="text-marca underline" href="#/fuentes">Fuentes y calidad</a>.</li>
          </ul>
        </div>
      </Seccion>
    </>
  );
}

export default function Residuos() {
  const estado = useDatos<Resumen>("residuos/residuos.json");
  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera
        icono="residuos"
        etiqueta="Servicios públicos · Aseo y residuos"
        titulo="Aseo y residuos de la Comuna 2"
        texto="Por dónde pasa el camión de la basura, qué días y a qué hora se pesa, cuántas toneladas se mueven y cuántas instalaciones atiende cada ruta."
      />
      <ConDatos estado={estado}>{(d) => <Contenido d={d} />}</ConDatos>
      <Relacionados ids={["reclamos", "mapa", "fuentes"]} />
    </div>
  );
}
