import { useEffect, useRef, useState } from "react";
import maplibregl, { type ExpressionSpecification, type Map as MapaML, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { cargar } from "../lib/datos";
import { useNocheActiva } from "./Layout";

export type Variable = "frecuencia" | "t_mes" | "kg_inst_mes" | "vehiculos";
export type CapaId = "macrorutas" | "ruteo" | "celdas" | "barrios";

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

/** Texto de una fila del popup, sin interpretar HTML. */
function fila(padre: HTMLElement, etiqueta: string, valor: string) {
  const d = document.createElement("div");
  d.className = "flex justify-between gap-4";
  const a = document.createElement("span");
  a.textContent = etiqueta;
  a.style.opacity = "0.7";
  const b = document.createElement("strong");
  b.textContent = valor;
  d.append(a, b);
  padre.append(d);
}
const nf0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const aTxt = (v: unknown, f: Intl.NumberFormat, suf = "") => (typeof v === "number" ? f.format(v) + suf : "Sin dato");

function contenidoPopup(capa: string, p: Record<string, unknown>): HTMLElement {
  const cont = document.createElement("div");
  cont.style.minWidth = "13rem";
  cont.style.fontSize = "13px";
  cont.style.lineHeight = "1.5";
  const t = document.createElement("div");
  t.style.fontWeight = "700";
  t.style.fontSize = "14px";
  t.style.marginBottom = "4px";
  cont.append(t);
  if (capa === "macrorutas") {
    t.textContent = `Ruta ${p.DENO_RUTA ?? p.COD_RUTA}`;
    fila(cont, "Días", String(p.dias ?? "Sin dato"));
    fila(cont, "Horario", String(p.HORARIO_MA ?? "Sin dato").replace("PM", " p. m.").replace("AM", " a. m."));
    if (p.apoyo) {
      const n = document.createElement("div");
      n.textContent = "Ruta de refuerzo: no tiene pesajes propios.";
      n.style.marginTop = "4px";
      cont.append(n);
    } else {
      fila(cont, "Toneladas al mes", aTxt(p.t_mes, nf1));
      fila(cont, "Kg por viaje", aTxt(p.kg_viaje, nf0));
      fila(cont, "Kg por instalación al mes", aTxt(p.kg_inst_mes, nf1));
      fila(cont, "Vehículos distintos", aTxt(p.vehiculos, nf0));
      fila(cont, "Instalaciones de la ruta", aTxt(p.instalaciones_ruta, nf0));
      fila(cont, "En la Comuna 2", aTxt(p.pct_ruta_en_comuna2, nf1, " %"));
    }
  } else if (capa === "ruteo") {
    t.textContent = `Calle de la ruta ${p.COD_RUTA}`;
    fila(cont, "Tramo", p.RECOLEC === "RECOLECCION" ? "El camión recoge" : "El camión pasa sin recoger");
    fila(cont, "Largo", aTxt(p.long_m, nf0, " m"));
  } else if (capa === "celdas") {
    t.textContent = "Cuadro de 100 × 100 m";
    fila(cont, "Instalaciones", aTxt(p.n, nf0));
    fila(cont, "Estrato promedio", aTxt(p.estrato_prom, nf1));
    fila(cont, "Toneladas al mes (estimadas)", aTxt(p.t_mes_est, nf1));
  } else {
    t.textContent = String(p.nombre ?? "Barrio");
    fila(cont, "Código EPM", String(p.cod ?? ""));
    fila(cont, "Instalaciones", aTxt(p.instalaciones, nf0));
    fila(cont, "Toneladas al mes (estimadas)", aTxt(p.t, nf1));
    fila(cont, "Estrato promedio", aTxt(p.estrato, nf1));
  }
  return cont;
}

interface Props {
  variable: Variable;
  capas: Record<CapaId, boolean>;
  cortes: Cortes;
  barrios: BarrioRes[];
  seleccionBarrio: string | null;
}

/** Mapa de la recolección: macrorutas, calles del camión, instalaciones por cuadro de 100 m y un círculo por barrio. */
export default function MapaResiduos({ variable, capas, cortes, barrios, seleccionBarrio }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaML | null>(null);
  const [listo, setListo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const noche = useNocheActiva();
  const ultimo = useRef({ variable, capas, cortes, barrios });
  ultimo.current = { variable, capas, cortes, barrios };

  // Dibuja las capas de datos (se repite cuando el estilo base cambia, por ejemplo al pasar a modo noche)
  const dibujar = async (m: MapaML) => {
    const o = ultimo.current;
    try {
      const [comuna, macro, ruteo, celdas] = await Promise.all([
        cargar<FeatureCollection>("comuna.geojson"), cargar<FeatureCollection>("residuos/macrorutas.geojson"),
        cargar<FeatureCollection>("residuos/ruteo.geojson"), cargar<FeatureCollection>("residuos/celdas.geojson"),
      ]);
      const puntos: FeatureCollection = {
        type: "FeatureCollection",
        features: o.barrios.map((b): Feature<Geometry> => ({
          type: "Feature", geometry: { type: "Point", coordinates: [b.lon, b.lat] },
          properties: { nombre: b.nombre ?? "Sin nombre", cod: b.cod_barrio_epm, instalaciones: b.instalaciones, t: b.t_mes_estimadas, estrato: b.estrato_prom },
        })),
      };
      const vis = (id: CapaId) => (o.capas[id] ? "visible" : "none");
      const src = (id: string, data: FeatureCollection) => {
        if (!m.getSource(id)) m.addSource(id, { type: "geojson", data });
      };
      src("res-comuna", comuna); src("res-macro", macro); src("res-ruteo", ruteo); src("res-celdas", celdas); src("res-barrios", puntos);
      const n = ["coalesce", ["get", "n"], 0];
      const pasos = [1, 5, 20, 60, 150];
      const paso: unknown[] = ["step", n, ESCALA[0]];
      pasos.slice(1).forEach((c, i) => paso.push(c, ESCALA[i + 1]));
      const add = (l: Parameters<MapaML["addLayer"]>[0]) => {
        if (!m.getLayer(l.id)) m.addLayer(l);
      };
      add({ id: "res-celdas", type: "fill", source: "res-celdas", layout: { visibility: vis("celdas") }, paint: { "fill-color": paso as ExpressionSpecification, "fill-opacity": 0.75, "fill-outline-color": "rgba(255,255,255,0.35)" } });
      add({ id: "res-macro", type: "fill", source: "res-macro", layout: { visibility: vis("macrorutas") }, paint: { "fill-color": colorPor(o.variable, o.cortes), "fill-opacity": 0.55 } });
      add({ id: "res-macro-borde", type: "line", source: "res-macro", layout: { visibility: vis("macrorutas") }, paint: { "line-color": "#ffffff", "line-width": 1, "line-opacity": 0.8 } });
      add({ id: "res-comuna-borde", type: "line", source: "res-comuna", paint: { "line-color": "#0c1d3a", "line-width": 2.2, "line-opacity": 0.85 } });
      add({ id: "res-ruteo-vacio", type: "line", source: "res-ruteo", filter: ["==", ["get", "RECOLEC"], "NORECOLECCION"], layout: { visibility: vis("ruteo") }, paint: { "line-color": COLOR_VACIO, "line-width": 2, "line-dasharray": [2, 2] } });
      add({ id: "res-ruteo", type: "line", source: "res-ruteo", filter: ["==", ["get", "RECOLEC"], "RECOLECCION"], layout: { visibility: vis("ruteo"), "line-cap": "round" }, paint: { "line-color": COLOR_RECOLECCION, "line-width": 2.6 } });
      add({
        id: "res-barrios", type: "circle", source: "res-barrios", layout: { visibility: vis("barrios") },
        paint: {
          "circle-color": "#38bdf8", "circle-opacity": 0.42, "circle-stroke-color": "#0c4a9e", "circle-stroke-width": 2,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, ["*", ["sqrt", ["get", "t"]], 1.1], 16, ["*", ["sqrt", ["get", "t"]], 3.4]] as ExpressionSpecification,
        },
      });
      add({
        id: "res-barrios-nombre", type: "symbol", source: "res-barrios", layout: { visibility: vis("barrios"), "text-field": ["get", "nombre"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-offset": [0, 0] },
        paint: { "text-color": noche ? "#e8f0ff" : "#0c1d3a", "text-halo-color": noche ? "#0b1530" : "#ffffff", "text-halo-width": 1.6 },
      });
      if (noche) oscurecerBase(m);
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
      m = new maplibregl.Map({ container: caja.current, style: estilo, center: [-75.5535, 6.2955], zoom: 13.6, attributionControl: { compact: true } });
      mapa.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      m.on("style.load", () => dibujar(m!));
      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "20rem" });
      m.on("click", (e) => {
        const ids = ["res-barrios", "res-ruteo", "res-ruteo-vacio", "res-macro", "res-celdas"].filter((i) => m!.getLayer(i) && m!.getLayoutProperty(i, "visibility") !== "none");
        const f = m!.queryRenderedFeatures([[e.point.x - 4, e.point.y - 4], [e.point.x + 4, e.point.y + 4]], { layers: ids })[0];
        if (!f) return;
        const capa = f.layer.id === "res-barrios" ? "barrios" : f.layer.id.startsWith("res-ruteo") ? "ruteo" : f.layer.id === "res-celdas" ? "celdas" : "macrorutas";
        popup.setLngLat(e.lngLat).setDOMContent(contenidoPopup(capa, f.properties as Record<string, unknown>)).addTo(m!);
      });
      const cursor = (on: boolean) => () => (m!.getCanvas().style.cursor = on ? "pointer" : "");
      ["res-barrios", "res-ruteo", "res-macro", "res-celdas"].forEach((id) => {
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

  // Capas prendidas y apagadas
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    const poner = (ids: string[], on: boolean) => ids.forEach((i) => m.getLayer(i) && m.setLayoutProperty(i, "visibility", on ? "visible" : "none"));
    poner(["res-macro", "res-macro-borde"], capas.macrorutas);
    poner(["res-ruteo", "res-ruteo-vacio"], capas.ruteo);
    poner(["res-celdas"], capas.celdas);
    poner(["res-barrios", "res-barrios-nombre"], capas.barrios);
  }, [capas, listo]);

  // Variable con la que se colorean las macrorutas
  useEffect(() => {
    const m = mapa.current;
    if (m && listo && m.getLayer("res-macro")) m.setPaintProperty("res-macro", "fill-color", colorPor(variable, cortes));
  }, [variable, cortes, listo]);

  // Ir a un barrio elegido en la tabla
  useEffect(() => {
    const m = mapa.current;
    const b = barrios.find((x) => x.cod_barrio_epm === seleccionBarrio);
    if (m && b) m.flyTo({ center: [b.lon, b.lat], zoom: 15, duration: 900 });
  }, [seleccionBarrio, barrios]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
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
