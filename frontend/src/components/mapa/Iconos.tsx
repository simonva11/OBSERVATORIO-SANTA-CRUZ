import type { TemaId } from "../../lib/capas";

/** Íconos de trazo simple, legibles a tamaño grande. */
const TRAZOS: Record<TemaId | "3d" | "giro" | "inicio" | "mas" | "menos" | "capas" | "cerrar" | "ruta", string> = {
  caminar: "M13 4.5 a1.5 1.5 0 1 0 0.01 0 M10 21 L12 15 L15 17 V21 M12 15 L11 10 L15 11 L17 14 M11 10 L8 12 L7 15 M3 21 H6 V18 H9 V15 H12",
  transporte: "M4 17 L20 7 M9 11.5 h6 v5 h-6 z M12 9.6 V11.5 M7 21 h10",
  colegios: "M3 10 L12 5 L21 10 L12 15 Z M7 12.5 V17 C9 19 15 19 17 17 V12.5 M21 10 V15",
  comunidad: "M12 20 C5 15 3 11.5 3 8.5 C3 6 5 4 7.5 4 C9.5 4 11 5 12 6.5 C13 5 14.5 4 16.5 4 C19 4 21 6 21 8.5 C21 11.5 19 15 12 20 Z M12 9 V14 M9.5 11.5 H14.5",
  parques: "M12 21 V14 M12 14 C7 14 5 11 6.5 8 C7 5 10 3.5 12 3.5 C14 3.5 17 5 17.5 8 C19 11 17 14 12 14 Z M8 21 H16",
  personas: "M8 11 a3 3 0 1 0 0-6 a3 3 0 1 0 0 6 M16 11 a3 3 0 1 0 0-6 a3 3 0 1 0 0 6 M2.5 20 C3 15.5 5.5 13.5 8 13.5 C10.5 13.5 13 15.5 13.5 20 M12.5 15 C13.5 14 14.6 13.5 16 13.5 C18.5 13.5 21 15.5 21.5 20",
  accidentes: "M12 3.5 L22 20 H2 Z M12 9.5 V14 M12 16.8 V17",
  riesgo: "M2 20 L9 8 L13 14 L16 10 L22 20 Z M9 8 L7 4 M15 6 L17 3",
  plan: "M4 4 H20 V20 H4 Z M4 10 H20 M10 10 V20 M14 4 V10",
  seguridad: "M12 3 L20 6 V12 C20 16.5 16.5 19.5 12 21 C7.5 19.5 4 16.5 4 12 V6 Z M9 12 L11.2 14.2 L15.2 9.8",
  corredor: "M4 20 L10 4 M20 20 L14 4 M12 6 V9 M12 12 V15 M12 18 V21",
  reclamos: "M4 5 H20 V16 H11 L7 20 V16 H4 Z M12 8.5 V11.5 M12 13.4 V13.5",
  misdatos: "M12 16 V4 M7.5 8.5 L12 4 L16.5 8.5 M4 15 V20 H20 V15",
  vivienda: "M3 11 L12 4 L21 11 M5.5 9.5 V20 H18.5 V9.5 M10 20 V14.5 H14 V20",
  "3d": "M12 3 L21 8 V16 L12 21 L3 16 V8 Z M3 8 L12 13 L21 8 M12 13 V21",
  giro: "M20 12 A8 8 0 1 1 16.5 5.4 M20 4 V9 H15",
  inicio: "M12 21 C12 21 5 14.5 5 9.5 A7 7 0 0 1 19 9.5 C19 14.5 12 21 12 21 Z M12 12 a2.5 2.5 0 1 0 0-5 a2.5 2.5 0 1 0 0 5",
  mas: "M12 5 V19 M5 12 H19",
  menos: "M5 12 H19",
  capas: "M12 3 L21 8 L12 13 L3 8 Z M3 12.5 L12 17.5 L21 12.5 M3 17 L12 22 L21 17",
  cerrar: "M6 6 L18 18 M18 6 L6 18",
  ruta: "M6 19 a2 2 0 1 0 0-4 a2 2 0 1 0 0 4 M18 9 a2 2 0 1 0 0-4 a2 2 0 1 0 0 4 M8 17 H15 C17.5 17 17.5 12 15 12 H9 C6.5 12 6.5 7 9 7 H16",
};

export default function Icono({ nombre, className = "h-6 w-6" }: { nombre: keyof typeof TRAZOS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
