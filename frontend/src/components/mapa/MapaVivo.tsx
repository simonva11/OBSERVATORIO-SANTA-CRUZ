import { useEffect, useRef, useState } from "react";
import { coleccionMisDatos } from "../../lib/misdatos";
import maplibregl, {
  type ExpressionSpecification,
  type GeoJSONSource,
  type LayerSpecification,
  type Map as MapaML,
  type MapGeoJSONFeature,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, Geometry, Position } from "geojson";
import { AMENAZA, CAPAS, COLOR, GRUPOS_EQUIPAMIENTO, LINEAS_METRO, TRATAMIENTOS } from "../../lib/capas";
import { cargar } from "../../lib/datos";
import type { Coleccion, Elemento, Props } from "../../lib/tipos";
import { posicionSol } from "../../lib/sol";

export type Modo = "comuna" | "ciudad";

export interface FiltroSiniestros {
  clase: "Atropello" | "Todas";
  anio: string;
}

interface Opciones {
  modo: Modo;
  activas: Set<string>;
  vista3d: boolean;
  recorrido: boolean;
  onFinRecorrido: () => void;
  colorBarrio: Record<string, string> | null;
  filtroSiniestros: FiltroSiniestros;
  seleccion: { capa: string; elemento: Elemento } | null;
  destino: { elemento: Elemento; n: number } | null;
  reencuadre: number;
  onSeleccionar: (capa: string, elemento: Elemento) => void;
  onEstado: (capa: string, estado: "cargando" | "listo" | "error") => void;
  /** Modo "¿Cómo llego?": el clic marca puntos en vez de abrir fichas. */
  ruteoActivo?: boolean;
  onClicMapa?: (lon: number, lat: number) => void;
  rutas?: Coleccion | null; // líneas de ruta (propiedad "color", "activa")
  puntosRuta?: Coleccion | null; // origen y destinos (propiedad "rol": origen | destino)
  /** Entrega la instancia del mapa cuando está lista (controles de cámara, foto). */
  onMapa?: (m: MapaML | null) => void;
  /** Modo noche: base oscura y ventanas encendidas. */
  noche?: boolean;
  /** Hora local (decimal) que define la posición del sol y las sombras. */
  hora?: number;
  /** Opacidad de todas las capas de datos activas, de 0 a 1. */
  opacidad?: number;
}

const ESTILO_BASE = "https://tiles.openfreemap.org/styles/positron";
/** Sin conexión (y sin el estilo guardado): fondo liso. Barrios, capas y rutas se dibujan igual encima. */
const ESTILO_SIN_CONEXION: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#e9e6f4" } }],
};
/** Elige el estilo: el remoto si responde (o está guardado por el service worker) y, si no, el fondo liso. */
async function elegirEstilo(): Promise<string | StyleSpecification> {
  try {
    const r = await fetch(ESTILO_BASE, { method: "GET" });
    return r.ok ? ESTILO_BASE : ESTILO_SIN_CONEXION;
  } catch {
    return ESTILO_SIN_CONEXION;
  }
}
const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const FUENTE_NEGRITA = ["Noto Sans Bold"];
const NIEBLA = "#eceaf7";
const NIEBLA_NOCHE = "#0c0e2c";
const VERDE_HONDO = "#3d2fa8";
/** Los nombres de barrio aparecen desde este zoom (60 % del zoom máximo de 22). */
export const ZOOM_ETIQUETAS = 13.2;

// Edificios: más pisos, verde más intenso
const COLOR_PISOS: ExpressionSpecification = ["interpolate", ["linear"], ["get", "p"], 1, "#b7a9ee", 2, "#6a49d6", 3, VERDE_HONDO];
const COLOR_OSM: ExpressionSpecification = ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 3, "#b7a9ee", 6, "#6a49d6", 9, VERDE_HONDO];
const ALTURA = (barrio: string | null): ExpressionSpecification =>
  barrio ? ["+", ["*", ["get", "p"], 3], ["case", ["==", ["get", "b"], barrio], 5, 0]] : ["*", ["get", "p"], 3];

// Sombras proyectadas: copias de la huella de cada edificio corridas en sentido contrario al sol.
// Grupos por pisos (altura en m) y fracciones del largo para que la sombra no quede "despegada".
const SOMBRAS = [
  { id: "sombra-1", filtro: ["==", ["get", "p"], 1], h: 3, frac: 1 },
  { id: "sombra-2", filtro: ["==", ["get", "p"], 2], h: 6, frac: 1 },
  { id: "sombra-3a", filtro: ["==", ["get", "p"], 3], h: 9, frac: 0.5 },
  { id: "sombra-3b", filtro: ["==", ["get", "p"], 3], h: 9, frac: 1 },
  { id: "sombra-4a", filtro: [">=", ["get", "p"], 4], h: 13, frac: 0.5 },
  { id: "sombra-4b", filtro: [">=", ["get", "p"], 4], h: 13, frac: 1 },
] as const;
const PX_POR_METRO = (z: number) => (512 * 2 ** z) / (40075016.686 * Math.cos(6.3 * (Math.PI / 180)));

/** Cielo con niebla de horizonte (solo se ve con el mapa inclinado). */
const cielo = (noche: boolean) =>
  noche
    ? { "sky-color": "#060a18", "horizon-color": "#142046", "fog-color": "#0c0e2c", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.35, "atmosphere-blend": 0.4 }
    : { "sky-color": "#cfe0d6", "horizon-color": "#f8f6f1", "fog-color": "#eceaf7", "sky-horizon-blend": 0.55, "horizon-fog-blend": 0.75, "fog-ground-blend": 0.3, "atmosphere-blend": 0.5 };

/** Colores de noche para las capas del mapa base. Calles y etiquetas claras sobre un fondo azul marino profundo. */
const NOCHE = {
  fondo: "#070c1a", agua: "#0e1a36", verde: "#0a1427", suelo: "#0a1021", edificio: "#111a35",
  via: "#1c2a4d", viaMayor: "#2a3d73", limite: "#2b3b6c", texto: "#9db0e0", halo: "#070c1a",
};
function colorNoche(id: string, tipo: string): Record<string, string> | null {
  const t = id.toLowerCase();
  if (tipo === "background") return { "background-color": NOCHE.fondo };
  if (tipo === "symbol") return { "text-color": NOCHE.texto, "text-halo-color": NOCHE.halo, };
  const agua = /water|ocean|river/.test(t);
  const verde = /park|landcover|wood|grass|forest|green/.test(t);
  const edificio = /building/.test(t);
  const mayor = /motorway|trunk|primary|major/.test(t);
  const via = /road|highway|tunnel|bridge|transport|rail|path|street|aeroway/.test(t);
  const limite = /boundary/.test(t);
  const color = agua ? NOCHE.agua : verde ? NOCHE.verde : edificio ? NOCHE.edificio : mayor ? NOCHE.viaMayor : via ? NOCHE.via : limite ? NOCHE.limite : NOCHE.suelo;
  if (tipo === "fill") return edificio ? { "fill-color": color, "fill-outline-color": NOCHE.via } : { "fill-color": color };
  if (tipo === "line") return { "line-color": /casing/.test(t) ? NOCHE.fondo : color };
  return null;
}

/** Paleta de día de alto contraste: calles delineadas, etiquetas casi negras con halo blanco, agua y parques bien distintos. */
const DIA = {
  fondo: "#e9e6f4", agua: "#9cc3e8", verde: "#bfe3c6", suelo: "#e4e0f1", edificio: "#c9c1ea", edificioBorde: "#8d84bd",
  calle: "#8a90b0", calleMayor: "#ffffff", borde: "#5b6288", texto: "#14122b", halo: "#ffffff", limite: "#6b7194",
};
function colorDia(id: string, tipo: string): Record<string, string | number> | null {
  const t = id.toLowerCase();
  if (tipo === "symbol") return { "text-color": DIA.texto, "text-halo-color": DIA.halo, "text-halo-width": 2 };
  const agua = /water|ocean|river/.test(t);
  const verde = /park|landcover|wood|grass|forest|green/.test(t);
  const edificio = /building/.test(t);
  const mayor = /motorway|trunk|primary|major/.test(t);
  const via = /road|highway|tunnel|bridge|transport|rail|path|street|aeroway/.test(t);
  if (tipo === "fill") {
    if (edificio) return { "fill-color": DIA.edificio, "fill-outline-color": DIA.edificioBorde };
    if (agua) return { "fill-color": DIA.agua };
    if (verde) return { "fill-color": DIA.verde };
    if (/landuse/.test(t)) return { "fill-color": DIA.suelo };
    return null;
  }
  if (tipo === "line") {
    if (agua) return { "line-color": DIA.agua };
    if (/boundary/.test(t)) return { "line-color": DIA.limite };
    if (!via) return null;
    if (/casing/.test(t)) return { "line-color": DIA.borde };
    return { "line-color": mayor ? DIA.calleMayor : DIA.calle };
  }
  return null;
}

/** Ventanas encendidas: textura para las fachadas de noche (tres variantes para que no se vea repetido). */
function imagenVentanas(semilla: number): ImageData {
  const n = 32;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  g.fillStyle = "#101831";
  g.fillRect(0, 0, n, n);
  let s = semilla * 9301 + 49297;
  const azar = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let y = 4; y < n; y += 10)
    for (let x = 3; x < n; x += 9) {
      const prendida = azar() < 0.55;
      g.fillStyle = prendida ? (azar() < 0.3 ? "#ffe9a8" : "#ffc94d") : "#1a2448";
      g.fillRect(x, y, 4, 5);
    }
  return g.getImageData(0, 0, n, n);
}

/** Multiplica una opacidad base (número o expresión) por k. */
function escalar(base: unknown, k: number): unknown {
  if (base == null) return k;
  if (typeof base === "number") return base * k;
  if (Array.isArray(base) && base[0] === "interpolate" && JSON.stringify(base[2]) === '["zoom"]')
    return base.map((v, i) => (i > 3 && i % 2 === 0 && typeof v === "number" ? v * k : v));
  return ["*", base, k];
}
const PROPS_OPACIDAD: Record<string, string[]> = {
  fill: ["fill-opacity"],
  line: ["line-opacity"],
  circle: ["circle-opacity", "circle-stroke-opacity"],
  "fill-extrusion": ["fill-extrusion-opacity"],
  heatmap: ["heatmap-opacity"],
  symbol: ["text-opacity"],
};

/** Centro aproximado del polígono más grande (para poner el nombre del barrio). */
function centroEtiqueta(g: Geometry): [number, number] | null {
  const anillos: Position[][] = g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0]) : [];
  let mejor: [number, number] | null = null, mayor = 0;
  for (const r of anillos) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < r.length - 1; i++) {
      const f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
      a += f; cx += (r[i][0] + r[i + 1][0]) * f; cy += (r[i][1] + r[i + 1][1]) * f;
    }
    if (Math.abs(a) > mayor) { mayor = Math.abs(a); mejor = [cx / (3 * a), cy / (3 * a)]; }
  }
  return mejor;
}

// ----------------------------------------------------------------- utilidades
function cajaDe(g: Geometry | Coleccion): [number, number, number, number] {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const ver = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    } else if (Array.isArray(c)) c.forEach(ver);
  };
  if ("features" in g) g.features.forEach((f) => ver((f.geometry as { coordinates: unknown }).coordinates));
  else if ("coordinates" in g) ver(g.coordinates);
  return [x0, y0, x1, y1];
}

/** Polígono del mundo con un hueco con la forma de la comuna: lo de afuera queda difuminado. */
function mascara(comuna: Coleccion): Feature {
  const huecos: Position[][] = [];
  for (const f of comuna.features) {
    const g = f.geometry;
    if (g.type === "Polygon") huecos.push(g.coordinates[0]);
    if (g.type === "MultiPolygon") g.coordinates.forEach((p) => huecos.push(p[0]));
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], ...huecos] },
  };
}

const casar = (campo: string, colores: Record<string, string>, otro: string): ExpressionSpecification =>
  ["match", ["get", campo], ...Object.entries(colores).flat(), otro] as unknown as ExpressionSpecification;

const radio = (a: number, b: number): ExpressionSpecification => ["interpolate", ["linear"], ["zoom"], 11, a, 16, b];

type Capa = Omit<LayerSpecification, "source"> & { source?: string; metadata?: { variante?: "2d" | "3d" } };

/** Estilo de cada capa de datos en MapLibre. */
function estilos(id: string): Capa[] {
  switch (id) {
    case "lineas_transporte":
      return [
        { id: `${id}-borde`, type: "line", paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.9 }, layout: { "line-cap": "round", "line-join": "round" } },
        { id, type: "line", paint: { "line-color": casar("linea", LINEAS_METRO, COLOR.cable), "line-width": 5 }, layout: { "line-cap": "round", "line-join": "round" } },
      ];
    case "estaciones":
      return [
        { id, type: "circle", paint: { "circle-radius": radio(6, 12), "circle-color": casar("linea", LINEAS_METRO, COLOR.cable), "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } },
        {
          id: `${id}-nombre`, type: "symbol", minzoom: 12.5,
          layout: { "text-field": ["get", "nombre"], "text-font": FUENTE_NEGRITA, "text-size": 15, "text-offset": [0, 1.3], "text-anchor": "top" },
          paint: { "text-color": COLOR.tinta, "text-halo-color": "#ffffff", "text-halo-width": 2.5 },
        },
      ];
    case "paradas":
      return [{ id, type: "circle", minzoom: 13, paint: { "circle-radius": radio(2.5, 7), "circle-color": "#4f86b8", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 } }];
    case "andenes":
      return [{ id, type: "line", paint: { "line-width": radio(1.5, 5), "line-color": ["step", ["coalesce", ["get", "ancho_m"], 0], "#a8452b", 1.2, "#d39b3a", 2, "#2d6a4f"] }, layout: { "line-cap": "round" } }];
    case "escaleras_osm":
      return [{ id, type: "line", paint: { "line-width": ["case", ["==", ["get", "tipo"], "steps"], 4, 2], "line-color": ["case", ["==", ["get", "tipo"], "steps"], "#7a4e9b", "#8a7656"], "line-dasharray": [1.2, 0.8] } }];
    case "red_ciclista":
      return [{ id, type: "line", paint: { "line-width": 4, "line-color": "#16917f" }, layout: { "line-cap": "round" } }];
    case "red_peatonal_pot":
      return [{ id, type: "line", paint: { "line-width": 3, "line-color": ["case", ["==", ["get", "estado"], "Proyectado"], "#a99bd0", "#5b4a8a"], "line-opacity": 0.85 } }];
    case "rutas_bus":
      return [
        { id: `${id}-borde`, type: "line", paint: { "line-color": "#ffffff", "line-width": radio(4, 8), "line-opacity": 0.85 }, layout: { "line-cap": "round", "line-join": "round" } },
        { id, type: "line", paint: { "line-color": "#2f6fb0", "line-width": radio(2, 4.5), "line-opacity": 0.95 }, layout: { "line-cap": "round", "line-join": "round" } },
      ];
    case "sedes_educativas":
      return [{ id, type: "circle", paint: { "circle-radius": radio(4, 10), "circle-color": ["case", ["==", ["get", "sector"], "Oficial"], COLOR.cable, "#7fa6cc"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } }];
    case "equipamientos":
      return [
        { id, type: "fill", metadata: { variante: "2d" }, paint: { "fill-color": casar("grupo", GRUPOS_EQUIPAMIENTO, "#a3aba7"), "fill-opacity": 0.7, "fill-outline-color": "#ffffff" } },
        { id: `${id}-3d`, type: "fill-extrusion", metadata: { variante: "3d" }, paint: { "fill-extrusion-color": casar("grupo", GRUPOS_EQUIPAMIENTO, "#a3aba7"), "fill-extrusion-height": 16, "fill-extrusion-opacity": 0.92 } },
      ];
    case "espacio_publico":
      return [{ id, type: "fill", paint: { "fill-color": "#a79af0", "fill-opacity": 0.62, "fill-outline-color": COLOR.ladera } }];
    case "escenarios_deportivos":
      return [{ id, type: "circle", paint: { "circle-radius": radio(3.5, 9), "circle-color": COLOR.ladera, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } }];
    case "bibliotecas":
      return [{ id, type: "circle", paint: { "circle-radius": radio(6, 12), "circle-color": "#7a4e9b", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } }];
    case "espacio_publico_proyectado":
      return [
        { id, type: "fill", paint: { "fill-color": "#a8d5b9", "fill-opacity": 0.35 } },
        { id: `${id}-borde`, type: "line", paint: { "line-color": COLOR.laderaHondo, "line-width": 2.5, "line-dasharray": [2, 1.5] } },
      ];
    case "amenaza_movimiento_masa":
      return [{ id, type: "fill", paint: { "fill-color": casar("grado", AMENAZA, "#cccccc"), "fill-opacity": 0.62 } }];
    case "riesgo_no_mitigable":
      return [
        { id, type: "fill", paint: { "fill-color": COLOR.ladrillo, "fill-opacity": 0.3 } },
        { id: `${id}-borde`, type: "line", paint: { "line-color": "#7d2a18", "line-width": 2 } },
      ];
    case "siniestros_viales":
      return [
        {
          id: `${id}-calor`, type: "heatmap", maxzoom: 16.5,
          paint: {
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 11, 8, 16, 34],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 11, 0.6, 16, 1.4],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 14.5, 0.85, 16.5, 0],
            "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(255,255,255,0)", 0.2, "#f6dfb4", 0.45, "#e2a865", 0.7, "#c2643c", 1, "#7f2a17"],
          },
        },
        { id, type: "circle", minzoom: 14.5, paint: { "circle-radius": radio(3, 7), "circle-color": ["case", ["==", ["get", "clase"], "Atropello"], COLOR.ladrillo, "#8b9795"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.2, "circle-opacity": 0.85 } },
      ];
    case "tratamientos":
      return [{ id, type: "fill", paint: { "fill-color": casar("tratamiento", TRATAMIENTOS, "#bbbbbb"), "fill-opacity": 0.6, "fill-outline-color": "#ffffff" } }];
    case "instrumentos":
      return [{ id, type: "line", paint: { "line-color": "#5b4a8a", "line-width": 2.5, "line-dasharray": [1, 2] } }];
    case "jerarquia_vial_pot":
      return [{ id, type: "line", paint: { "line-color": "#5b4a8a", "line-width": ["case", ["==", ["get", "jerarquia"], "Vía arteria"], 5, 3], "line-opacity": 0.8 } }];
    case "manzanas": {
      const color: ExpressionSpecification = ["step", ["coalesce", ["get", "densidad_hab_ha"], 0], "#dbe8e0", 250, "#a8cbb6", 500, "#6fa58a", 750, "#3d7a5d", 1000, "#1f4d39"];
      return [
        { id, type: "fill", metadata: { variante: "2d" }, paint: { "fill-color": color, "fill-opacity": 0.78, "fill-outline-color": "#ffffff" } },
        { id: `${id}-3d`, type: "fill-extrusion", metadata: { variante: "3d" }, paint: { "fill-extrusion-color": color, "fill-extrusion-height": ["min", ["*", ["coalesce", ["get", "densidad_hab_ha"], 0], 0.12], 260], "fill-extrusion-opacity": 0.9 } },
      ];
    }
    case "mortalidad_vial":
      return [{ id, type: "circle", paint: { "circle-radius": radio(6, 12), "circle-color": "#7d2a18", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 } }];
    case "camaras_cctv":
      return [{ id, type: "circle", paint: { "circle-radius": radio(4.5, 9), "circle-color": "#4a5958", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } }];
    case "semaforos":
      return [{ id, type: "circle", paint: { "circle-radius": radio(5, 10), "circle-color": "#d08a1c", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 } }];
    case "eje49":
      return ([
        { id: `${id}-borde`, type: "line", paint: { "line-color": "#ffffff", "line-width": 11, "line-opacity": 0.95 }, layout: { "line-cap": "round", "line-join": "round" } },
        { id, type: "line", filter: ["!=", ["get", "estado"], "Proyectado"], paint: { "line-color": "#3d2fa8", "line-width": 6 }, layout: { "line-cap": "round", "line-join": "round" } },
        { id: `${id}-proyectado`, type: "line", filter: ["==", ["get", "estado"], "Proyectado"], paint: { "line-color": "#f5b82e", "line-width": 6, "line-dasharray": [1, 1.6] }, layout: { "line-join": "round" } },
      ] as unknown) as Capa[];
    case "pot_centralidades":
      return [
        { id, type: "fill", paint: { "fill-color": "#8a6bbf", "fill-opacity": 0.35 } },
        { id: `${id}-borde`, type: "line", paint: { "line-color": "#5b4a8a", "line-width": 2.5 } },
      ];
    case "pot_corredores_transporte":
      return [{ id, type: "line", paint: { "line-color": "#24598a", "line-width": 3.5, "line-dasharray": [2, 1.5], "line-opacity": 0.85 } }];
    case "pot_intervencion_estrategica":
      return [
        { id, type: "fill", paint: { "fill-color": "#c9b8e8", "fill-opacity": 0.28 } },
        { id: `${id}-borde`, type: "line", paint: { "line-color": "#8a6bbf", "line-width": 2.5, "line-dasharray": [3, 2] } },
      ];
    case "mis_datos":
      return ([
        { id: `${id}-area`, type: "fill", filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]], paint: { "fill-color": "#b69fd6", "fill-opacity": 0.45 } },
        { id: `${id}-borde`, type: "line", filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]], paint: { "line-color": "#7a4e9b", "line-width": 2 } },
        { id: `${id}-linea`, type: "line", filter: ["any", ["==", ["geometry-type"], "LineString"], ["==", ["geometry-type"], "MultiLineString"]], paint: { "line-color": "#7a4e9b", "line-width": 4 }, layout: { "line-cap": "round" } },
        { id, type: "circle", filter: ["any", ["==", ["geometry-type"], "Point"], ["==", ["geometry-type"], "MultiPoint"]], paint: { "circle-radius": radio(5, 11), "circle-color": "#7a4e9b", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 } },
      ] as unknown) as Capa[];
    case "oferta_inmobiliaria":
      return [{ id, type: "circle", paint: { "circle-radius": radio(6, 11), "circle-color": ["case", ["==", ["get", "operacion"], "Venta"], COLOR.ambar, "#8a7656"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 } }];
    default:
      return [];
  }
}

// Capas que responden al clic, de la más específica a la más general.
const PRIORIDAD = ["punto", "linea", "poligono"] as const;

export default function MapaVivo(o: Opciones) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaML | null>(null);
  const datos = useRef(new Map<string, Coleccion>()); // por id de fuente en el mapa
  const cajas = useRef<{ comuna?: [number, number, number, number]; ciudad?: [number, number, number, number] }>({});
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ultimo = useRef(o);
  ultimo.current = o;
  const capasBase = useRef<string[]>([]); // capas del mapa de fondo, para el modo noche
  const coloresDia = useRef(new Map<string, unknown>());
  const etiquetas = useRef<maplibregl.Marker[]>([]);
  const [barrioEncima, setBarrioEncima] = useState<string | null>(null);

  // Crear el mapa una sola vez -------------------------------------------------
  useEffect(() => {
    if (!caja.current) return;
    const crear = (estilo: string | StyleSpecification) => {
    const m = new maplibregl.Map({
      container: caja.current!,
      style: estilo,
      bounds: [-75.5633, 6.2889, -75.5442, 6.3102],
      fitBoundsOptions: { padding: 40 },
      maxPitch: 75,
      attributionControl: false,
    });
    mapa.current = m;
    (window as unknown as { __mapa?: MapaML }).__mapa = m; // para pruebas automáticas
    m.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Datos: Alcaldía de Medellín, DANE. Relieve: AWS Terrain Tiles" }), "bottom-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
    m.on("error", (e) => {
      const msg = String((e as { error?: Error }).error?.message ?? "");
      // Un mosaico que no llega (sin conexión) no es un error: el mapa sigue con lo que tiene guardado.
      if (msg.includes("style") || (msg.includes("Failed to fetch") && !m.isStyleLoaded())) setError("No se pudo cargar el mapa de fondo. Revise la conexión a internet.");
    });

    // Si la tarjeta de video del equipo no aguanta el 3D, se avisa en lugar de dejar la pantalla en blanco.
    m.on("webglcontextlost", () => setError("Este equipo no pudo dibujar la vista en 3D. Recargue la página y use la vista en plano."));

    // El contenedor puede cambiar de tamaño sin que cambie la ventana (modo Solo Mapa, paneles)
    const vigia = new ResizeObserver(() => m.resize());
    vigia.observe(caja.current!);

    m.on("load", async () => {
      capasBase.current = (m.getStyle().layers ?? []).map((l) => l.id);
      // Fondo transparente: debajo queda el degradado del contenedor
      const pintar = (capa: string, prop: string, valor: unknown) => m.getLayer(capa) && m.setPaintProperty(capa, prop, valor);
      pintar("background", "background-opacity", 0);
      pintar("water", "fill-color", "#c5d8df");
      pintar("park", "fill-color", "#d7e8d7");
      pintar("landuse_residential", "fill-color", "#ecebe6");
      pintar("landuse_residential", "fill-opacity", 0.35);
      // Contraste de día: se pinta una vez aquí; el modo noche guarda estos valores y los devuelve al volver
      for (const id of capasBase.current) {
        const capa = m.getLayer(id);
        if (!capa || id === "background" || id === "relieve" || id === "edificios-3d") continue;
        for (const [prop, valor] of Object.entries(colorDia(id, capa.type) ?? {})) m.setPaintProperty(id, prop, valor);
      }

      // Relieve: sombras siempre, montaña real en 3D
      m.addSource("dem-sombra", { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 14 });
      m.addSource("dem-terreno", { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 14 });
      m.addLayer(
        { id: "relieve", type: "hillshade", source: "dem-sombra", paint: { "hillshade-exaggeration": 0.45, "hillshade-shadow-color": "#5b6b66", "hillshade-highlight-color": "#ffffff", "hillshade-accent-color": "#7c8a84" } },
        m.getLayer("waterway") ? "waterway" : undefined,
      );
      m.addLayer(
        {
          id: "edificios-3d", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 14,
          layout: { visibility: "none" },
          paint: {
            "fill-extrusion-color": COLOR_OSM,
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 7],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.9,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        m.getLayer("waterway_line_label") ? "waterway_line_label" : undefined,
      );

      // Anclas para ordenar las capas de datos
      for (const a of ["ancla-poligonos", "ancla-lineas", "ancla-puntos", "ancla-mascara", "ancla-etiquetas", "ancla-seleccion"])
        m.addLayer({ id: a, type: "background", layout: { visibility: "none" }, paint: {} });

      try {
        const [comuna, barrios, comunas, barriosCiudad] = await Promise.all([
          cargar<Coleccion>("comuna.geojson"),
          cargar<Coleccion>("barrios.geojson"),
          cargar<Coleccion>("comunas_ciudad.geojson"),
          cargar<Coleccion>("barrios_ciudad.geojson"),
        ]);
        cajas.current.comuna = cajaDe(comuna);
        cajas.current.ciudad = cajaDe({
          type: "FeatureCollection",
          features: comunas.features.filter((f) => /^\d\d$/.test(String(f.properties?.codigo)) && Number(f.properties?.codigo) <= 16),
        });

        m.addSource("mascara", { type: "geojson", data: mascara(comuna) });
        m.addSource("comuna", { type: "geojson", data: comuna });
        m.addSource("barrios", { type: "geojson", data: barrios, promoteId: "codigo" });
        m.addSource("comunas", { type: "geojson", data: comunas, promoteId: "codigo" });
        m.addSource("barrios-ciudad", { type: "geojson", data: barriosCiudad });
        datos.current.set("barrios", barrios);
        datos.current.set("comunas", comunas);

        // Lo de afuera de la comuna queda en niebla
        m.addLayer({ id: "mascara", type: "fill", source: "mascara", paint: { "fill-color": NIEBLA, "fill-opacity": 0.78 } }, "ancla-mascara");
        m.addLayer({ id: "mascara-difuminado", type: "line", source: "comuna", paint: { "line-color": NIEBLA, "line-width": 34, "line-blur": 26, "line-opacity": 0.7 } }, "ancla-mascara");

        // Toda la ciudad
        m.addLayer({ id: "comunas-relleno", type: "fill", source: "comunas", paint: { "fill-color": ["case", ["get", "es_santa_cruz"], COLOR.ladera, ["boolean", ["feature-state", "encima"], false], "#c9dccf", "#ffffff"], "fill-opacity": ["case", ["get", "es_santa_cruz"], 0.28, 0.25] } }, "ancla-poligonos");
        m.addLayer({ id: "barrios-ciudad-borde", type: "line", source: "barrios-ciudad", minzoom: 13, paint: { "line-color": "#7d8c86", "line-width": 0.8, "line-opacity": 0.7 } }, "ancla-mascara");
        m.addLayer({ id: "comunas-borde", type: "line", source: "comunas", paint: { "line-color": ["case", ["get", "es_santa_cruz"], COLOR.tinta, "#5d6b69"], "line-width": ["case", ["get", "es_santa_cruz"], 3.5, 1.6] } }, "ancla-mascara");
        m.addLayer({
          id: "comunas-nombre", type: "symbol", source: "comunas", maxzoom: 14.5,
          layout: { "text-field": ["get", "nombre"], "text-font": FUENTE_NEGRITA, "text-size": ["case", ["get", "es_santa_cruz"], 18, 14], "text-max-width": 8 },
          paint: { "text-color": ["case", ["get", "es_santa_cruz"], COLOR.laderaHondo, COLOR.tinta], "text-halo-color": "#ffffff", "text-halo-width": 2.5 },
        }, "ancla-etiquetas");

        // Santa Cruz
        m.addLayer({ id: "barrios-relleno", type: "fill", source: "barrios", paint: { "fill-color": "#ffffff", "fill-opacity": ["case", ["boolean", ["feature-state", "encima"], false], 0.35, 0.01] } }, "ancla-poligonos");
        // Borde doble: brillo exterior de 12 px + separación clara + línea interior de 3 px
        m.addLayer({ id: "comuna-halo", type: "line", source: "comuna", paint: { "line-color": VERDE_HONDO, "line-width": 12, "line-opacity": 0.32, "line-blur": 8 } }, "ancla-mascara");
        m.addLayer({ id: "barrios-borde", type: "line", source: "barrios", paint: { "line-color": "#5a3fd0", "line-width": 1.6, "line-opacity": 0.9, "line-dasharray": [3, 2] } }, "ancla-mascara");
        m.addLayer({ id: "comuna-separador", type: "line", source: "comuna", paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.85 } }, "ancla-mascara");
        m.addLayer({ id: "comuna-borde", type: "line", source: "comuna", paint: { "line-color": VERDE_HONDO, "line-width": 3 } }, "ancla-mascara");

        // Nombres de barrio en HTML: letra Inter con halo blanco, aparecen al acercarse
        etiquetas.current = barrios.features.flatMap((f) => {
          const c = centroEtiqueta(f.geometry);
          if (!c) return [];
          // MapLibre maneja la opacidad del contenedor del marcador; el fundido va en el texto de adentro
          const el = document.createElement("div");
          const texto = document.createElement("span");
          texto.className = "etiqueta-barrio";
          texto.textContent = String(f.properties?.nombre ?? "");
          el.appendChild(texto);
          return [new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(c).addTo(m)];
        });

        // Selección
        m.addSource("seleccion", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "seleccion-linea", type: "line", source: "seleccion", paint: { "line-color": COLOR.tinta, "line-width": 4.5 } }, "ancla-seleccion");
        m.addLayer({ id: "seleccion-punto", type: "circle", source: "seleccion", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 16, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": COLOR.tinta, "circle-stroke-width": 3.5 } }, "ancla-seleccion");

        // Rutas peatonales (¿Cómo llego?)
        m.addSource("rutas", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addSource("puntos-ruta", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "rutas-borde", type: "line", source: "rutas", paint: { "line-color": "#ffffff", "line-width": ["case", ["get", "activa"], 12, 7], "line-opacity": ["case", ["get", "activa"], 0.95, 0.6] }, layout: { "line-cap": "round", "line-join": "round" } }, "ancla-seleccion");
        m.addLayer({ id: "rutas-linea", type: "line", source: "rutas", paint: { "line-color": ["get", "color"], "line-width": ["case", ["get", "activa"], 6.5, 3.5], "line-opacity": ["case", ["get", "activa"], 1, 0.55] }, layout: { "line-cap": "round", "line-join": "round" } }, "ancla-seleccion");
        m.addLayer({ id: "rutas-flechas", type: "symbol", source: "rutas", filter: ["get", "activa"], layout: { "symbol-placement": "line", "symbol-spacing": 70, "text-field": "›", "text-size": 22, "text-font": FUENTE_NEGRITA, "text-keep-upright": false }, paint: { "text-color": "#ffffff" } }, "ancla-seleccion");
        m.addLayer({ id: "puntos-ruta", type: "circle", source: "puntos-ruta", paint: { "circle-radius": ["case", ["==", ["get", "rol"], "origen"], 11, 8], "circle-color": ["case", ["==", ["get", "rol"], "origen"], COLOR.tinta, ["coalesce", ["get", "color"], COLOR.cable]], "circle-stroke-color": "#ffffff", "circle-stroke-width": 3.5 } }, "ancla-seleccion");
        m.addLayer({ id: "puntos-ruta-texto", type: "symbol", source: "puntos-ruta", layout: { "text-field": ["get", "etiqueta"], "text-font": FUENTE_NEGRITA, "text-size": 14, "text-offset": [0, 1.4], "text-anchor": "top", "text-max-width": 12 }, paint: { "text-color": COLOR.tinta, "text-halo-color": "#ffffff", "text-halo-width": 2.5 } }, "ancla-seleccion");

        // Ventanas para la noche
        [1, 2, 3].forEach((i) => m.addImage(`ventanas-${i}`, imagenVentanas(i)));

        setListo(true);
        ultimo.current.onMapa?.(m);
      } catch (e) {
        setError((e as Error).message);
      }
    });

    // Interacción: clic y paso del mouse --------------------------------------
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "popup-mapa", offset: 12 });
    const interactivas = () => {
      const ids: string[] = [];
      for (const g of PRIORIDAD)
        for (const c of CAPAS.filter((x) => x.geometria === g && ultimo.current.activas.has(x.id)))
          for (const l of estilos(c.id)) if (l.type !== "heatmap" && m.getLayer(l.id) && m.getLayoutProperty(l.id, "visibility") !== "none") ids.push(l.id);
      ids.push(ultimo.current.modo === "comuna" ? "barrios-relleno" : "comunas-relleno");
      return ids.filter((i) => m.getLayer(i));
    };
    const capaDeLayer = (layerId: string) => CAPAS.find((c) => estilos(c.id).some((l) => l.id === layerId));
    const tocar = (e: maplibregl.MapMouseEvent): MapGeoJSONFeature | undefined => {
      const ids = interactivas();
      const fs = m.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ids });
      return fs.sort((a, b) => ids.indexOf(a.layer.id) - ids.indexOf(b.layer.id))[0];
    };
    let encima: { fuente: string; id: string | number } | null = null;
    m.on("mousemove", (e) => {
      if (!m.getLayer("barrios-relleno")) return;
      if (ultimo.current.ruteoActivo) {
        m.getCanvas().style.cursor = "crosshair";
        popup.remove();
        return;
      }
      const f = tocar(e);
      m.getCanvas().style.cursor = f ? "pointer" : "";
      if (encima) m.setFeatureState({ source: encima.fuente, id: encima.id }, { encima: false });
      encima = null;
      if (!f) return popup.remove();
      const esBarrio = f.layer.id === "barrios-relleno";
      if ((esBarrio || f.layer.id === "comunas-relleno") && f.id != null) {
        encima = { fuente: esBarrio ? "barrios" : "comunas", id: f.id };
        m.setFeatureState({ source: encima.fuente, id: encima.id }, { encima: true });
      }
      setBarrioEncima(esBarrio ? String(f.properties?.codigo ?? "") : null);
      const def = capaDeLayer(f.layer.id);
      const titulo = def ? def.titulo(f.properties as Props) : String(f.properties?.nombre ?? "");
      popup.setLngLat(e.lngLat).setHTML(
        esBarrio ? `<span class="popup-tipo">Barrio</span><strong>${titulo.replace(/</g, "&lt;")}</strong>` : `<strong>${titulo.replace(/</g, "&lt;")}</strong>`,
      ).addTo(m);
    });
    m.on("mouseout", () => {
      popup.remove();
      setBarrioEncima(null);
    });

    // Nombres de barrio: visibles solo de cerca y en la vista de Santa Cruz
    const actualizarEtiquetas = () => {
      const ver = m.getZoom() >= ZOOM_ETIQUETAS && ultimo.current.modo === "comuna";
      etiquetas.current.forEach((k) => k.getElement().firstElementChild?.classList.toggle("visible", ver));
    };
    m.on("zoom", actualizarEtiquetas);
    m.on("idle", actualizarEtiquetas);
    m.on("click", (e) => {
      if (ultimo.current.ruteoActivo && ultimo.current.onClicMapa) {
        ultimo.current.onClicMapa(e.lngLat.lng, e.lngLat.lat);
        return;
      }
      const f = tocar(e);
      if (!f) return;
      if (f.layer.id === "barrios-relleno" || f.layer.id === "comunas-relleno") {
        const fuente = f.layer.id === "barrios-relleno" ? "barrios" : "comunas";
        const original = datos.current.get(fuente)?.features.find((x) => x.properties?.codigo === f.properties?.codigo);
        if (original) ultimo.current.onSeleccionar(fuente, original as Elemento);
        return;
      }
      const def = capaDeLayer(f.layer.id);
      if (!def) return;
      const col = datos.current.get(def.id);
      const original = typeof f.id === "number" && col ? col.features[f.id] : undefined;
      ultimo.current.onSeleccionar(def.id, (original ?? { type: "Feature", geometry: f.geometry, properties: f.properties }) as Elemento);
    });

    return () => {
      vigia.disconnect();
      popup.remove();
      ultimo.current.onMapa?.(null);
      m.remove();
      mapa.current = null;
    };
    };
    // El estilo remoto se pide primero: sin conexión y sin copia guardada, el mapa arranca con fondo liso.
    let cancelado = false;
    let limpiar: (() => void) | undefined;
    elegirEstilo().then((estilo) => {
      if (cancelado || !caja.current) return;
      limpiar = crear(estilo);
    });
    return () => {
      cancelado = true;
      limpiar?.();
    };
  }, []);

  // Modo: solo la comuna o toda la ciudad ---------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    const ver = (ids: string[], si: boolean) => ids.forEach((i) => m.getLayer(i) && m.setLayoutProperty(i, "visibility", si ? "visible" : "none"));
    const comuna = o.modo === "comuna";
    ver(["mascara", "mascara-difuminado", "barrios-relleno"], comuna);
    const z = m.getZoom();
    etiquetas.current.forEach((k) => k.getElement().firstElementChild?.classList.toggle("visible", comuna && z >= ZOOM_ETIQUETAS));
    ver(["comunas-relleno", "comunas-borde", "comunas-nombre", "barrios-ciudad-borde"], !comuna);
    const c = comuna ? cajas.current.comuna : cajas.current.ciudad;
    const conPanel = window.innerWidth >= 1024; // el panel de temas tapa el lado izquierdo
    const margen = { top: 90, bottom: conPanel ? 40 : 110, left: conPanel ? 290 : 30, right: conPanel ? 60 : 30 };
    if (c) m.fitBounds(c, { padding: margen, duration: 1400, pitch: o.vista3d ? 50 : 0, bearing: o.vista3d ? -15 : 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.modo, listo, o.reencuadre]);

  // Capas de datos: cargar bajo demanda y mostrar según el modo -----------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    let vivo = true;
    for (const def of CAPAS) {
      const capas = estilos(def.id);
      const activa = o.activas.has(def.id);
      if (!activa) {
        capas.forEach((l) => m.getLayer(l.id) && m.setLayoutProperty(l.id, "visibility", "none"));
        continue;
      }
      const archivo = o.modo === "ciudad" && def.archivoCiudad ? def.archivoCiudad : def.id;
      o.onEstado(def.id, "cargando");
      (def.id === "mis_datos" ? Promise.resolve(coleccionMisDatos() as Coleccion) : cargar<Coleccion>(`${archivo}.geojson`))
        .then((col) => {
          if (def.id === "mis_datos") {
            const campos = [...new Set(col.features.slice(0, 200).flatMap((f) => Object.keys(f.properties ?? {})))].filter((k) => k !== "archivo").slice(0, 7);
            def.campos = [["archivo", "Archivo"], ...campos.map((k) => [k, k] as [string, string])];
          }
          if (!vivo || !mapa.current) return;
          datos.current.set(def.id, col);
          const fuente = m.getSource(def.id) as GeoJSONSource | undefined;
          if (fuente) fuente.setData(col);
          else m.addSource(def.id, { type: "geojson", data: col, generateId: true });
          for (const l of capas) {
            if (!m.getLayer(l.id)) {
              const geo = def.id === "mis_datos" ? (l.type === "circle" ? "punto" : l.type === "line" && !String(l.id).endsWith("-borde") ? "linea" : "poligono") : def.geometria;
              const ancla = l.type === "symbol" ? "ancla-etiquetas" : geo === "punto" ? "ancla-puntos" : geo === "linea" ? "ancla-lineas" : "ancla-poligonos";
              m.addLayer({ ...l, source: def.id } as LayerSpecification, ancla);
            }
            const variante = l.metadata?.variante;
            const visible = !variante || (variante === "3d") === ultimo.current.vista3d;
            m.setLayoutProperty(l.id, "visibility", visible ? "visible" : "none");
            aplicarOpacidad(m, l, ultimo.current.opacidad ?? 1);
          }
          aplicarFiltroSiniestros(m, ultimo.current.filtroSiniestros);
          o.onEstado(def.id, "listo");
        })
        .catch(() => vivo && o.onEstado(def.id, "error"));
    }
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.activas, o.modo, listo]);

  // Maqueta 3D: en Santa Cruz, las edificaciones oficiales del catastro con su número de
  // pisos; en toda la ciudad, los edificios de OpenStreetMap.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    const oficial = o.vista3d && o.modo === "comuna";
    m.setLayoutProperty("edificios-3d", "visibility", o.vista3d && !oficial ? "visible" : "none");
    if (!oficial) {
      if (m.getLayer("edificios-comuna")) m.setLayoutProperty("edificios-comuna", "visibility", "none");
      aplicarSol(m, o.hora ?? 12, !!o.noche, false);
      return;
    }
    if (m.getLayer("edificios-comuna")) {
      m.setLayoutProperty("edificios-comuna", "visibility", "visible");
      aplicarSol(m, o.hora ?? 12, !!o.noche, true);
      return;
    }
    let vivo = true;
    o.onEstado("edificios", "cargando");
    cargar<Coleccion>("edificios.geojson")
      .then((col) => {
        if (!vivo || !mapa.current || m.getLayer("edificios-comuna")) return;
        m.addSource("edificios-comuna", { type: "geojson", data: col });
        // Sombras en el piso (debajo de los edificios)
        for (const s of SOMBRAS)
          m.addLayer(
            { id: s.id, type: "fill", source: "edificios-comuna", minzoom: 13, filter: s.filtro as unknown as ExpressionSpecification, layout: { visibility: "none" }, paint: { "fill-color": "#0f2a1b", "fill-opacity": 0.16, "fill-translate-anchor": "map" } },
            "ancla-lineas",
          );
        m.addLayer(
          {
            id: "edificios-comuna", type: "fill-extrusion", source: "edificios-comuna", minzoom: 13,
            paint: {
              // más pisos, verde más intenso: se lee la densidad de la ladera
              "fill-extrusion-color": COLOR_PISOS,
              "fill-extrusion-height": ALTURA(null),
              "fill-extrusion-opacity": 0.94,
              "fill-extrusion-vertical-gradient": true,
            },
          },
          "ancla-puntos",
        );
        aplicarSol(m, ultimo.current.hora ?? 12, !!ultimo.current.noche, ultimo.current.vista3d);
        aplicarNocheEdificios(m, !!ultimo.current.noche);
        o.onEstado("edificios", "listo");
      })
      .catch(() => vivo && o.onEstado("edificios", "error"));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.vista3d, o.modo, listo]);

  // 2D / 3D ------------------------------------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    m.setTerrain(o.vista3d ? { source: "dem-terreno", exaggeration: 1.6 } : null);
    m.setSky(cielo(!!o.noche));
    if (m.getLayer("building")) m.setLayoutProperty("building", "visibility", o.vista3d ? "none" : "visible");
    for (const def of CAPAS)
      for (const l of estilos(def.id))
        if (l.metadata?.variante && m.getLayer(l.id))
          m.setLayoutProperty(l.id, "visibility", o.activas.has(def.id) && (l.metadata.variante === "3d") === o.vista3d ? "visible" : "none");
    m.easeTo({ pitch: o.vista3d ? 50 : 0, bearing: o.vista3d ? -15 : 0, duration: 1200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.vista3d, listo]);

  // Recorrido: la cámara gira alrededor de la comuna -----------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo || !o.recorrido) return;
    let activo = true;
    const parar = () => {
      if (!activo) return;
      activo = false;
      m.stop();
      ultimo.current.onFinRecorrido();
    };
    const girar = () => {
      if (!activo) return;
      m.easeTo({ bearing: m.getBearing() + 60, duration: 6000, easing: (t) => t });
      m.once("moveend", girar);
    };
    const c = cajas.current.comuna;
    const centro: [number, number] = c ? [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2] : [-75.5538, 6.2995];
    m.flyTo({ center: centro, zoom: 15.4, pitch: 52, bearing: -30, duration: 2500, essential: true });
    m.once("moveend", girar);
    const lienzo = m.getCanvasContainer();
    lienzo.addEventListener("pointerdown", parar, { once: true });
    lienzo.addEventListener("wheel", parar, { once: true });
    return () => {
      activo = false;
      lienzo.removeEventListener("pointerdown", parar);
      lienzo.removeEventListener("wheel", parar);
      m.stop();
    };
  }, [o.recorrido, listo]);

  // Color de barrios por indicador ------------------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo || !m.getLayer("barrios-relleno")) return;
    if (o.colorBarrio && Object.keys(o.colorBarrio).length) {
      m.setPaintProperty("barrios-relleno", "fill-color", casar("codigo", o.colorBarrio, "#e5e7e3"));
      m.setPaintProperty("barrios-relleno", "fill-opacity", ["case", ["boolean", ["feature-state", "encima"], false], 0.85, 0.7]);
    } else {
      m.setPaintProperty("barrios-relleno", "fill-color", "#ffffff");
      m.setPaintProperty("barrios-relleno", "fill-opacity", ["case", ["boolean", ["feature-state", "encima"], false], 0.35, 0.01]);
    }
  }, [o.colorBarrio, listo]);

  // Barrio bajo el mouse: sus edificios suben 5 m --------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo || !m.getLayer("edificios-comuna")) return;
    m.setPaintProperty("edificios-comuna", "fill-extrusion-height", ALTURA(barrioEncima));
  }, [barrioEncima, listo]);

  // Sol, sombras y luz según la hora ---------------------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    aplicarSol(m, o.hora ?? 12, !!o.noche, o.vista3d && o.modo === "comuna");
  }, [o.hora, o.noche, o.vista3d, o.modo, listo]);

  // Día y noche ---------------------------------------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    const noche = !!o.noche;
    const aplicar = () => {
    for (const id of capasBase.current) {
      const capa = m.getLayer(id);
      if (!capa || id === "relieve" || id === "edificios-3d") continue;
      const cambios = colorNoche(id, capa.type);
      if (!cambios) continue;
      for (const [prop, valor] of Object.entries(cambios)) {
        const clave = `${id}|${prop}`;
        if (noche) {
          if (!coloresDia.current.has(clave)) coloresDia.current.set(clave, m.getPaintProperty(id, prop));
          m.setPaintProperty(id, prop, valor);
        } else if (coloresDia.current.has(clave)) m.setPaintProperty(id, prop, coloresDia.current.get(clave));
      }
    }
    if (m.getLayer("background")) m.setPaintProperty("background", "background-opacity", noche ? 1 : 0);
    const pintar = (capa: string, prop: string, valor: unknown) => m.getLayer(capa) && m.setPaintProperty(capa, prop, valor);
    pintar("mascara", "fill-color", noche ? NIEBLA_NOCHE : NIEBLA);
    pintar("mascara-difuminado", "line-color", noche ? NIEBLA_NOCHE : NIEBLA);
    pintar("relieve", "hillshade-shadow-color", noche ? "#030612" : "#5b6b66");
    pintar("relieve", "hillshade-highlight-color", noche ? "#1c2a55" : "#ffffff");
    pintar("comuna-borde", "line-color", noche ? "#b4a8ff" : VERDE_HONDO);
    pintar("comuna-halo", "line-color", noche ? "#9a86ff" : VERDE_HONDO);
    pintar("comuna-separador", "line-color", noche ? "#0c0e2c" : "#ffffff");
    // Contornos blancos de día: de noche se vuelven del color del fondo para no ensuciar el mapa
    pintar("equipamientos", "fill-outline-color", noche ? "#070c1a" : "#ffffff");
    pintar("lineas_transporte-borde", "line-color", noche ? "#070c1a" : "#ffffff");
    // Rutas y puntos: de noche brillan como neón sobre la base oscura
    pintar("rutas-borde", "line-color", noche ? ["get", "color"] : "#ffffff");
    pintar("rutas-borde", "line-blur", noche ? 6 : 0);
    pintar("rutas-borde", "line-opacity", noche ? ["case", ["get", "activa"], 0.6, 0.3] : ["case", ["get", "activa"], 0.95, 0.6]);
    pintar("puntos-ruta", "circle-stroke-color", noche ? "#070c1a" : "#ffffff");
    pintar("puntos-ruta", "circle-color", ["case", ["==", ["get", "rol"], "origen"], noche ? "#ffb347" : COLOR.tinta, ["coalesce", ["get", "color"], COLOR.cable]]);
    pintar("puntos-ruta-texto", "text-color", noche ? "#e6eaff" : COLOR.tinta);
    pintar("puntos-ruta-texto", "text-halo-color", noche ? "#070c1a" : "#ffffff");
    pintar("comunas-relleno", "fill-opacity", ["case", ["get", "es_santa_cruz"], noche ? 0.18 : 0.28, noche ? 0.06 : 0.25]);
    aplicarNocheEdificios(m, noche);
    m.setSky(cielo(noche));
    };
    aplicar();
    // Segunda pasada cuando el mapa queda quieto: así el modo noche guardado se ve igual desde la primera carga.
    m.once("idle", aplicar);
    return () => {
      m.off("idle", aplicar);
    };
  }, [o.noche, listo]);

  // Opacidad de las capas de datos ----------------------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    for (const def of CAPAS) if (o.activas.has(def.id)) for (const l of estilos(def.id)) aplicarOpacidad(m, l, o.opacidad ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.opacidad, listo]);

  // Filtro de siniestros ----------------------------------------------------------
  useEffect(() => {
    if (mapa.current && listo) aplicarFiltroSiniestros(mapa.current, o.filtroSiniestros);
  }, [o.filtroSiniestros, listo]);

  // Selección resaltada ------------------------------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    (m.getSource("seleccion") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: o.seleccion ? [o.seleccion.elemento] : [],
    });
  }, [o.seleccion, listo]);

  // Rutas del modo "¿Cómo llego?" ---------------------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    const vacio = { type: "FeatureCollection" as const, features: [] };
    (m.getSource("rutas") as GeoJSONSource | undefined)?.setData(o.rutas ?? vacio);
    (m.getSource("puntos-ruta") as GeoJSONSource | undefined)?.setData(o.puntosRuta ?? vacio);
  }, [o.rutas, o.puntosRuta, listo]);

  // Ir a un lugar (búsqueda) -------------------------------------------------------
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo || !o.destino) return;
    const g = o.destino.elemento.geometry;
    if (g.type === "Point") m.flyTo({ center: g.coordinates as [number, number], zoom: Math.max(m.getZoom(), 16.5), duration: 1200 });
    else {
      const ancho = window.innerWidth >= 1024;
      const izquierda = ancho && !ultimo.current.ruteoActivo ? 330 : 50;
      m.fitBounds(cajaDe(g), { padding: { top: 120, bottom: 60, left: izquierda, right: 60 }, maxZoom: 16.5, duration: 1200 });
    }
  }, [o.destino, listo]);

  return (
    <div className={`mapa-lienzo relative h-full w-full ${o.noche ? "es-noche" : ""}`}>
      <div ref={caja} className="h-full w-full" />
      {/* Niebla en los bordes y viñeta: el centro resalta */}
      <div aria-hidden="true" className="mapa-vineta pointer-events-none absolute inset-0" />
      {!listo && !error && (
        <div className="absolute inset-0 grid place-items-center bg-papel/70">
          <p className="rounded-full bg-superficie px-5 py-3 text-lg shadow">Preparando el mapa…</p>
        </div>
      )}
      {error && (
        <div role="alert" className="absolute inset-x-4 top-24 mx-auto max-w-md rounded-xl bg-ladrillo-claro p-4 text-lg text-ladrillo shadow">
          {error}
        </div>
      )}
    </div>
  );
}

/** Luz direccional desde el sol y sombras proyectadas de los edificios del catastro. */
function aplicarSol(m: MapaML, hora: number, noche: boolean, conEdificios: boolean) {
  const { azimut, altura } = posicionSol(new Date(), hora);
  const dia = !noche && altura > 2;
  m.setLight(
    dia
      ? { anchor: "map", position: [1.4, azimut, Math.min(88, 90 - altura)], color: altura < 15 ? "#ffe2b8" : "#ffffff", intensity: 0.42 }
      : { anchor: "map", position: [1.2, 210, 40], color: "#8fa6d6", intensity: 0.18 },
  );
  for (const s of SOMBRAS) {
    if (!m.getLayer(s.id)) continue;
    m.setLayoutProperty(s.id, "visibility", conEdificios && dia ? "visible" : "none");
    if (!dia) continue;
    // Largo = altura / tan(altura del sol), con tope para el amanecer y el atardecer
    const largo = Math.min((s.h * s.frac) / Math.tan(Math.max(altura, 8) * (Math.PI / 180)), s.h * 4);
    const ex = -Math.sin(azimut * (Math.PI / 180)) * largo; // metros hacia el oriente
    const sy = Math.cos(azimut * (Math.PI / 180)) * largo; // metros hacia el sur (y de pantalla)
    const paso = (z: number) => [ex * PX_POR_METRO(z), sy * PX_POR_METRO(z)];
    m.setPaintProperty(s.id, "fill-translate", ["interpolate", ["exponential", 2], ["zoom"], 13, ["literal", paso(13)], 20, ["literal", paso(20)]]);
    m.setPaintProperty(s.id, "fill-opacity", altura < 20 ? 0.12 : 0.16);
  }
}

/** De noche los edificios se pintan con ventanas encendidas. */
function aplicarNocheEdificios(m: MapaML, noche: boolean) {
  const patron: ExpressionSpecification = ["match", ["%", ["coalesce", ["get", "p"], ["to-number", ["coalesce", ["get", "render_height"], 3]]], 3], 0, "ventanas-1", 1, "ventanas-2", "ventanas-3"];
  for (const id of ["edificios-comuna", "edificios-3d"]) {
    if (!m.getLayer(id)) continue;
    m.setPaintProperty(id, "fill-extrusion-pattern", noche ? patron : undefined);
    m.setPaintProperty(id, "fill-extrusion-color", noche ? "#16203f" : id === "edificios-comuna" ? COLOR_PISOS : COLOR_OSM);
  }
}

function aplicarOpacidad(m: MapaML, l: Capa, k: number) {
  if (!m.getLayer(l.id)) return;
  const paint = (l as { paint?: Record<string, unknown> }).paint ?? {};
  for (const prop of PROPS_OPACIDAD[l.type] ?? []) {
    const base = paint[prop] ?? (prop === "fill-extrusion-opacity" ? 1 : undefined);
    m.setPaintProperty(l.id, prop, k === 1 ? base : escalar(base, k));
  }
}

function aplicarFiltroSiniestros(m: MapaML, f: FiltroSiniestros) {
  const partes: ExpressionSpecification[] = [];
  if (f.clase === "Atropello") partes.push(["==", ["get", "clase"], "Atropello"]);
  if (f.anio !== "Todos") partes.push(["==", ["get", "anio"], Number(f.anio)]);
  const filtro = (partes.length ? ["all", ...partes] : null) as ExpressionSpecification | null;
  for (const id of ["siniestros_viales", "siniestros_viales-calor"]) if (m.getLayer(id)) m.setFilter(id, filtro);
}

