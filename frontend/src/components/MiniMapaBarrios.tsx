import { useMemo } from "react";
import { useDatos } from "../lib/datos";

type Anillo = number[][];
type Geom = { type: "Polygon"; coordinates: Anillo[] } | { type: "MultiPolygon"; coordinates: Anillo[][] };
type Barrios = { features: { geometry: Geom; properties: { nombre: string } }[] };

const sin = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ANCHO = 360;
const ALTO = 440;

/**
 * Mapa sencillo de los barrios de la comuna, pintado según un valor por barrio (más oscuro = más).
 * No usa el mapa de fondo: sirve sin conexión y carga al instante. Cada barrio se puede elegir con el mouse o el teclado.
 */
export default function MiniMapaBarrios({
  valores, unidad, seleccionado, onElegir, formato = (v) => String(v),
}: {
  valores: Record<string, number>;
  unidad: string;
  seleccionado?: string;
  onElegir?: (nombre: string) => void;
  formato?: (v: number) => string;
}) {
  const geo = useDatos<Barrios>("barrios.geojson");

  const dibujo = useMemo(() => {
    if (geo.estado !== "listo") return null;
    const anillos = (g: Geom) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
    const todos = geo.datos.features.flatMap((f) => anillos(f.geometry).flatMap((p) => p[0]));
    const lat0 = todos.reduce((s, c) => s + c[1], 0) / todos.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xs = todos.map((c) => c[0] * k), ys = todos.map((c) => -c[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const escala = Math.min((ANCHO - 16) / (maxX - minX), (ALTO - 16) / (maxY - minY));
    const dx = (ANCHO - (maxX - minX) * escala) / 2, dy = (ALTO - (maxY - minY) * escala) / 2;
    const p = (c: number[]) => [dx + (c[0] * k - minX) * escala, dy + (-c[1] - minY) * escala] as const;
    return geo.datos.features.map((f) => {
      const partes = anillos(f.geometry);
      const d = partes.map((poly) => poly.map((anillo) => "M" + anillo.map((c) => p(c).map((n) => n.toFixed(1)).join(",")).join("L") + "Z").join("")).join("");
      const grande = partes.reduce((a, b) => (b[0].length > a[0].length ? b : a));
      const ctr = grande[0].reduce((s, c) => [s[0] + c[0] / grande[0].length, s[1] + c[1] / grande[0].length], [0, 0]);
      const [cx, cy] = p(ctr);
      return { nombre: f.properties.nombre, d, cx, cy };
    });
  }, [geo]);

  const porNombre = useMemo(() => new Map(Object.entries(valores).map(([n, v]) => [sin(n), v])), [valores]);
  const max = Math.max(0, ...Object.values(valores));

  if (!dibujo) return <div className="grid h-72 place-items-center rounded-xl border border-nivel/70 text-sm text-tinta-suave">Cargando el mapa…</div>;

  // Cinco tonos del azul de la marca; sin valor, un gris suave. El color nunca es el único dato: cada barrio trae su cifra.
  const tono = (v: number | undefined) => (v == null || max === 0 || v === 0 ? "rgb(var(--nivel) / 0.45)" : `rgb(var(--marca) / ${0.16 + 0.74 * Math.ceil((v / max) * 5) / 5})`);

  return (
    <figure>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="group" aria-label="Mapa de los barrios de la comuna" className="mx-auto h-auto w-full max-w-sm">
        {dibujo.map((b) => {
          const v = porNombre.get(sin(b.nombre));
          const activo = seleccionado != null && sin(seleccionado) === sin(b.nombre);
          return (
            <g key={b.nombre}>
              <path
                d={b.d}
                role="button"
                tabIndex={0}
                aria-pressed={activo}
                aria-label={`${b.nombre}: ${v == null ? "sin dato" : formato(v)} ${unidad}`}
                onClick={() => onElegir?.(b.nombre)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onElegir?.(b.nombre);
                  }
                }}
                style={{ fill: tono(v), stroke: activo ? "rgb(var(--tinta))" : "rgb(var(--superficie))", strokeWidth: activo ? 2.4 : 1, cursor: onElegir ? "pointer" : "default", transition: "fill 200ms ease" }}
                className="outline-none focus-visible:[stroke:rgb(var(--tinta))] focus-visible:[stroke-width:2.4px]"
              >
                <title>{`${b.nombre}: ${v == null ? "sin dato" : formato(v)} ${unidad}`}</title>
              </path>
              <text x={b.cx} y={b.cy} textAnchor="middle" fontSize="9.5" fontWeight={activo ? 700 : 500} className="pointer-events-none fill-tinta" style={{ paintOrder: "stroke", stroke: "rgb(var(--superficie) / 0.85)", strokeWidth: 3 }}>
                {b.nombre}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex items-center justify-center gap-2 text-xs text-tinta-suave">
        Menos
        {[0.2, 0.4, 0.6, 0.8, 1].map((a) => (
          <span key={a} aria-hidden="true" className="h-3 w-6 rounded-sm" style={{ background: `rgb(var(--marca) / ${0.16 + 0.74 * a})` }} />
        ))}
        Más ({unidad})
      </figcaption>
    </figure>
  );
}
