/**
 * Estructura del menú del sitio: cinco categorías con sus módulos.
 * La barra lateral, el menú del celular y el buscador rápido (Ctrl + K) leen de aquí, así que para agregar un módulo
 * nuevo basta con sumarlo a su grupo.
 * Una categoría sin módulos no se muestra.
 */
export type ModuloMenu = { ruta: string; nombre: string; icono: string; detalle: string; corto: string; fase?: string };
export type GrupoMenu = { id: string; titulo: string; corto: string; modulos: ModuloMenu[] };

export const GRUPOS: GrupoMenu[] = [
  {
    id: "panorama",
    corto: "Panorama",
    titulo: "Panorama",
    modulos: [
      { ruta: "/", nombre: "Inicio", corto: "Inicio", icono: "inicio", detalle: "Portada" },
      { ruta: "/propuesta", nombre: "Propuesta de valor", corto: "Propuesta", icono: "corazon", detalle: "Por qué existe el observatorio" },
    ],
  },
  {
    id: "territorio",
    corto: "Territorio",
    titulo: "Territorio",
    modulos: [
      { ruta: "/mapa", nombre: "Mapa territorial", corto: "Mapa", icono: "mapa", detalle: "Todas las capas" },
      { ruta: "/barrios", nombre: "Mi barrio", corto: "Barrio", icono: "personas", detalle: "Todo lo que se sabe de un barrio" },
    ],
  },
  {
    id: "movilidad",
    corto: "Movilidad",
    titulo: "Movilidad",
    modulos: [
      { ruta: "/accesibilidad", nombre: "Accesibilidad", corto: "Acceso", icono: "accesibilidad", detalle: "Minutos caminando" },
      { ruta: "/corredor-49", nombre: "Corredor Carrera 49", corto: "Corredor", icono: "corredor", detalle: "¿Conviene ir por la 49?" },
      { ruta: "/prioridades", nombre: "Prioridad de obras", corto: "Obras", icono: "prioridades", detalle: "Dónde intervenir primero" },
    ],
  },
  {
    id: "inmobiliario",
    corto: "Mercado",
    titulo: "Inmobiliario",
    modulos: [{ ruta: "/inmobiliario", nombre: "Mercado y POT", corto: "Mercado", icono: "cubo", detalle: "Oferta observada y norma del POT por barrio" }],
  },
  {
    id: "riesgo",
    corto: "Riesgo",
    titulo: "Riesgo",
    modulos: [{ ruta: "/riesgo", nombre: "Riesgo de ladera", corto: "Riesgo", icono: "ladera", detalle: "Gente y viviendas en zonas de amenaza" }],
  },
  {
    id: "comunidad",
    corto: "Comunidad",
    titulo: "Comunidad",
    modulos: [
      { ruta: "/problematicas", nombre: "Problemáticas", corto: "Problemas", icono: "alerta", detalle: "Ocho problemas con datos" },
      { ruta: "/radar", nombre: "Radar de noticias", corto: "Radar", icono: "radar", detalle: "Lo que dicen los medios" },
      { ruta: "/participacion", nombre: "Participación", corto: "Participa", icono: "participacion", detalle: "Reportar un problema", fase: "Pronto" },
    ],
  },
  {
    id: "datos",
    corto: "Datos",
    titulo: "Datos",
    modulos: [
      { ruta: "/indicadores", nombre: "Indicadores", corto: "Cifras", icono: "indicadores", detalle: "Cifras por barrio" },
      { ruta: "/datos", nombre: "Mis datos", corto: "Mis datos", icono: "subir", detalle: "Sube y mira tus datos" },
      { ruta: "/fuentes", nombre: "Fuentes y calidad", corto: "Fuentes", icono: "fuentes", detalle: "De dónde sale cada dato" },
      { ruta: "/identidad", nombre: "Manual de identidad", corto: "Identidad", icono: "paleta", detalle: "Colores, letras, voz y reglas" },
    ],
  },
].filter((g) => g.modulos.length > 0);

/** Grupo al que pertenece una ruta (para abrirlo solo cuando se está en uno de sus módulos). */
export function grupoDeRuta(pathname: string): string | undefined {
  const g = GRUPOS.find((x) =>
    x.modulos.some((m) => (m.ruta === "/" ? pathname === "/" : pathname === m.ruta || pathname.startsWith(`${m.ruta}/`))),
  );
  return g?.id;
}
