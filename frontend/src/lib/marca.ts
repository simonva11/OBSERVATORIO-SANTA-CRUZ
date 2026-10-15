/**
 * Identidad de OTEA. El cobalto es la marca: botones, enlaces, selección y foco.
 * Cada tema de información tiene su propio color, usado con mesura: el punto del encabezado, el ícono del menú
 * y las categorías de los gráficos. Así una persona reconoce de qué tema está viendo datos sin leer el título.
 * Todos los tonos "medio" dan contraste de al menos 4,5:1 con texto blanco (se muestra en /identidad).
 */
export type Acento = { id: string; nombre: string; tema: string; oscuro: string; medio: string; vivo: string };

export const ACENTOS: Record<string, Acento> = {
  cobalto: { id: "cobalto", nombre: "Cobalto", tema: "Marca, panorama y datos", oscuro: "#0d1e5c", medio: "#1f40cc", vivo: "#4c6ef5" },
  musgo: { id: "musgo", nombre: "Musgo", tema: "Territorio y barrios", oscuro: "#183526", medio: "#2b6446", vivo: "#4e9a6e" },
  vial: { id: "vial", nombre: "Azul vial", tema: "Movilidad y obras", oscuro: "#0b2b52", medio: "#1d5aa8", vivo: "#3d8bdb" },
  ciruela: { id: "ciruela", nombre: "Ciruela", tema: "Mercado y POT", oscuro: "#2e2457", medio: "#5144a3", vivo: "#7b6fd0" },
  teja: { id: "teja", nombre: "Teja", tema: "Riesgo de ladera", oscuro: "#552313", medio: "#a2472a", vivo: "#d06a40" },
  petroleo: { id: "petroleo", nombre: "Petróleo", tema: "Servicios públicos", oscuro: "#0c3a40", medio: "#156a73", vivo: "#2aa3ae" },
  ambar: { id: "ambar", nombre: "Ámbar", tema: "Comunidad", oscuro: "#4d3305", medio: "#86560a", vivo: "#c98a1b" },
  grafito: { id: "grafito", nombre: "Grafito", tema: "Fuentes y método", oscuro: "#1c2333", medio: "#3f4a63", vivo: "#6b7894" },
};

/** Qué acento tiene cada ruta. Lo que no aparece usa el cobalto de la marca. */
const POR_RUTA: [string, keyof typeof ACENTOS][] = [
  ["/mapa", "musgo"],
  ["/barrios", "musgo"],
  ["/accesibilidad", "vial"],
  ["/corredor-49", "vial"],
  ["/prioridades", "vial"],
  ["/inmobiliario", "ciruela"],
  ["/riesgo", "teja"],
  ["/residuos", "petroleo"],
  ["/problematicas", "ambar"],
  ["/reclamos", "ambar"],
  ["/radar", "ambar"],
  ["/lideres", "ambar"],
  ["/participacion", "ambar"],
  ["/fuentes", "grafito"],
  ["/identidad", "grafito"],
];

export function acentoDeRuta(pathname: string): Acento {
  const hallado = POR_RUTA.find(([r]) => pathname.startsWith(r));
  return ACENTOS[hallado ? hallado[1] : "cobalto"];
}

/** Semáforo único del sitio: bien, ojo, mal. Siempre con texto además del color. */
export const SEMAFORO = { bien: "#2e7d4f", ojo: "#b7791f", mal: "#b5452f" } as const;
