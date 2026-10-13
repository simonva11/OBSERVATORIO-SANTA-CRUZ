/**
 * Identidad de OTEA, el observatorio de Santa Cruz: un color de acento por módulo.
 * Cada acento trae tres tonos (oscuro, medio, vivo) que se usan en la cabecera, el menú y los chips.
 * Todos cumplen contraste de texto blanco sobre el tono medio de al menos 6,7:1 (se muestra en /identidad).
 */
export type Acento = { id: string; nombre: string; oscuro: string; medio: string; vivo: string };

export const ACENTOS: Record<string, Acento> = {
  violeta: { id: "violeta", nombre: "Cobalto", oscuro: "#0b1f5c", medio: "#1e40af", vivo: "#3b82f6" },
  azul: { id: "azul", nombre: "Azul", oscuro: "#0a2a5e", medio: "#1d5fb8", vivo: "#3d8bf0" },
  indigo: { id: "indigo", nombre: "Índigo", oscuro: "#0f1d5a", medio: "#2547b8", vivo: "#4f7df0" },
  magenta: { id: "magenta", nombre: "Zafiro", oscuro: "#0c2f5a", medio: "#0f5c9c", vivo: "#2e9ad8" },
  cielo: { id: "cielo", nombre: "Cielo", oscuro: "#082f49", medio: "#0e6aa5", vivo: "#38b2f0" },
  orquidea: { id: "orquidea", nombre: "Añil", oscuro: "#14275f", medio: "#3158c4", vivo: "#6a8ff5" },
  ultramar: { id: "ultramar", nombre: "Ultramar", oscuro: "#0b1a52", medio: "#1f3fb0", vivo: "#5577f2" },
};

/** Qué acento tiene cada ruta. Lo que no aparece usa el cobalto de la marca. */
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
