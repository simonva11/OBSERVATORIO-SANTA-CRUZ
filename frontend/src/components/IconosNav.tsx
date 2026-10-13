import type { ReactNode } from "react";

/** Íconos de contorno (24 px) para la barra lateral, la lista de módulos y las tarjetas de datos. */
const TRAZOS: Record<string, ReactNode> = {
  inicio: <path d="M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10" />,
  mapa: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  indicadores: <path d="M4 20h16M7 20v-7M12 20V5M17 20v-10" />,
  accesibilidad: (
    <>
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.8" />
    </>
  ),
  prioridades: <path d="M5 21V4M5 4h12l-2.5 4L17 12H5" />,
  participacion: <path d="M4 5h16v11h-9l-4 4v-4H4z" />,
  fuentes: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  personas: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M17 14c2.5 0 4.5 2 4.5 5" />
    </>
  ),
  arbol: (
    <>
      <path d="M12 22v-7" />
      <path d="M12 15c-4 0-7-3-7-6.5S8 2 12 2s7 3 7 6.5-3 6.5-7 6.5z" />
    </>
  ),
  alerta: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  ladera: <path d="M2 20 9 8l4 6 3-4 6 10zM9 8l1.5 2.5" />,
  cubo: <path d="M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10" />,
  tren: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 11h14M9 21l2-4M15 21l-2-4" />
      <circle cx="9" cy="14" r=".6" />
      <circle cx="15" cy="14" r=".6" />
    </>
  ),
  andenes: (
    <>
      <path d="M3 21 9 3M21 21 15 3" />
      <path d="M12 6v3M12 12v3M12 18v3" />
    </>
  ),
  corazon: <path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z" />,
  subir: <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 15v5h16v-5" />,
  corredor: <path d="M4 21 9 3M20 21 15 3M12 6v3M12 12v3M12 18v3" />,
  problematicas: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  radar: <path d="M12 12 19 5M3 12a9 9 0 0 1 9-9M7 12a5 5 0 0 1 5-5M12 12v.01M3 12a9 9 0 0 0 9 9 9 9 0 0 0 9-9" />,
  paleta: <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-1-.8-1.4-.8-2.4 0-1 .8-1.8 1.9-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3zM7.5 12h.01M9.5 8h.01M14.5 8h.01" />,
  luna: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  sol: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />,
  lupa: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" />,
  izquierda: <path d="m15 6-6 6 6 6" />,
  derecha: <path d="m9 6 6 6-6 6" />,
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export default function IconoNav({ nombre, className = "h-6 w-6", trazo = 1.8 }: { nombre: string; className?: string; trazo?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={trazo} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre] ?? null}
    </svg>
  );
}
