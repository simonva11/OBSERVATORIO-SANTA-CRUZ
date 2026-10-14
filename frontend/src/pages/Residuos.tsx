import { useEffect, useMemo, useState } from "react";
import { ConDatos } from "../components/Estado";
import MapaResiduos, { COLOR_FRECUENCIA, ESCALA, NOMBRE_FRECUENCIA, cortesBarrios, cortesValidos, partesRuta } from "../components/MapaResiduos";
import type { BarrioRes, Camara, Cortes, Modo, Seleccion, Variable } from "../components/MapaResiduos";
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
  { id: "rutas", nombre: "Por ruta", texto: "Cada zona es el área que cubre una ruta del camión de Emvarias. Mientras más oscuro, más toneladas al mes (o lo que elijas abajo). En el mapa cada zona dice \"Ruta\" y su número, y los días en que pasa." },
  { id: "calles", nombre: "Calle por calle", texto: "Las calles por donde pasa el camión, tramo por tramo. Naranja: ahí recoge la basura. Gris punteado: ahí solo pasa para llegar a otra calle. Los nombres claros son los barrios, para ubicarte." },
  { id: "barrios", nombre: "Por barrio", texto: "Cada barrio pintado según las toneladas al mes que se estiman para él (más oscuro, más basura)." },
  { id: "densidad", nombre: "Instalaciones", texto: "Una instalación es un punto con servicio de aseo (vivienda, apartamento o local). Aquí se cuentan en cuadros de 100 m por 100 m: más oscuro, más instalaciones en ese cuadro, o sea más gente a la que atender." },
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

function Leyenda({ modo, variable, cortes, barrios, verCalles, km }: { modo: Modo; variable: Variable; cortes: Cortes; barrios: BarrioRes[]; verCalles: boolean; km: Resumen["kpis"] }) {
  const calles = (modo === "calles" || verCalles) && (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      <li className="flex items-center gap-1.5"><span aria-hidden className="h-1 w-7 rounded bg-[#f08c1a]" />Calle donde el camión recoge ({dec(km.km_recoleccion)} km)</li>
      <li className="flex items-center gap-1.5"><span aria-hidden className="w-7 border-t-[3px] border-dashed border-[#64748b]" />Calle donde solo pasa ({dec(km.km_sin_recoleccion)} km)</li>
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
  else if (modo === "densidad") principal = <Escala titulo="Instalaciones por cuadro de 100 m" rangos={["Menos de 90", "90 a 149", "150 a 199", "200 a 249", "250 o más"]} />;
  return <div className="space-y-2">{principal}{calles}<p className="flex items-center gap-1.5 text-xs text-tinta-suave"><span aria-hidden className="w-7 border-t-2 border-dashed border-tinta" />Línea punteada oscura: límite de la Comuna 2</p></div>;
}

function ExplicaCodigos() {
  return (
    <div className="mt-3 rounded-lg border border-nivel/70 p-3 text-xs leading-relaxed text-tinta-suave">
      <p className="font-semibold text-tinta">¿Qué significa "Z1R39WS"?</p>
      <p className="mt-1">Es el código que Emvarias le pone a cada ruta. <b>Z1</b> es la zona 1, <b>R39</b> es la ruta número 39, y <b>WS</b> son los días: <b>WS</b> miércoles y sábado, <b>LJ</b> lunes y jueves, <b>MV</b> martes y viernes. Si el código termina en <b>_A</b>, es otra parte de esa misma ruta. En el mapa lo mostramos como "Ruta 39 · Mié y sáb".</p>
    </div>
  );
}

interface PasoRec { titulo: string; texto: string; modo: Modo; variable?: Variable; ruta?: string }
const RUTA_EJEMPLO = "0113901";

function Recorrido({ paso, jugando, pasos, onIr, onJugar, onCerrar }: { paso: number; jugando: boolean; pasos: PasoRec[]; onIr: (n: number) => void; onJugar: (j: boolean) => void; onCerrar: () => void }) {
  const p = pasos[paso];
  return (
    <div className="border-b border-nivel/60 bg-marca/10 p-3 sm:p-4" role="region" aria-label="Recorrido guiado" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-marca">Paso {paso + 1} de {pasos.length}</p>
          <h3 className="text-lg font-bold leading-tight">{p.titulo}</h3>
          <p className="mt-1 text-sm leading-relaxed text-tinta-suave sm:text-[0.95rem]">{p.texto}</p>
        </div>
        <button type="button" onClick={onCerrar} className="shrink-0 rounded-lg border border-nivel bg-superficie px-2.5 py-1 text-xs font-medium hover:bg-acento/10">Cerrar</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onIr(Math.max(0, paso - 1))} disabled={paso === 0} className="rounded-lg border border-nivel bg-superficie px-3 py-1.5 text-sm font-medium disabled:opacity-40">← Anterior</button>
        <button type="button" onClick={() => onJugar(!jugando)} className="rounded-lg bg-marca px-3 py-1.5 text-sm font-semibold text-white">{jugando ? "⏸ Pausar" : "▶ Seguir solo"}</button>
        <button type="button" onClick={() => onIr(Math.min(pasos.length - 1, paso + 1))} disabled={paso === pasos.length - 1} className="rounded-lg border border-nivel bg-superficie px-3 py-1.5 text-sm font-medium disabled:opacity-40">Siguiente →</button>
        <span className="ml-auto flex gap-1.5" aria-hidden>
          {pasos.map((_, i) => <span key={i} className={`h-2 w-2 rounded-full ${i === paso ? "bg-marca" : "bg-marca/25"}`} />)}
        </span>
      </div>
    </div>
  );
}

function Palabras() {
  const items: [string, string][] = [
    ["Instalación", "Un punto con servicio de aseo registrado por EPM: una vivienda, un apartamento o un local. No es una persona ni un contenedor."],
    ["Ruta", "El recorrido que hace un camión de Emvarias en días y horas fijos. En la comuna pasan 30 rutas distintas."],
    ["Tramo de calle", "Un pedazo del recorrido del camión. Puede ser un tramo donde recoge o uno donde solo pasa."],
    ["Tonelada (t)", "1.000 kilos. Las toneladas son lo que se pesa en la báscula cuando el camión descarga."],
  ];
  return (
    <dl className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([t, x]) => (
        <div key={t} className="vidrio rounded-xl px-3.5 py-2.5">
          <dt className="text-[0.85rem] font-bold text-marca">{t}</dt>
          <dd className="mt-0.5 text-[0.8rem] leading-snug text-tinta-suave">{x}</dd>
        </div>
      ))}
    </dl>
  );
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
    const pr = partesRuta(r?.denominacion ?? p.DENO_RUTA);
    titulo = pr ? `Ruta ${pr.numero}${pr.adicional ? " (otra parte)" : ""}` : `Ruta ${r?.denominacion ?? p.COD_RUTA}`;
    filas.push(["Código de Emvarias", String(r?.denominacion ?? p.DENO_RUTA ?? p.COD_RUTA)]);
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
      {sub && <p className="text-xs font-semibold text-marca">{sub}</p>}
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

/** Eje con números redondos: 0, 50, 100, 150... */
function ejeY(max: number) {
  const mag = 10 ** Math.floor(Math.log10(max / 4));
  const paso = ([1, 2, 5, 10].map((p) => p * mag).find((p) => max / p <= 5)) ?? mag;
  const top = Math.ceil(max / paso) * paso;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += paso) ticks.push(v);
  return { top, ticks };
}

function Conclusion({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[1.05rem] font-semibold leading-snug text-tinta">{children}</p>;
}

/** Barras con ejes, líneas de guía y las barras importantes resaltadas. */
function BarrasV({ datos, unidad, fmt = (v: number) => num(Math.round(v)), marcar, saltoX = 1 }: { datos: { k: string; v: number }[]; unidad: string; fmt?: (v: number) => string; marcar?: (i: number) => boolean; saltoX?: number }) {
  const W = 640, H = 260, iz = 46, de = 8, ar = 22, ab = 34;
  const max = Math.max(1, ...datos.map((d) => d.v));
  const { top, ticks } = ejeY(max);
  const bw = (W - iz - de) / datos.length;
  const Y = (v: number) => H - ab - (v / top) * (H - ab - ar);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={unidad} className="w-full">
      <text x={2} y={12} fontSize="11" fill="currentColor" opacity="0.6">{unidad}</text>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={iz} x2={W - de} y1={Y(t)} y2={Y(t)} stroke="rgb(var(--nivel))" strokeDasharray={t ? "2 5" : undefined} />
          <text x={iz - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.65">{num(t)}</text>
        </g>
      ))}
      {datos.map((d, i) => {
        const fuerte = marcar ? marcar(i) : false;
        const x = iz + i * bw + bw * 0.14, w = bw * 0.72;
        return (
          <g key={d.k + i}>
            <rect x={x} y={Y(d.v)} width={w} height={Math.max(1.5, H - ab - Y(d.v))} rx={Math.min(5, w / 3)} fill="rgb(var(--marca))" opacity={fuerte ? 1 : 0.38}>
              <title>{`${d.k}: ${fmt(d.v)} ${unidad}`}</title>
            </rect>
            {(fuerte || datos.length <= 8) && d.v > 0 && <text x={x + w / 2} y={Y(d.v) - 6} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="currentColor">{fmt(d.v)}</text>}
            {i % saltoX === 0 && <text x={x + w / 2} y={H - ab + 17} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.75">{d.k}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Línea suave con área: al pasar el dedo o el mouse muestra el valor de esa semana. */
function LineaSemanal({ puntos }: { puntos: { f: string; v: number }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const W = 640, H = 260, iz = 46, de = 10, ar = 22, ab = 34;
  const t0 = new Date(puntos[0].f).getTime(), t1 = new Date(puntos[puntos.length - 1].f).getTime();
  const max = Math.max(...puntos.map((p) => p.v));
  const { top, ticks } = ejeY(max);
  const X = (f: string) => iz + ((new Date(f).getTime() - t0) / (t1 - t0 || 1)) * (W - iz - de);
  const Y = (v: number) => H - ab - (v / top) * (H - ab - ar);
  const d = puntos.map((p, i) => `${i ? "L" : "M"}${X(p.f).toFixed(1)},${Y(p.v).toFixed(1)}`).join("");
  const mover = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let mejor = 0, dist = Infinity;
    puntos.forEach((p, i) => { const dd = Math.abs(X(p.f) - x); if (dd < dist) { dist = dd; mejor = i; } });
    setSel(mejor);
  };
  const meses = puntos.filter((_, i) => i % 13 === 0);
  const p = sel != null ? puntos[sel] : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Toneladas pesadas por semana" className="w-full touch-pan-y" onPointerMove={mover} onPointerLeave={() => setSel(null)}>
        <text x={2} y={12} fontSize="11" fill="currentColor" opacity="0.6">toneladas</text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={iz} x2={W - de} y1={Y(t)} y2={Y(t)} stroke="rgb(var(--nivel))" strokeDasharray={t ? "2 5" : undefined} />
            <text x={iz - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.65">{num(t)}</text>
          </g>
        ))}
        <path d={`${d}L${X(puntos[puntos.length - 1].f)},${Y(0)}L${X(puntos[0].f)},${Y(0)}Z`} fill="rgb(var(--marca))" opacity="0.16" />
        <path d={d} fill="none" stroke="rgb(var(--marca))" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {meses.map((m) => <text key={m.f} x={X(m.f)} y={H - ab + 17} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.75">{new Date(m.f).toLocaleDateString("es-CO", { month: "short", year: "2-digit" })}</text>)}
        {p && <><line x1={X(p.f)} x2={X(p.f)} y1={ar} y2={Y(0)} stroke="rgb(var(--marca))" opacity="0.4" /><circle cx={X(p.f)} cy={Y(p.v)} r="5" fill="rgb(var(--marca))" stroke="#fff" strokeWidth="2" /></>}
      </svg>
      <p className="mt-1 min-h-5 text-sm tabular-nums text-tinta-suave" aria-live="polite">
        {p ? <>Semana del {fecha(p.f)}: <b className="text-tinta">{dec(p.v)} t</b></> : "Pasa el dedo o el mouse por la línea para ver cada semana."}
      </p>
    </div>
  );
}

/** Suma el pesaje diario por semana (de lunes a domingo). */
function porSemana(serie: { fecha: string; t: number }[]) {
  const m = new Map<string, number>();
  for (const s of serie) {
    const dt = new Date(`${s.fecha}T12:00:00`);
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const k = dt.toISOString().slice(0, 10);
    m.set(k, (m.get(k) ?? 0) + s.t);
  }
  return [...m.entries()].sort().map(([f, v]) => ({ f, v }));
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
  const k = d.kpis;
  const modoActual = MODOS.find((m) => m.id === modo)!;
  const [paso, setPaso] = useState<number | null>(null);
  const [jugando, setJugando] = useState(false);
  const [camara, setCamara] = useState<Camara | null>(null);
  const ej = d.rutas.find((r) => r.cod_ruta === RUTA_EJEMPLO);
  const pasos: PasoRec[] = [
    { titulo: "Esta es la Comuna 2", texto: `Emvarias recoge la basura de todo Medellín. Aquí se ve solo nuestra comuna, con sus 11 barrios y ${num(k.instalaciones)} instalaciones (viviendas, apartamentos y locales con servicio de aseo).`, modo: "barrios" },
    { titulo: "Se divide en rutas", texto: `Emvarias reparte el territorio en ${k.rutas} rutas. Cada una es un recorrido de camión con días y horario fijos. Cada color es un grupo de días: miércoles y sábado, lunes y jueves, o martes y viernes.`, modo: "rutas", variable: "frecuencia" },
    { titulo: "Miremos una: la Ruta 39", texto: ej ? `Pasa los ${ej.dias.toLowerCase()}, de ${horarioLindo(ej.horario)} Atiende ${num(ej.instalaciones_ruta)} instalaciones. Todo lo demás se apaga para que veas solo su zona.` : "Veamos una ruta.", modo: "rutas", variable: "frecuencia", ruta: RUTA_EJEMPLO },
    { titulo: "Por dónde pasa el camión", texto: "Estas son las calles de la Ruta 39. En naranja el camión recoge la basura; en gris punteado solo pasa para llegar a otra calle.", modo: "calles", ruta: RUTA_EJEMPLO },
    { titulo: "A quién atiende", texto: "Cada cuadrito es de 100 m por 100 m. Más oscuro, más instalaciones: ahí vive y trabaja más gente, así que sale más basura.", modo: "densidad", ruta: RUTA_EJEMPLO },
    { titulo: "Del camión a la báscula", texto: ej ? `Cuando el camión se llena, va a descargar y lo pesan. La Ruta 39 mueve unas ${dec(ej.t_mes)} toneladas al mes, con ${num(ej.kg_viaje)} kilos por viaje y ${num(ej.vehiculos)} camiones distintos.` : "El camión descarga y lo pesan.", modo: "rutas", variable: "t_mes", ruta: RUTA_EJEMPLO },
    { titulo: "Sumando todo", texto: `Las ${k.rutas} rutas juntas dejan unas ${num(k.t_mes_comuna)} toneladas al mes que le tocan a la comuna. Para cada barrio es una estimación según cuántas instalaciones tiene.`, modo: "barrios" },
  ];
  const irA = (n: number) => {
    const st = pasos[n];
    setPaso(n); setModo(st.modo); if (st.variable) setVariable(st.variable);
    setSel(st.ruta ? { capa: "macrorutas", props: { COD_RUTA: st.ruta, DENO_RUTA: ej?.denominacion } } : null);
    setCamara({ ruta: st.ruta, n: Date.now() });
  };
  useEffect(() => {
    if (!jugando || paso == null) return;
    const t = setTimeout(() => { if (paso >= pasos.length - 1) setJugando(false); else irA(paso + 1); }, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jugando, paso]);
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const dias = d.por_dia_semana.map((x) => ({ k: x.dia.slice(0, 3), v: x.t_promedio }));
  const horas = d.por_hora.map((x) => ({ k: hora12(x.hora).replace(" a. m.", " am").replace(" p. m.", " pm"), v: x.t }));
  const meses = d.mensual.map((x) => ({ k: `${MES[Number(x.mes.slice(5)) - 1]} ${x.mes.slice(2, 4)}`, v: x.t }));
  const semanas = useMemo(() => porSemana(d.serie_diaria), [d.serie_diaria]);
  const semCompletas = semanas.slice(1, -1);
  const semMedia = semCompletas.reduce((a, x) => a + x.v, 0) / Math.max(1, semCompletas.length);
  const mesesCompletos = d.mensual.slice(0, -1);
  const mesMedia = mesesCompletos.reduce((a, x) => a + x.t, 0) / Math.max(1, mesesCompletos.length);
  const mesMax = d.mensual.reduce((im, x, i, arr) => (x.t > arr[im].t ? i : im), 0);
  const totDia = d.por_dia_semana.reduce((a, x) => a + x.t_total, 0);
  const pctMS = (100 * d.por_dia_semana.filter((x) => x.dia === "Miércoles" || x.dia === "Sábado").reduce((a, x) => a + x.t_total, 0)) / Math.max(1, totDia);
  const totHora = d.por_hora.reduce((a, x) => a + x.t, 0);
  const pctNoche = (100 * d.por_hora.filter((x) => x.hora >= 22 || x.hora <= 3).reduce((a, x) => a + x.t, 0)) / Math.max(1, totHora);
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

      <Seccion id="palabras-res" titulo="Antes de mirar: palabras que se usan aquí">
        <Palabras />
      </Seccion>

      <Seccion id="mapa-res" titulo="Mapa de la recolección" texto="Tres pasos: elige qué quieres ver, mira los colores y toca el mapa para ver el detalle.">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="vidrio overflow-hidden rounded-2xl">
            {paso == null ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-nivel/60 bg-marca/10 p-3 sm:p-4">
                <p className="text-sm"><b>¿No sabes cómo leerlo?</b> Mira un recorrido de un minuto que explica cómo funcionan las rutas.</p>
                <button type="button" onClick={() => { setJugando(true); irA(0); document.getElementById("mapa-res")?.scrollIntoView({ behavior: "smooth" }); }} className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110">▶ Ver cómo funciona</button>
              </div>
            ) : (
              <Recorrido paso={paso} jugando={jugando} pasos={pasos} onIr={(n) => { setJugando(false); irA(n); }} onJugar={setJugando} onCerrar={() => { setPaso(null); setJugando(false); setCamara({ n: Date.now() }); setSel(null); }} />
            )}
            {paso == null && (
            <div className="space-y-3 border-b border-nivel/60 p-3 sm:p-4">
              <p className="text-xs font-semibold text-tinta-suave"><span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-marca text-[0.7rem] text-white">1</span>Elige qué quieres ver</p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="tablist" aria-label="Vista del mapa">
                {MODOS.map((m) => (
                  <button key={m.id} type="button" role="tab" aria-selected={modo === m.id} onClick={() => { setModo(m.id); setSel(null); setPaso(null); setJugando(false); }}
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
            )}
            <div className="h-[64vh] min-h-[24rem]">
              <MapaResiduos modo={modo} variable={variable} verCalles={verCalles} cortes={d.cortes} barrios={d.barrios} seleccion={sel} onSeleccion={setSel} camara={camara} />
            </div>
            <div className="border-t border-nivel/60 p-3 sm:p-4">
              <p className="mb-2 text-xs font-semibold text-tinta-suave"><span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-marca text-[0.7rem] text-white">2</span>Así se leen los colores</p>
              <Leyenda modo={modo} variable={variable} cortes={d.cortes} barrios={d.barrios} verCalles={verCalles} km={d.kpis} />
              {modo === "rutas" && <ExplicaCodigos />}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-tinta-suave"><span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-marca text-[0.7rem] text-white">3</span>Toca el mapa o un barrio de la tabla</p>
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

      <Seccion mitad id="serie-res" titulo="¿Cuánto se pesa cada semana?" texto={`Pesajes de todas las rutas completas, del ${fecha(d.periodo.desde)} al ${fecha(d.periodo.hasta)}.`}>
        <div className="vidrio rounded-2xl p-4 sm:p-5">
          <Conclusion>Cada semana llegan a la báscula cerca de {num(Math.round(semMedia))} toneladas, y casi no cambia durante el año.</Conclusion>
          <LineaSemanal puntos={semCompletas} />
          <p className="mt-1 text-xs text-tinta-tenue">No se muestran la primera ni la última semana porque están incompletas.</p>
        </div>
      </Seccion>
      <Seccion mitad id="mes-res" titulo="¿Y cada mes?" texto="Total pesado cada mes (el último mes está incompleto).">
        <div className="vidrio rounded-2xl p-4 sm:p-5">
          <Conclusion>Un mes normal pesa unas {num(Math.round(mesMedia))} toneladas. El más alto fue {meses[mesMax].k} ({num(Math.round(meses[mesMax].v))} t).</Conclusion>
          <BarrasV datos={meses} unidad="toneladas" marcar={(i) => i === mesMax} saltoX={2} />
        </div>
      </Seccion>
      <Seccion mitad id="dia-res" titulo="¿Qué días se pesa más?" texto="Promedio de toneladas pesadas en cada día de la semana.">
        <div className="vidrio rounded-2xl p-4 sm:p-5">
          <Conclusion>El {dec(pctMS)} % de lo que se pesa llega los miércoles y los sábados, que son los días de las rutas grandes.</Conclusion>
          <BarrasV datos={dias} unidad="toneladas por día" fmt={(v) => dec(v)} marcar={(i) => d.por_dia_semana[i].dia === "Miércoles" || d.por_dia_semana[i].dia === "Sábado"} />
        </div>
      </Seccion>
      <Seccion mitad id="hora-res" titulo="¿A qué hora llega el camión a la báscula?" texto="Es la hora del pesaje (cuando el camión descarga), no la hora en que recogió en la calle.">
        <div className="vidrio rounded-2xl p-4 sm:p-5">
          <Conclusion>El {dec(pctNoche)} % se pesa entre las 10 p. m. y las 3 a. m.: los camiones salen por la tarde y descargan de madrugada.</Conclusion>
          <BarrasV datos={horas} unidad="toneladas" marcar={(i) => d.por_hora[i].hora >= 22 || d.por_hora[i].hora <= 3} saltoX={3} />
        </div>
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
