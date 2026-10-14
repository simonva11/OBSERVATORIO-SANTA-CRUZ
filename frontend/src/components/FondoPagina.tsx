import { useMemo } from "react";

/** Curvas de nivel inventadas con ondas (no son datos del territorio), solo para dar textura. */
export function curvas(focos: { cx: number; cy: number; n: number; base: number; paso: number; fase: number }[]): string[] {
  const rutas: string[] = [];
  for (const f of focos)
    for (let k = 1; k <= f.n; k++) {
      const r = f.base + k * f.paso;
      const pts: string[] = [];
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const onda = 1 + 0.12 * Math.sin(a * 3 + f.fase + k * 0.25) + 0.07 * Math.sin(a * 5 - f.fase * 1.3 + k * 0.18);
        pts.push(`${(f.cx + Math.cos(a) * r * onda * 1.3).toFixed(1)},${(f.cy + Math.sin(a) * r * onda * 0.82).toFixed(1)}`);
      }
      rutas.push(`M${pts.join("L")}Z`);
    }
  return rutas;
}

/** Cuadrícula de latitud y longitud con curvas de nivel que se desplazan despacio: el fondo común de todas las páginas. */
export default function FondoPagina() {
  const rutas = useMemo(
    () =>
      curvas([
        { cx: 1020, cy: 190, n: 15, base: 30, paso: 34, fase: 0.7 },
        { cx: 120, cy: 560, n: 12, base: 26, paso: 36, fase: 2.1 },
        { cx: 980, cy: 900, n: 10, base: 30, paso: 38, fase: 1.3 },
      ]),
    [],
  );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <g fill="none" stroke="rgb(var(--marca))" strokeWidth="1.6" opacity="0.05">
          {rutas.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
    </div>
  );
}
