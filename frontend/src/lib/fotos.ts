/**
 * Fotos de la vista ciudadana.
 *
 * Para poner una foto real de Santa Cruz basta con copiar el archivo a `src/assets/fotos/` con el nombre del tema
 * (portada.jpg, mayores.jpg, basuras.jpg, huecos.jpg, espacio.jpg; también sirven .jpeg, .png, .webp y .avif).
 * No hay que tocar código: si el archivo existe, la foto reemplaza a la ilustración con datos.
 * Si hay foto, completa abajo el `lugar` y el `credito` de quien la tomó, para que el pie de foto diga la verdad.
 */
export type IdFoto = "portada" | "mayores" | "basuras" | "huecos" | "espacio";

export interface MetaFoto {
  /** Texto alternativo para quien no ve la imagen: describe lo que debería mostrar la foto real. */
  alt: string;
  /** Lugar exacto de la foto, p. ej. "Escaleras de La Isla". Vacío = no se muestra. */
  lugar: string;
  /** Quién la tomó. Vacío = no se muestra. */
  credito: string;
  /** Qué conviene fotografiar para este tema (guía para el equipo). */
  sugerencia: string;
}

export const FOTOS: Record<IdFoto, MetaFoto> = {
  portada: {
    alt: "Vista de las calles y laderas de Santa Cruz, Medellín",
    lugar: "",
    credito: "",
    sugerencia: "Una panorámica de la ladera con casas, calles y el cable al fondo; si salen personas, que sea de espaldas o de lejos.",
  },
  mayores: {
    alt: "Una calle empinada o unas escaleras de Santa Cruz por donde la gente camina a diario",
    lugar: "",
    credito: "",
    sugerencia: "Una calle o escalera empinada de camino a la estación. Sin caras ni placas; pedir permiso si aparece alguien.",
  },
  basuras: {
    alt: "Una esquina o un andén de Santa Cruz donde se acumulan residuos",
    lugar: "",
    credito: "",
    sugerencia: "Una esquina o quebrada con residuos acumulados. Evitar casas identificables, placas y personas.",
  },
  huecos: {
    alt: "Un hueco en la calle o un andén dañado en Santa Cruz",
    lugar: "",
    credito: "",
    sugerencia: "Un hueco o un andén roto, con algo al lado que dé la escala (un pie, una cuerda métrica).",
  },
  espacio: {
    alt: "Un parque, una cancha o una plazoleta de Santa Cruz",
    lugar: "",
    credito: "",
    sugerencia: "Un parque o cancha del barrio en uso, o un rincón donde la gente se sienta a conversar.",
  },
};

const ARCHIVOS = import.meta.glob("../assets/fotos/*.{jpg,jpeg,png,webp,avif}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

/** La foto real de un tema, si ya se copió el archivo; null mientras no exista. */
export function fotoReal(id: IdFoto): { src: string } & MetaFoto | null {
  const hallado = Object.entries(ARCHIVOS).find(([ruta]) => {
    const nombre = ruta.split("/").pop()!.replace(/\.[^.]+$/, "").toLowerCase();
    return nombre === id;
  });
  return hallado ? { src: hallado[1], ...FOTOS[id] } : null;
}
