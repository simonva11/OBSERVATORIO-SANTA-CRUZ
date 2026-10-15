/**
 * OTEA tiene dos experiencias sobre la misma plataforma y los mismos datos:
 *  - Ciudadana: la puerta de entrada ("Así vivimos Santa Cruz"), pensada para vecinos.
 *  - Técnica: los módulos de análisis para JAC, JAL, entidades, investigadores y analistas.
 * Qué cabecera y qué menú se muestran depende de la ruta, así ningún enlace compartido se rompe.
 */
const CIUDADANAS = ["/historias", "/participacion", "/barrios"];

export function esCiudadana(pathname: string) {
  return pathname === "/" || CIUDADANAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Las historias son lecturas lineales: no llevan el índice "En esta página". */
export function esHistoria(pathname: string) {
  return pathname === "/" || pathname === "/historias" || pathname.startsWith("/historias/");
}

/** Enlaces de la cabecera ciudadana. Lo demás vive en OTEA Técnico. */
export const NAV_CIUDADANA = [
  { ruta: "/historias", texto: "Los problemas" },
  { ruta: "/barrios", texto: "Mi barrio" },
  { ruta: "/participacion", texto: "Participa" },
] as const;
