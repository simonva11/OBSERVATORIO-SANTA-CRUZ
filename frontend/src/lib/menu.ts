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
      { ruta: "/", nombre: "Inicio", corto: "Inicio", icono: "inicio", detalle: "Qué es OTEA y por dónde empezar" },
      { ruta: "/propuesta", nombre: "Propuesta de valor", corto: "Propuesta", icono: "corazon", detalle: "Para quién sirve, qué hace hoy y qué falta" },
    ],
  },
  {
    id: "territorio",
    corto: "Territorio",
    titulo: "Territorio",
    modulos: [
      { ruta: "/mapa", nombre: "Mapa territorial", corto: "Mapa", icono: "mapa", detalle: "Todas las capas del territorio en un mapa" },
      { ruta: "/barrios", nombre: "Mi barrio", corto: "Barrio", icono: "personas", detalle: "La ficha de tu barrio: gente, servicios, riesgos y reportes" },
    ],
  },
  {
    id: "movilidad",
    corto: "Movilidad",
    titulo: "Movilidad",
    modulos: [
      { ruta: "/accesibilidad", nombre: "Accesibilidad", corto: "Acceso", icono: "accesibilidad", detalle: "Cuánto se camina a Metro, colegio, salud y parque" },
      { ruta: "/corredor-49", nombre: "Corredor Carrera 49", corto: "Corredor", icono: "corredor", detalle: "A quién le sirve ir por la Carrera 49" },
      { ruta: "/prioridades", nombre: "Prioridad de obras", corto: "Obras", icono: "prioridades", detalle: "Qué obras ayudarían a más gente primero" },
    ],
  },
  {
    id: "inmobiliario",
    corto: "Mercado",
    titulo: "Inmobiliario",
    modulos: [{ ruta: "/inmobiliario", nombre: "Mercado y POT", corto: "Mercado", icono: "cubo", detalle: "Oferta publicada y norma del POT por barrio" }],
  },
  {
    id: "riesgo",
    corto: "Riesgo",
    titulo: "Riesgo",
    modulos: [{ ruta: "/riesgo", nombre: "Riesgo de ladera", corto: "Riesgo", icono: "ladera", detalle: "Gente y viviendas en zonas de amenaza" }],
  },
  {
    id: "servicios",
    corto: "Servicios",
    titulo: "Servicios públicos",
    modulos: [{ ruta: "/residuos", nombre: "Residuos por barrio", corto: "Aseo", icono: "residuos", detalle: "Toneladas de residuos al mes por barrio" }],
  },
  {
    id: "comunidad",
    corto: "Comunidad",
    titulo: "Comunidad",
    modulos: [
      { ruta: "/problematicas", nombre: "Problemáticas", corto: "Problemas", icono: "alerta", detalle: "Ocho problemas, cada uno con su evidencia" },
      { ruta: "/reclamos", nombre: "Huecos y reclamos", corto: "Reclamos", icono: "alerta", detalle: "Huecos y obras que la gente ya le pidió a la Alcaldía" },
      { ruta: "/radar", nombre: "Radar de noticias", corto: "Radar", icono: "radar", detalle: "Lo que dicen los medios, por tema y barrio" },
      { ruta: "/lideres", nombre: "Kit para líderes", corto: "Líderes", icono: "estrella", detalle: "Cifras, cartas, plazos y a quién acudir" },
      { ruta: "/participacion", nombre: "Participación", corto: "Participa", icono: "participacion", detalle: "Reportar un problema en tu cuadra", fase: "Prueba" },
    ],
  },
  {
    id: "datos",
    corto: "Datos",
    titulo: "Datos",
    modulos: [
      { ruta: "/indicadores", nombre: "Indicadores", corto: "Cifras", icono: "indicadores", detalle: "Comparar barrios cifra por cifra" },
      { ruta: "/datos", nombre: "Mis datos", corto: "Mis datos", icono: "subir", detalle: "Sube un archivo y míralo sobre el mapa" },
      { ruta: "/fuentes", nombre: "Fuentes y calidad", corto: "Fuentes", icono: "fuentes", detalle: "De dónde sale cada dato y qué tan nuevo es" },
      { ruta: "/identidad", nombre: "Manual de identidad", corto: "Identidad", icono: "paleta", detalle: "Colores, letras, componentes y voz" },
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
