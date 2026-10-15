import { useMemo } from "react";
import { useProyeccion } from "../../lib/proyeccion";

const ANCHO = 360;
const ALTO = 420;
const CORTO: Record<string, string> = { "Playón de Los Comuneros": "Playón", "Villa del Socorro": "V. Socorro", "Moscú No.1": "Moscú", "Villa Niza": "V. Niza" };

/**
 * Mapa sencillo de los 11 barrios, pintado con un solo color en cinco tonos (más oscuro = más).
 * No usa mapa de fondo: carga al instante y sirve sin conexión. Cada barrio se elige con el dedo, el mouse o el teclado,
 * y trae su cifra escrita en el nombre accesible, así el color nunca es el único dato.
 */
export default function MapaBarrios({
  valores, color, invertir = false, unidad, formato, seleccionado, onElegir, mini = false, etiquetas = true,
}: {
  valores: Record<string, number | null>;
  color: string;
  invertir?: boolean;
  unidad: string;
  formato: (v: number) => string;
  seleccionado?: string;
  onElegir?: (codigo: string) => void;
  /** Miniatura decorativa: sin nombres ni interacción. */
  mini?: boolean;
  etiquetas?: boolean;
}) {
  const proy = useProyeccion(ANCHO, ALTO, 10);
  const { min, max } = useMemo(() => {
    const v = Object.values(valores).filter((x): x is number => x != null);
    return { min: Math.min(...v), max: Math.max(...v) };
  }, [valores]);

  if (!proy) return <div className="grid aspect-[360/420] w-full place-items-center rounded-2xl bg-papel-hondo text-sm text-tinta-suave" role="status">Cargando el mapa…</div>;

  // Cinco tonos entre el valor más bajo y el más alto; con "invertir", donde hay menos se pinta más oscuro.
  const nivel = (v: number | null | undefined) => {
    if (v == null || !isFinite(min) || max === min) return 0;
    const t = (v - min) / (max - min);
    return Math.min(5, Math.max(1, Math.ceil((invertir ? 1 - t : t) * 5 - 1e-9) || 1));
  };
  const opacidad = (n: number) => 0.14 + 0.78 * (n / 5);

  return (
    <figure className="ciu-mapa">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="mx-auto h-auto w-full max-w-md" role={mini ? "img" : "group"} aria-label={mini ? "Ilustración con los barrios de Santa Cruz" : "Mapa de los barrios de Santa Cruz. Toca un barrio para ver su cifra"} aria-hidden={mini ? true : undefined}>
        {proy.items.map((b) => {
          const v = valores[b.codigo];
          const n = nivel(v);
          const activo = seleccionado === b.codigo;
          const texto = `${b.nombre}: ${v == null ? "sin dato" : `${formato(v)} (${unidad})`}`;
          return (
            <path
              key={b.codigo}
              d={b.d}
              {...(mini ? {} : { role: "button", tabIndex: 0, "aria-pressed": activo, "aria-label": texto, onClick: () => onElegir?.(b.codigo), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onElegir?.(b.codigo); } } })}
              style={{ fill: n === 0 ? "rgb(var(--nivel) / 0.5)" : color, fillOpacity: n === 0 ? 1 : opacidad(n), stroke: activo ? "rgb(var(--tinta))" : "rgb(var(--superficie))", strokeWidth: activo ? 3 : 1.4, cursor: mini ? "default" : "pointer", transition: "fill-opacity 200ms ease" }}
              className={mini ? "" : "outline-none focus-visible:[stroke:rgb(var(--tinta))] focus-visible:[stroke-width:3px]"}
            >
              {!mini && <title>{texto}</title>}
            </path>
          );
        })}
        {!mini && etiquetas && proy.items.map((b) => (
          <text key={`t${b.codigo}`} x={b.centro[0]} y={b.centro[1]} textAnchor="middle" fontSize="10.5" fontWeight={seleccionado === b.codigo ? 800 : 600} className="pointer-events-none fill-tinta" style={{ paintOrder: "stroke", stroke: "rgb(var(--superficie) / 0.9)", strokeWidth: 3.5 }}>
            {CORTO[b.nombre] ?? b.nombre}
          </text>
        ))}
      </svg>
    </figure>
  );
}

/** Leyenda con palabras: cinco tonos de menos a más. */
export function LeyendaMapa({ color, texto, invertir = false }: { color: string; texto: string; invertir?: boolean }) {
  return (
    <div className="mt-2 text-center text-[0.86rem] text-tinta-suave">
      <p className="flex items-center justify-center gap-2">
        <span>{invertir ? "Más espacio" : "Menos"}</span>
        {[1, 2, 3, 4, 5].map((n) => <span key={n} aria-hidden="true" className="h-3.5 w-7 rounded" style={{ background: color, opacity: 0.14 + 0.78 * ((invertir ? 6 - n : n) / 5) }} />)}
        <span>{invertir ? "Menos espacio" : "Más"}</span>
      </p>
      <p className="mt-1">{texto} Gris: sin dato.</p>
    </div>
  );
}
