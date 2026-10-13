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

/** Rótulos de la cuadrícula: grados y minutos reales de la zona (Comuna 2 queda cerca de 6°18′ N, 75°33′ O). */
const LAT = ["6°20′N", "6°19′N", "6°18′N", "6°17′N", "6°16′N"];
const LON = ["75°35′O", "75°34′O", "75°33′O", "75°32′O", "75°31′O"];

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
      <div className="absolute -right-24 -top-24 h-[34rem] w-[34rem] rounded-full " style={{ background: "radial-gradient(circle, rgb(var(--brillo) / 0.2), transparent 68%)" }} />
      <div className="absolute -bottom-32 -left-24 h-[30rem] w-[30rem] rounded-full " style={{ background: "radial-gradient(circle, rgb(var(--brillo-2) / 0.14), transparent 68%)" }} />
      <svg viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <g fill="none" stroke="rgb(var(--marca))" strokeWidth="1.6" opacity="0.1">
          {rutas.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g stroke="rgb(var(--marca))" strokeWidth="1" opacity="0.1" strokeDasharray="2 7">
          {LON.map((_, i) => (
            <line key={`x${i}`} x1={120 + i * 240} y1="0" x2={120 + i * 240} y2="1000" />
          ))}
          {LAT.map((_, i) => (
            <line key={`y${i}`} x1="0" y1={100 + i * 200} x2="1200" y2={100 + i * 200} />
          ))}
        </g>
        <g fill="rgb(var(--marca))" opacity="0.32" fontSize="11" fontWeight="600" letterSpacing="1.2">
          {LON.map((t, i) => (
            <text key={`tx${i}`} x={126 + i * 240} y="978">{t}</text>
          ))}
          {LAT.map((t, i) => (
            <text key={`ty${i}`} x="10" y={94 + i * 200}>{t}</text>
          ))}
        </g>
        <g stroke="rgb(var(--marca))" strokeWidth="1.4" opacity="0.28">
          {LON.map((_, i) => (
            <line key={`cx${i}`} x1={120 + i * 240} y1="986" x2={120 + i * 240} y2="1000" />
          ))}
        </g>
      </svg>
    </div>
  );
}
