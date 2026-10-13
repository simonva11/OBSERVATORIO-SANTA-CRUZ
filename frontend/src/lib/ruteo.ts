/**
 * Ruteo peatonal en el navegador sobre la red generada por data-pipeline/red.py.
 * Algoritmo: Dijkstra con montículo binario sobre un grafo dirigido (el tiempo de subida
 * y de bajada de cada tramo es distinto por la pendiente).
 * Los tiempos son ESTIMACIONES con la velocidad de Tobler, no mediciones.
 */
import type { Feature, FeatureCollection, LineString } from "geojson";
import { cargar } from "./datos";
import { distanciaM } from "./geo";

type Tramo = [number, number, number, number, number, number, number, number, [number, number][]];

interface RedCruda {
  nodos: [number, number, number][];
  tramos: Tramo[];
  tipos: Record<string, string>;
  destinos: { tipo: string; nombre: string; n: number; lon: number; lat: number }[];
  principal: number[];
}

export const NOMBRE_TRAMO: Record<string, string> = {
  calle: "Calle",
  sendero: "Sendero o andén (OSM)",
  escalera: "Escaleras",
  peatonal: "Vía peatonal",
  puente: "Puente peatonal",
  ciclovia: "Ciclorruta",
  conector: "Conexión corta",
};

export const DESTINOS_RUTEO: { tipo: string; nombre: string; color: string }[] = [
  { tipo: "transporte_masivo", nombre: "Metro, Metrocable o Metroplús", color: "#1d4fa0" },
  { tipo: "parada_bus", nombre: "Parada de bus", color: "#4a86e0" },
  { tipo: "colegio", nombre: "Colegio", color: "#1f63a8" },
  { tipo: "salud", nombre: "Centro de salud", color: "#a8452b" },
  { tipo: "parque", nombre: "Parque o espacio público", color: "#3b82f6" },
  { tipo: "deporte", nombre: "Cancha o escenario deportivo", color: "#2a8ac8" },
  { tipo: "biblioteca", nombre: "Biblioteca", color: "#7a4e9b" },
];

const VEL_PLANO_MS = (6 * Math.exp(-3.5 * 0.05)) / 3.6; // Tobler en plano, ≈1,4 m/s

export interface Red {
  n: number;
  lon: Float64Array;
  lat: Float64Array;
  alt: Float32Array;
  // lista de adyacencia compacta: para cada nodo, sus salidas
  inicio: Int32Array;
  destinoNodo: Int32Array;
  peso: Float32Array;
  tramoId: Int32Array;
  sentido: Int8Array; // 1 = a→b, -1 = b→a
  tramos: Tramo[];
  tipos: Record<string, string>;
  destinos: RedCruda["destinos"];
  enPrincipal: Uint8Array;
  celdas: Map<string, number[]>;
}

const CELDA = 0.002; // grados (~220 m)
const llaveCelda = (lon: number, lat: number) => `${Math.floor(lon / CELDA)}:${Math.floor(lat / CELDA)}`;

let promesa: Promise<Red> | null = null;

export function cargarRed(): Promise<Red> {
  if (!promesa) {
    promesa = cargar<RedCruda>("red.json").then((r) => {
      const n = r.nodos.length;
      const lon = new Float64Array(n), lat = new Float64Array(n), alt = new Float32Array(n);
      r.nodos.forEach(([x, y, h], i) => { lon[i] = x; lat[i] = y; alt[i] = h; });
      const grado = new Int32Array(n + 1);
      for (const t of r.tramos) { grado[t[0] + 1]++; grado[t[1] + 1]++; }
      for (let i = 0; i < n; i++) grado[i + 1] += grado[i];
      const total = grado[n];
      const destinoNodo = new Int32Array(total), peso = new Float32Array(total), tramoId = new Int32Array(total), sentido = new Int8Array(total);
      const pos = grado.slice(0, n);
      r.tramos.forEach((t, e) => {
        let k = pos[t[0]]++; destinoNodo[k] = t[1]; peso[k] = t[3]; tramoId[k] = e; sentido[k] = 1;
        k = pos[t[1]]++; destinoNodo[k] = t[0]; peso[k] = t[4]; tramoId[k] = e; sentido[k] = -1;
      });
      const enPrincipal = new Uint8Array(n);
      r.principal.forEach((i) => (enPrincipal[i] = 1));
      const celdas = new Map<string, number[]>();
      for (let i = 0; i < n; i++) {
        if (!enPrincipal[i]) continue;
        const k = llaveCelda(lon[i], lat[i]);
        const l = celdas.get(k);
        if (l) l.push(i); else celdas.set(k, [i]);
      }
      return { n, lon, lat, alt, inicio: grado, destinoNodo, peso, tramoId, sentido, tramos: r.tramos, tipos: r.tipos, destinos: r.destinos, enPrincipal, celdas };
    });
    promesa.catch(() => (promesa = null));
  }
  return promesa;
}

/** Nodo de la red principal más cercano a un punto. */
export function nodoCercano(red: Red, lon: number, lat: number): { nodo: number; metros: number } | null {
  const cx = Math.floor(lon / CELDA), cy = Math.floor(lat / CELDA);
  let mejor = -1, md = Infinity;
  for (let r = 0; r <= 3 && mejor < 0; r++) {
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        for (const i of red.celdas.get(`${cx + dx}:${cy + dy}`) ?? []) {
          const d = distanciaM(lat, lon, red.lat[i], red.lon[i]);
          if (d < md) { md = d; mejor = i; }
        }
      }
  }
  return mejor < 0 ? null : { nodo: mejor, metros: md };
}

/** Dijkstra desde un nodo: tiempos (s) y tramo por el que se llegó a cada nodo. */
export function dijkstra(red: Red, origen: number) {
  const dist = new Float64Array(red.n).fill(Infinity);
  const previo = new Int32Array(red.n).fill(-1); // índice en las listas de adyacencia
  const heap: number[] = []; // pares [d, nodo] aplanados
  const subir = (i: number) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[2 * p] <= heap[2 * i]) break;
      [heap[2 * p], heap[2 * i]] = [heap[2 * i], heap[2 * p]];
      [heap[2 * p + 1], heap[2 * i + 1]] = [heap[2 * i + 1], heap[2 * p + 1]];
      i = p;
    }
  };
  const bajar = (i: number) => {
    const n = heap.length / 2;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < n && heap[2 * l] < heap[2 * m]) m = l;
      if (r < n && heap[2 * r] < heap[2 * m]) m = r;
      if (m === i) break;
      [heap[2 * m], heap[2 * i]] = [heap[2 * i], heap[2 * m]];
      [heap[2 * m + 1], heap[2 * i + 1]] = [heap[2 * i + 1], heap[2 * m + 1]];
      i = m;
    }
  };
  dist[origen] = 0;
  heap.push(0, origen);
  while (heap.length) {
    const d = heap[0], u = heap[1];
    // sacar el último par (pop devuelve primero el nodo y luego la distancia) y subirlo a la raíz
    const nodoUlt = heap.pop()!, distUlt = heap.pop()!;
    if (heap.length) { heap[0] = distUlt; heap[1] = nodoUlt; bajar(0); }
    if (d > dist[u]) continue;
    for (let k = red.inicio[u]; k < red.inicio[u + 1]; k++) {
      const v = red.destinoNodo[k];
      const nd = d + red.peso[k];
      if (nd < dist[v]) {
        dist[v] = nd;
        previo[v] = k;
        heap.push(nd, v);
        subir(heap.length / 2 - 1);
      }
    }
  }
  return { dist, previo };
}

export interface Ruta {
  segundos: number;
  metros: number;
  subida: number;
  bajada: number;
  porTipo: Record<string, number>; // metros por tipo de tramo
  geojson: Feature<LineString>;
  enganche: number; // metros caminados en línea recta hasta la red (ida + llegada)
}

/** Reconstruye la ruta desde el origen del Dijkstra hasta un nodo. */
export function rutaHasta(red: Red, res: ReturnType<typeof dijkstra>, destino: number, extraIni: [number, number], extraFin: [number, number] | null, enganche: number): Ruta | null {
  if (!isFinite(res.dist[destino])) return null;
  const pasos: number[] = [];
  let v = destino;
  while (res.previo[v] >= 0) {
    const k = res.previo[v];
    pasos.push(k);
    const e = red.tramos[red.tramoId[k]];
    v = red.sentido[k] === 1 ? e[0] : e[1];
  }
  pasos.reverse();
  const coords: [number, number][] = [extraIni];
  let metros = 0, subida = 0, bajada = 0;
  const porTipo: Record<string, number> = {};
  for (const k of pasos) {
    const e = red.tramos[red.tramoId[k]];
    const ida = red.sentido[k] === 1;
    const c = ida ? e[8] : [...e[8]].reverse();
    coords.push(...c);
    metros += e[2];
    subida += ida ? e[5] : e[6];
    bajada += ida ? e[6] : e[5];
    const tipo = red.tipos[String(e[7])] ?? "calle";
    porTipo[tipo] = (porTipo[tipo] ?? 0) + e[2];
  }
  if (extraFin) coords.push(extraFin);
  return {
    segundos: res.dist[destino] + enganche / VEL_PLANO_MS,
    metros: metros + enganche,
    subida,
    bajada,
    porTipo,
    enganche,
    geojson: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
  };
}

export interface ResultadoDestino {
  tipo: string;
  nombre: string;
  ruta: Ruta;
  lon: number;
  lat: number;
}

/** Desde un punto, el destino más cercano (por tiempo de caminata) de cada tipo. */
export function destinosCercanos(red: Red, res: ReturnType<typeof dijkstra>, origen: [number, number], engancheOrigen: number): ResultadoDestino[] {
  const salida: ResultadoDestino[] = [];
  for (const d of DESTINOS_RUTEO) {
    let mejor: RedCruda["destinos"][number] | null = null;
    let mt = Infinity;
    for (const x of red.destinos) {
      if (x.tipo !== d.tipo) continue;
      const llegada = distanciaM(x.lat, x.lon, red.lat[x.n], red.lon[x.n]);
      const t = res.dist[x.n] + llegada / VEL_PLANO_MS;
      if (t < mt) { mt = t; mejor = x; }
    }
    if (!mejor || !isFinite(mt)) continue;
    const llegada = distanciaM(mejor.lat, mejor.lon, red.lat[mejor.n], red.lon[mejor.n]);
    const ruta = rutaHasta(red, res, mejor.n, origen, [mejor.lon, mejor.lat], engancheOrigen + llegada);
    if (ruta) salida.push({ tipo: d.tipo, nombre: mejor.nombre, ruta, lon: mejor.lon, lat: mejor.lat });
  }
  return salida;
}

export function coleccion(features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}
