/**
 * Catálogo de fotografías de OTEA.
 *
 * Todas las fotos de este catálogo son de Santa Cruz (Comuna 2) o de la ladera de las comunas 1 y 2 de Medellín, según
 * el título que les puso quien las publicó. Ninguna es de banco de imágenes. Cada una dice quién la tomó, dónde se
 * publicó, con qué licencia, qué se le cambió (placas y caras difuminadas) y qué se sabe de su ubicación.
 *
 * Reglas (ver public/fotos/LEEME.md):
 *  - `lugar` solo dice lo que está confirmado. Si la publicación original dice "Comuna 2 - Santa Cruz" sin calle,
 *    eso es lo que se escribe; nunca se inventa un barrio, una esquina ni una fecha.
 *  - Las licencias NC (no comercial) sirven mientras OTEA sea un proyecto sin ánimo de lucro. Si OTEA se vende como
 *    servicio, esas fotos se deben reemplazar por fotos propias.
 *  - Para agregar una foto propia: optimizarla en 640 y 1280 px (y 1600 si va a ancho completo) en .webp, copiarla a
 *    public/fotos/ como <id>-<ancho>.webp y sumar su ficha aquí.
 */

export type TemaFoto = "territorio" | "movilidad" | "basuras" | "calles" | "espacio" | "comunidad";

export interface Foto {
  id: string;
  /** Anchos disponibles en public/fotos/<id>-<ancho>.webp */
  anchos: number[];
  /** Proporción del original (ancho / alto) para reservar el espacio y que la página no salte. */
  proporcion: number;
  /** Color promedio: se ve mientras la foto carga. */
  color: string;
  /** Punto que no se debe recortar (CSS object-position). */
  foco?: string;
  /** Texto alternativo: lo que se ve, para quien no puede ver la imagen. */
  alt: string;
  /** Pie de foto en palabras sencillas. */
  descripcion: string;
  /** Lo que se sabe del lugar. */
  lugar: string;
  /** true si el lugar exacto (calle o barrio) está confirmado; false si solo se sabe la comuna o el sector. */
  lugarConfirmado: boolean;
  temas: TemaFoto[];
  autor: string;
  /** Dónde se publicó el original. */
  publicadaPor: string;
  urlOriginal: string;
  fecha: string;
  licencia: string;
  urlLicencia: string;
  /** Qué cambió OTEA respecto al original (la licencia lo exige). */
  cambios: string;
  /** Temporal: debe reemplazarse por una foto propia cuando exista. */
  temporal?: boolean;
}

const NCSA = { licencia: "CC BY-NC-SA 2.0", urlLicencia: "https://creativecommons.org/licenses/by-nc-sa/2.0/" };
const MDE = { autor: "David Castaño", publicadaPor: "MDE Ciudad Inteligente (Alcaldía de Medellín), álbum «Comuna 2 - Santa Cruz» en Flickr" };

export const FOTOS: Record<string, Foto> = {
  calle: {
    id: "calle",
    anchos: [640, 960, 1280, 1600],
    proporcion: 16 / 9,
    color: "#7f6c60",
    foco: "50% 45%",
    alt: "Calle de Santa Cruz en subida, con banderines de colores entre las casas, motocarros de un mercado y personas caminando por el andén",
    descripcion: "Una calle comercial de Santa Cruz adornada con banderines.",
    lugar: "Comuna 2 · Santa Cruz. Un aviso en la foto menciona la unidad intermedia de Santa Cruz; la calle exacta no está confirmada.",
    lugarConfirmado: false,
    temas: ["territorio", "comunidad", "movilidad"],
    ...MDE,
    urlOriginal: "https://www.flickr.com/photos/medellin_digital/22306897619",
    fecha: "24 de octubre de 2015",
    ...NCSA,
    cambios: "Placas de los vehículos difuminadas y tamaño reducido.",
  },
  aniversario: {
    id: "aniversario",
    anchos: [640, 960, 1280, 1600],
    proporcion: 16 / 9,
    color: "#7b7267",
    foco: "50% 55%",
    alt: "Calle empinada con casas de ladrillo y balcones de colores, un hombre caminando por el andén y una pancarta de aniversario al fondo",
    descripcion: "Una calle en pendiente decorada para un aniversario del barrio.",
    lugar: "Comuna 2 · Santa Cruz, según la publicación original. La calle exacta no está confirmada.",
    lugarConfirmado: false,
    temas: ["movilidad", "comunidad", "territorio"],
    ...MDE,
    urlOriginal: "https://www.flickr.com/photos/medellin_digital/21871000294",
    fecha: "24 de octubre de 2015",
    ...NCSA,
    cambios: "Placas de los vehículos difuminadas y tamaño reducido.",
  },
  "callejon-tierra": {
    id: "callejon-tierra",
    anchos: [640, 960, 1280],
    proporcion: 16 / 9,
    color: "#75695f",
    foco: "45% 60%",
    alt: "Calle sin pavimentar, de tierra, entre casas de ladrillo con escaleras de caracol, ropa colgada y vecinos caminando a lo lejos",
    descripcion: "Una calle sin pavimentar entre casas de ladrillo.",
    lugar: "Comuna 2 · Santa Cruz, según la publicación original. La calle exacta no está confirmada.",
    lugarConfirmado: false,
    temas: ["calles", "movilidad"],
    ...MDE,
    urlOriginal: "https://www.flickr.com/photos/medellin_digital/22504788671",
    fecha: "24 de octubre de 2015",
    ...NCSA,
    cambios: "Caras de las personas y placa de la moto difuminadas; tamaño reducido.",
  },
  pasaje: {
    id: "pasaje",
    anchos: [640, 960, 1280],
    proporcion: 16 / 9,
    color: "#5e5952",
    foco: "40% 60%",
    alt: "Pasaje peatonal angosto entre casas, con un contenedor de basura metálico y residuos sueltos en el piso",
    descripcion: "Un pasaje peatonal con un contenedor de basura y residuos en el piso.",
    lugar: "Comuna 2 · Santa Cruz, según la publicación original. El pasaje exacto no está confirmado.",
    lugarConfirmado: false,
    temas: ["basuras", "calles"],
    ...MDE,
    urlOriginal: "https://www.flickr.com/photos/medellin_digital/21872544013",
    fecha: "24 de octubre de 2015",
    ...NCSA,
    cambios: "Tamaño reducido.",
  },
  rio: {
    id: "rio",
    anchos: [640, 960, 1280, 1600],
    proporcion: 16 / 9,
    color: "#888b80",
    foco: "60% 60%",
    alt: "Orilla del río Medellín con piedras y residuos plásticos, vegetación a un lado y casas en la ladera al fondo",
    descripcion: "La orilla del río Medellín, con residuos entre las piedras.",
    lugar: "Río Medellín. La publicación original la incluye en la Comuna 2; el punto exacto de la orilla no está confirmado.",
    lugarConfirmado: false,
    temas: ["basuras", "territorio"],
    ...MDE,
    urlOriginal: "https://www.flickr.com/photos/medellin_digital/22305796080",
    fecha: "24 de octubre de 2015",
    ...NCSA,
    cambios: "Tamaño reducido.",
  },
  laderas: {
    id: "laderas",
    anchos: [640, 960, 1280, 1600],
    proporcion: 1600 / 1064,
    color: "#8c8a89",
    foco: "50% 55%",
    alt: "Vista panorámica de la ladera nororiental de Medellín cubierta de casas, con nubes sobre las montañas",
    descripcion: "La ladera nororiental de Medellín, donde están las comunas 1 y 2.",
    lugar: "Comunas 1 y 2 de Medellín, según el título que le dio el autor. No se distingue dónde termina una comuna y empieza la otra.",
    lugarConfirmado: false,
    temas: ["territorio", "espacio"],
    autor: "Omar Uran",
    publicadaPor: "Flickr, «Valle de Aburra - Medellin - Comunas 1 y 2»",
    urlOriginal: "https://www.flickr.com/photos/11121717@N02/2310715626",
    fecha: "22 de julio de 2007",
    licencia: "CC BY 2.0",
    urlLicencia: "https://creativecommons.org/licenses/by/2.0/",
    cambios: "Tamaño reducido.",
  },
};

export type IdFoto = keyof typeof FOTOS;

export const fotoPorId = (id: string): Foto | undefined => FOTOS[id];

export const fotosDeTema = (t: TemaFoto) => Object.values(FOTOS).filter((f) => f.temas.includes(t));

const BASE = `${import.meta.env.BASE_URL}fotos/`;

/** src y srcset de una foto. */
export function fuentesFoto(f: Foto) {
  const anchos = [...f.anchos].sort((a, b) => a - b);
  return {
    src: `${BASE}${f.id}-${anchos.includes(960) ? 960 : anchos[0]}.webp`,
    srcSet: anchos.map((w) => `${BASE}${f.id}-${w}.webp ${w}w`).join(", "),
  };
}

/** Crédito corto para el pie de foto: autor · licencia. */
export const creditoCorto = (f: Foto) => `Foto: ${f.autor} · ${f.licencia}`;
