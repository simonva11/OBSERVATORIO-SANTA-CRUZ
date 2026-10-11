/**
 * Identidad de OTEA, el observatorio de Santa Cruz: un color de acento por módulo.
 * Cada acento trae tres tonos (oscuro, medio, vivo) que se usan en la cabecera, el menú y los chips.
 * Todos cumplen contraste de texto blanco sobre el tono medio de al menos 6,7:1 (se muestra en /identidad).
 */
export type Acento = { id: string; nombre: string; oscuro: string; medio: string; vivo: string };

export const ACENTOS: Record<string, Acento> = {
  violeta: { id: "violeta", nombre: "Violeta", oscuro: "#1b1550", medio: "#3a2d8f", vivo: "#6a4fe0" },
  azul: { id: "azul", nombre: "Azul", oscuro: "#0f2447", medio: "#1d4f9a", vivo: "#3a7be0" },
  indigo: { id: "indigo", nombre: "Índigo", oscuro: "#14184f", medio: "#2a35a8", vivo: "#4a5ae0" },
  magenta: { id: "magenta", nombre: "Magenta", oscuro: "#3d1442", medio: "#7a2a8a", vivo: "#b04ac0" },
  cielo: { id: "cielo", nombre: "Cielo", oscuro: "#0b2b45", medio: "#1a5f95", vivo: "#2a8ac8" },
  orquidea: { id: "orquidea", nombre: "Orquídea", oscuro: "#35154a", medio: "#6a2f9a", vivo: "#9a55d0" },
  ultramar: { id: "ultramar", nombre: "Ultramar", oscuro: "#101a55", medio: "#2a3fb0", vivo: "#5a6ff0" },
};

/** Qué acento tiene cada ruta. Lo que no aparece usa el violeta de la marca. */
const POR_RUTA: [string, keyof typeof ACENTOS][] = [
  ["/accesibilidad", "azul"],
  ["/corredor-49", "indigo"],
  ["/problematicas", "magenta"],
  ["/riesgo", "magenta"],
  ["/inmobiliario", "cielo"],
  ["/radar", "cielo"],
  ["/barrios", "orquidea"],
  ["/datos", "ultramar"],
];

export function acentoDeRuta(pathname: string): Acento {
  const hallado = POR_RUTA.find(([r]) => pathname.startsWith(r));
  return ACENTOS[hallado ? hallado[1] : "violeta"];
}

/** Semáforo único del sitio: bien, ojo, mal. Siempre con texto además del color. */
export const SEMAFORO = { bien: "#2d9a5a", ojo: "#e0a526", mal: "#c0583a" } as const;
