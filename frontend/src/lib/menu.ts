/**
 * Estructura del menú del sitio: cinco categorías con sus módulos.
 * La barra lateral, el menú del celular y el buscador rápido (Ctrl + K) leen de aquí, así que para agregar un módulo
 * nuevo basta con sumarlo a su grupo.
 * Una categoría sin módulos no se muestra.
 */
export type ModuloMenu = { ruta: string; nombre: string; icono: string; detalle: string; corto: string; fase?: string };
/** `titulo`: rótulo corto de la barra. `tarea`: lo que la persona viene a hacer (encabeza el desplegable). */
export type GrupoMenu = { id: string; titulo: string; corto: string; tarea: string; modulos: ModuloMenu[] };

/**
 * OTEA Técnico organizado por tareas, no por fuentes: explorar, analizar accesibilidad, revisar problemáticas,
 * consultar riesgos, trabajar con datos y herramientas para líderes. Cada ruta aparece una sola vez.
 */
export const GRUPOS: GrupoMenu[] = [
  {
    id: "explorar",
    corto: "Explorar",
    titulo: "Explorar",
    tarea: "Explorar el territorio",
    modulos: [
      { ruta: "/tecnico", nombre: "Inicio técnico", corto: "Inicio", icono: "inicio", detalle: "Qué responde OTEA hoy y por dónde empezar" },
      { ruta: "/mapa", nombre: "Mapa territorial", corto: "Mapa", icono: "mapa", detalle: "Todas las capas del territorio en un mapa, 2D y 3D" },
      { ruta: "/barrios", nombre: "Ficha de barrio", corto: "Barrio", icono: "personas", detalle: "Gente, servicios, riesgos y reportes de cada barrio" },
    ],
  },
  {
    id: "accesibilidad",
    corto: "Acceso",
    titulo: "Accesibilidad",
    tarea: "Analizar accesibilidad y evaluar prioridades",
    modulos: [
      { ruta: "/accesibilidad", nombre: "Accesibilidad", corto: "Acceso", icono: "accesibilidad", detalle: "Cuánto se camina a Metro, colegio, salud y parque" },
      { ruta: "/corredor-49", nombre: "Corredor Carrera 49", corto: "Corredor", icono: "corredor", detalle: "A quién le sirve ir por la Carrera 49" },
      { ruta: "/prioridades", nombre: "Prioridad de obras", corto: "Obras", icono: "prioridades", detalle: "Qué obras ayudarían a más gente primero (cálculo, no obras aprobadas)" },
    ],
  },
  {
    id: "problematicas",
    corto: "Problemas",
    titulo: "Problemáticas",
    tarea: "Revisar problemáticas y reportes",
    modulos: [
      { ruta: "/problematicas", nombre: "Problemáticas", corto: "Problemas", icono: "alerta", detalle: "Ocho problemas, cada uno con su evidencia" },
      { ruta: "/reclamos", nombre: "Huecos y reclamos", corto: "Reclamos", icono: "alerta", detalle: "Huecos y obras que la gente ya le pidió a la Alcaldía" },
      { ruta: "/residuos", nombre: "Residuos por barrio", corto: "Aseo", icono: "residuos", detalle: "Toneladas de residuos al mes por barrio" },
      { ruta: "/radar", nombre: "Radar de noticias", corto: "Radar", icono: "radar", detalle: "Lo que dicen los medios, por tema y barrio" },
    ],
  },
  {
    id: "riesgo",
    corto: "Riesgo",
    titulo: "Riesgo y norma",
    tarea: "Consultar riesgos y norma urbana",
    modulos: [
      { ruta: "/riesgo", nombre: "Riesgo de ladera", corto: "Riesgo", icono: "ladera", detalle: "Gente y viviendas en zonas de amenaza" },
      { ruta: "/inmobiliario", nombre: "Mercado y POT", corto: "Mercado", icono: "cubo", detalle: "Oferta publicada y norma del POT por barrio" },
    ],
  },
  {
    id: "datos",
    corto: "Datos",
    titulo: "Datos",
    tarea: "Revisar indicadores, fuentes y trabajar con datos",
    modulos: [
      { ruta: "/indicadores", nombre: "Indicadores", corto: "Cifras", icono: "indicadores", detalle: "Comparar barrios cifra por cifra" },
      { ruta: "/fuentes", nombre: "Fuentes y calidad", corto: "Fuentes", icono: "fuentes", detalle: "De dónde sale cada dato y qué tan nuevo es" },
      { ruta: "/datos", nombre: "Mis datos", corto: "Mis datos", icono: "subir", detalle: "Sube un archivo y míralo sobre el mapa" },
    ],
  },
  {
    id: "lideres",
    corto: "Líderes",
    titulo: "Líderes",
    tarea: "Herramientas para líderes y comunidad",
    modulos: [
      { ruta: "/lideres", nombre: "Kit para líderes", corto: "Líderes", icono: "estrella", detalle: "Cifras, cartas, plazos y a quién acudir" },
      { ruta: "/participacion", nombre: "Participación", corto: "Participa", icono: "participacion", detalle: "Organizar un reporte de tu cuadra", fase: "Prueba" },
    ],
  },
  {
    id: "otea",
    corto: "OTEA",
    titulo: "OTEA",
    tarea: "Sobre el proyecto",
    modulos: [
      { ruta: "/propuesta", nombre: "Propuesta de valor", corto: "Propuesta", icono: "corazon", detalle: "Para quién sirve, qué hace hoy y qué falta" },
      { ruta: "/recorrido", nombre: "Recorrido de 2 minutos", corto: "Recorrido", icono: "flecha", detalle: "Una visita guiada por OTEA, paso a paso" },
      { ruta: "/identidad", nombre: "Manual de identidad", corto: "Identidad", icono: "paleta", detalle: "Colores, letras, fotos, componentes y voz" },
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
