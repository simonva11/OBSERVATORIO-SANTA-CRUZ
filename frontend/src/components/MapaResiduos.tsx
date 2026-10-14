import { useEffect, useRef, useState } from "react";
import maplibregl, { type ExpressionSpecification, type Map as MapaML, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { cargar } from "../lib/datos";
import { useNocheActiva } from "./Layout";

export type Variable = "frecuencia" | "t_mes" | "kg_inst_mes" | "vehiculos";
export type Modo = "rutas" | "calles" | "barrios" | "densidad";
export type CapaSel = "macrorutas" | "ruteo" | "celdas" | "barrios";
export interface Seleccion { capa: CapaSel; props: Record<string, unknown> }

export interface BarrioRes {
  cod_barrio_epm: string; nombre: string | null; instalaciones: number; estrato_prom: number; t_mes_estimadas: number;
  ruta_principal: string; n_rutas: number; lat: number; lon: number;
}
export interface Cortes { t_mes: number[]; kg_inst_mes: number[]; vehiculos: number[] }

/** Cinco tonos de azul, de menos a más. */
export const ESCALA = ["#dbeafe", "#93c5fd", "#4f8ff0", "#1d4ed8", "#1e3a8a"];
export const COLOR_FRECUENCIA: Record<string, string> = { WS: "#1e40af", LJ: "#38bdf8", MV: "#818cf8", APOYO: "#94a3b8" };
export const NOMBRE_FRECUENCIA: Record<string, string> = { WS: "Miércoles y sábado", LJ: "Lunes y jueves", MV: "Martes y viernes", APOYO: "Ruta de refuerzo" };
const SIN_DATO = "#cbd5e1";
const COLOR_RECOLECCION = "#f08c1a";
const COLOR_VACIO = "#64748b";

const ESTILO_BASE = "https://tiles.openfreemap.org/styles/positron";
const ESTILO_SIN_CONEXION = (noche: boolean): StyleSpecification => ({
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": noche ? "#0b1530" : "#e8f0fc" } }],
});
async function elegirEstilo(noche: boolean): Promise<string | StyleSpecification> {
  try {
    const r = await fetch(ESTILO_BASE);
    return r.ok ? ESTILO_BASE : ESTILO_SIN_CONEXION(noche);
  } catch {
    return ESTILO_SIN_CONEXION(noche);
  }
}

/** Cortes estrictamente crecientes (el `step` de MapLibre no admite repetidos). */
export function cortesValidos(c: number[]): number[] {
  return c.filter((v, i) => i === 0 || v > c[i - 1]);
}

function colorPor(variable: Variable, cortes: Cortes): ExpressionSpecification {
  if (variable === "frecuencia") {
    return ["match", ["get", "BLOQUE_FRE"], ...Object.entries(COLOR_FRECUENCIA).flat(), SIN_DATO] as unknown as ExpressionSpecification;
  }
  const cs = cortesValidos(cortes[variable]);
  const paso: unknown[] = ["step", ["get", variable], ESCALA[0]];
  cs.forEach((c, i) => paso.push(c, ESCALA[Math.min(i + 1, ESCALA.length - 1)]));
  return ["case", ["==", ["typeof", ["get", variable]], "number"], paso, SIN_DATO] as unknown as ExpressionSpecification;
}

/** Cinco grupos con igual número de barrios (cortes en 20, 40, 60 y 80 %). */
export function cortesBarrios(b: BarrioRes[]): number[] {
  const v = b.map((x) => x.t_mes_estimadas).sort((x, y) => x - y);
  if (!v.length) return [];
  return cortesValidos([0.2, 0.4, 0.6, 0.8].map((q) => Math.round(v[Math.min(v.length - 1, Math.floor(q * v.length))] * 10) / 10));
}

function escalaPor(expr: unknown[], cortes: number[]): ExpressionSpecification {
  const paso: unknown[] = ["step", expr, ESCALA[0]];
  cortes.forEach((c, i) => paso.push(c, ESCALA[Math.min(i + 1, ESCALA.length - 1)]));
  return paso as unknown as ExpressionSpecification;
}

const CAPAS_MODO: Record<Modo, string[]> = {
  rutas: ["res-macro", "res-macro-borde", "res-macro-nombre"],
  calles: ["res-macro-suave", "res-ruteo-casing", "res-ruteo-vacio", "res-ruteo"],
  barrios: ["res-barrios", "res-barrios-borde", "res-barrios-nombre"],
  densidad: ["res-celdas", "res-barrios-borde"],
};
const CAPAS_CALLES_EXTRA = ["res-ruteo-casing", "res-ruteo-vacio", "res-ruteo"];
const TODAS = [...new Set([...Object.values(CAPAS_MODO).flat(), "res-sel-macro", "res-sel-ruteo", "res-sel-barrio"])];
const CLIC: Record<string, CapaSel> = { "res-ruteo": "ruteo", "res-ruteo-vacio": "ruteo", "res-macro": "macrorutas", "res-macro-suave": "macrorutas", "res-barrios": "barrios", "res-celdas": "celdas" };

interface Props {
  modo: Modo;
  variable: Variable;
  verCalles: boolean;
  cortes: Cortes;
  barrios: BarrioRes[];
  seleccion: Seleccion | null;
  onSeleccion: (s: Seleccion | null) => void;
}

/** Mapa de la recolección con cuatro vistas: por ruta, calle por calle, por barrio y por densidad de instalaciones. */
export default function MapaResiduos({ modo, variable, verCalles, cortes, barrios, seleccion, onSeleccion }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaML | null>(null);
  const [listo, setListo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const noche = useNocheActiva();
  const ultimo = useRef({ modo, variable, verCalles, cortes, barrios, seleccion, onSeleccion });
  ultimo.current = { modo, variable, verCalles, cortes, barrios, seleccion, onSeleccion };

  const visibles = (o: { modo: Modo; verCalles: boolean }) => {
    const v = new Set(CAPAS_MODO[o.modo]);
    if (o.verCalles) CAPAS_CALLES_EXTRA.forEach((i) => v.add(i));
    return v;
  };
  const filtroSel = (m: MapaML) => {
    const sel = ultimo.current.seleccion;
    const cod = sel && (sel.capa === "macrorutas" || sel.capa === "ruteo") ? String(sel.props.COD_RUTA ?? "") : "";
    const bar = sel && sel.capa === "barrios" ? String(sel.props.nombre ?? "") : "";
    if (m.getLayer("res-sel-macro")) m.setFilter("res-sel-macro", ["==", ["get", "COD_RUTA"], cod]);
    if (m.getLayer("res-sel-ruteo")) m.setFilter("res-sel-ruteo", ["==", ["get", "COD_RUTA"], cod]);
    if (m.getLayer("res-sel-barrio")) m.setFilter("res-sel-barrio", ["==", ["get", "nombre"], bar]);
  };

  // Dibuja las capas de datos (se repite cuando el estilo base cambia, por ejemplo al pasar a modo noche)
  const dibujar = async (m: MapaML) => {
    const o = ultimo.current;
    try {
      const [comuna, macro, ruteo, celdas, ofic] = await Promise.all([
        cargar<FeatureCollection>("comuna.geojson"), cargar<FeatureCollection>("residuos/macrorutas.geojson"),
        cargar<FeatureCollection>("residuos/ruteo.geojson"), cargar<FeatureCollection>("residuos/celdas.geojson"),
        cargar<FeatureCollection>("barrios.geojson"),
      ]);
      const porNombre = new Map(o.barrios.map((b) => [b.nombre, b]));
      const poligonos: FeatureCollection = {
        type: "FeatureCollection",
        features: ofic.features.map((f) => {
          const nombre = String((f.properties as Record<string, unknown>)?.nombre ?? "");
          const b = porNombre.get(nombre);
          return { ...f, properties: { nombre, t: b ? b.t_mes_estimadas : null, instalaciones: b?.instalaciones ?? null, estrato: b?.estrato_prom ?? null, cod: b?.cod_barrio_epm ?? null, ruta_principal: b?.ruta_principal ?? null } };
        }),
      };
      const src = (id: string, data: FeatureCollection) => {
        if (!m.getSource(id)) m.addSource(id, { type: "geojson", data });
      };
      src("res-comuna", comuna); src("res-macro", macro); src("res-ruteo", ruteo); src("res-celdas", celdas); src("res-barrios", poligonos);
      const add = (l: Parameters<MapaML["addLayer"]>[0]) => {
        if (!m.getLayer(l.id)) m.addLayer(l);
      };
      const tinta = noche ? "#e8f0ff" : "#0c1d3a";
      const halo = noche ? "#0b1530" : "#ffffff";
      const pasosCelda = [1, 5, 20, 60, 150];
      add({ id: "res-celdas", type: "fill", source: "res-celdas", paint: { "fill-color": escalaPor(["coalesce", ["get", "n"], 0], pasosCelda.slice(1)), "fill-opacity": 0.82, "fill-outline-color": "rgba(255,255,255,0.4)" } });
      add({ id: "res-barrios", type: "fill", source: "res-barrios", paint: { "fill-color": ["case", ["==", ["typeof", ["get", "t"]], "number"], escalaPor(["get", "t"], cortesBarrios(o.barrios)), SIN_DATO] as unknown as ExpressionSpecification, "fill-opacity": 0.82 } });
      add({ id: "res-macro", type: "fill", source: "res-macro", paint: { "fill-color": colorPor(o.variable, o.cortes), "fill-opacity": 0.72 } });
      add({ id: "res-macro-suave", type: "fill", source: "res-macro", paint: { "fill-color": "#93c5fd", "fill-opacity": 0.14 } });
      add({ id: "res-macro-borde", type: "line", source: "res-macro", paint: { "line-color": "#ffffff", "line-width": 1.6, "line-opacity": 0.95 } });
      add({ id: "res-barrios-borde", type: "line", source: "res-barrios", paint: { "line-color": "#ffffff", "line-width": 1.6, "line-opacity": 0.9 } });
      add({ id: "res-sel-macro", type: "line", source: "res-macro", filter: ["==", ["get", "COD_RUTA"], ""], paint: { "line-color": tinta, "line-width": 3.4 } });
      add({ id: "res-sel-barrio", type: "line", source: "res-barrios", filter: ["==", ["get", "nombre"], ""], paint: { "line-color": tinta, "line-width": 3.4 } });
      add({ id: "res-comuna-borde", type: "line", source: "res-comuna", paint: { "line-color": tinta, "line-width": 2.4, "line-opacity": 0.9, "line-dasharray": [3, 1.5] } });
      const ancho: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 12, 1.8, 14, 3.4, 17, 7];
      const anchoCasing: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 12, 3.6, 14, 6, 17, 11];
      add({ id: "res-sel-ruteo", type: "line", source: "res-ruteo", filter: ["==", ["get", "COD_RUTA"], ""], layout: { "line-cap": "round" }, paint: { "line-color": tinta, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 5, 14, 9, 17, 15] as ExpressionSpecification } });
      add({ id: "res-ruteo-casing", type: "line", source: "res-ruteo", layout: { "line-cap": "round" }, paint: { "line-color": "#ffffff", "line-width": anchoCasing, "line-opacity": 0.85 } });
      add({ id: "res-ruteo-vacio", type: "line", source: "res-ruteo", filter: ["==", ["get", "RECOLEC"], "NORECOLECCION"], paint: { "line-color": COLOR_VACIO, "line-width": ancho, "line-dasharray": [1.6, 1.6] } });
      add({ id: "res-ruteo", type: "line", source: "res-ruteo", filter: ["==", ["get", "RECOLEC"], "RECOLECCION"], layout: { "line-cap": "round" }, paint: { "line-color": COLOR_RECOLECCION, "line-width": ancho } });
      add({
        id: "res-macro-nombre", type: "symbol", source: "res-macro", layout: { "text-field": ["get", "DENO_RUTA"], "text-font": ["Noto Sans Bold"], "text-size": 11 },
        paint: { "text-color": tinta, "text-halo-color": halo, "text-halo-width": 1.8 },
      });
      add({
        id: "res-barrios-nombre", type: "symbol", source: "res-barrios",
        layout: { "text-field": ["case", ["==", ["typeof", ["get", "t"]], "number"], ["concat", ["get", "nombre"], "\n", ["to-string", ["round", ["get", "t"]]], " t/mes"], ["get", "nombre"]] as unknown as ExpressionSpecification, "text-font": ["Noto Sans Bold"], "text-size": 12 },
        paint: { "text-color": tinta, "text-halo-color": halo, "text-halo-width": 2 },
      });
      if (noche) oscurecerBase(m);
      const v = visibles(o);
      TODAS.forEach((i) => m.getLayer(i) && m.setLayoutProperty(i, "visibility", v.has(i) || i.startsWith("res-sel") ? "visible" : "none"));
      filtroSel(m);
      setListo(true);
    } catch {
      setAviso("No se pudieron cargar las capas del mapa. Revise la conexión y recargue.");
    }
  };

  // Crear el mapa una vez; si cambia el tema se vuelve a poner el estilo y a dibujar las capas
  useEffect(() => {
    if (!caja.current) return;
    let vivo = true;
    let m: MapaML | null = null;
    (async () => {
      const estilo = await elegirEstilo(noche);
      if (!vivo || !caja.current) return;
      m = new maplibregl.Map({ container: caja.current, style: estilo, center: [-75.5535, 6.2955], zoom: 14.2, attributionControl: { compact: true } });
      mapa.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      m.on("style.load", () => dibujar(m!));
      m.on("click", (e) => {
        const o = ultimo.current;
        const ids = ["res-ruteo", "res-ruteo-vacio", "res-barrios", "res-celdas", "res-macro", "res-macro-suave"].filter((i) => m!.getLayer(i) && m!.getLayoutProperty(i, "visibility") === "visible");
        const f = m!.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ids })[0];
        o.onSeleccion(f ? { capa: CLIC[f.layer.id], props: f.properties as Record<string, unknown> } : null);
      });
      const cursor = (on: boolean) => () => (m!.getCanvas().style.cursor = on ? "pointer" : "");
      ["res-ruteo", "res-ruteo-vacio", "res-macro", "res-macro-suave", "res-barrios", "res-celdas"].forEach((id) => {
        m!.on("mouseenter", id, cursor(true));
        m!.on("mouseleave", id, cursor(false));
      });
    })();
    return () => {
      vivo = false;
      m?.remove();
      mapa.current = null;
      setListo(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noche]);

  // Vista elegida (y calles encima, si se pide)
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    const v = visibles({ modo, verCalles });
    TODAS.forEach((i) => m.getLayer(i) && m.setLayoutProperty(i, "visibility", v.has(i) || i.startsWith("res-sel") ? "visible" : "none"));
  }, [modo, verCalles, listo]);

  // Variable con la que se colorean las rutas
  useEffect(() => {
    const m = mapa.current;
    if (m && listo && m.getLayer("res-macro")) m.setPaintProperty("res-macro", "fill-color", colorPor(variable, cortes));
  }, [variable, cortes, listo]);

  // Resaltar lo elegido y, si es un barrio, ir hasta él
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    filtroSel(m);
    if (seleccion?.capa === "barrios") {
      const b = barrios.find((x) => x.nombre === seleccion.props.nombre);
      if (b) m.flyTo({ center: [b.lon, b.lat], zoom: 15, duration: 900 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccion, listo]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={caja} className="h-full w-full" role="region" aria-label="Mapa de rutas de recolección de basura de la Comuna 2" />
      {!listo && !aviso && <p className="absolute left-3 top-3 rounded-lg bg-superficie/90 px-3 py-1.5 text-sm shadow">Preparando el mapa…</p>}
      {aviso && <p className="absolute left-3 top-3 rounded-lg bg-aviso-fondo px-3 py-1.5 text-sm shadow">{aviso}</p>}
    </div>
  );
}

/** En modo noche se oscurecen los colores del mapa de fondo (calles, agua, etiquetas). */
function oscurecerBase(m: MapaML) {
  for (const l of m.getStyle().layers ?? []) {
    if (l.id.startsWith("res-")) continue;
    try {
      if (l.type === "background") m.setPaintProperty(l.id, "background-color", "#0b1530");
      else if (l.type === "fill") m.setPaintProperty(l.id, "fill-color", l.id.includes("water") ? "#0f2a52" : "#10203f");
      else if (l.type === "line") m.setPaintProperty(l.id, "line-color", "#22407a");
      else if (l.type === "symbol") {
        m.setPaintProperty(l.id, "text-color", "#9fb6e6");
        m.setPaintProperty(l.id, "text-halo-color", "#0b1530");
      }
    } catch {
      /* algunas capas no admiten ese color */
    }
  }
}
