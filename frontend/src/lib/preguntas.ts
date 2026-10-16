import type { IdHistoria } from "./ciudadano";

/**
 * Preguntas del mapa para vecinos. Cada una se traduce a capas que existen de verdad en el mapa (lib/capas.ts) y dice
 * qué cubre el dato y qué no. Si una pregunta no se puede responder con los datos que hay, no está en esta lista
 * (por ejemplo «¿dónde se acumula la basura?»: no hay datos de puntos de acumulación que se puedan publicar).
 */
export interface PreguntaMapa {
  id: string;
  pregunta: string;
  /** Rótulo corto para botones. */
  corta: string;
  capas: string[];
  color: string;
  explica: string;
  cobertura: string;
  historia?: IdHistoria;
  /** Página técnica donde se analiza a fondo. */
  tecnica: { to: string; texto: string };
}

export const PREGUNTAS_MAPA: PreguntaMapa[] = [
  {
    id: "metro",
    pregunta: "¿Cómo llego al Metro o al Metrocable?",
    corta: "Llegar al Metro",
    capas: ["lineas_transporte", "estaciones", "paradas"],
    color: "#1d5aa8",
    explica: "Estaciones y líneas de Metro, Metrocable y Metroplús, y los paraderos de bus. Con «¿Cómo llego?» puedes trazar la ruta a pie desde tu casa.",
    cobertura: "Estaciones y líneas oficiales; paraderos de la Secretaría de Movilidad. Los minutos caminando son un cálculo de OTEA.",
    historia: "movilidad-mayores",
    tecnica: { to: "/accesibilidad", texto: "Ver cuánto se camina, barrio por barrio" },
  },
  {
    id: "huecos",
    pregunta: "¿Dónde han reportado huecos?",
    corta: "Huecos reportados",
    capas: ["huecos"],
    color: "#86560a",
    explica: "Cada punto es un reporte de hueco hecho a la Alcaldía desde 2020. El color dice si figura como arreglado o pendiente.",
    cobertura: "Reportes ciudadanos del Sistema de Gestión Vial. Un reporte no es un hueco confirmado: puede haber repetidos, y donde no hay puntos puede que nadie haya reportado.",
    historia: "huecos",
    tecnica: { to: "/reclamos", texto: "Ver los reportes, los tiempos y los pendientes" },
  },
  {
    id: "andenes",
    pregunta: "¿Cómo son los andenes y las escaleras?",
    corta: "Andenes y escaleras",
    capas: ["andenes", "escaleras_osm"],
    color: "#7a4e9b",
    explica: "Los tramos de andén según su ancho y las escaleras públicas. Un andén angosto (menos de 1,2 m) es difícil para una silla de ruedas o un coche de bebé.",
    cobertura: "Inventario de andenes de la Secretaría de Movilidad y escaleras de OpenStreetMap. Mide el ancho, no si están dañados; no cubre todas las calles.",
    historia: "huecos",
    tecnica: { to: "/accesibilidad", texto: "Ver el análisis de andenes y caminata" },
  },
  {
    id: "quebradas",
    pregunta: "¿Qué ha pedido la gente sobre las quebradas?",
    corta: "Quebradas",
    capas: ["solicitudes_quebradas"],
    color: "#156a73",
    explica: "Solicitudes que la gente le hizo a la Alcaldía sobre las quebradas. Muchas son por basuras o escombros en el cauce.",
    cobertura: "Solicitudes ciudadanas registradas por la Alcaldía (SIRO). No dicen si el problema se resolvió ni muestran todos los puntos con basura.",
    historia: "basuras",
    tecnica: { to: "/residuos", texto: "Ver las toneladas de residuos por barrio" },
  },
  {
    id: "parques",
    pregunta: "¿Dónde hay parques y canchas?",
    corta: "Parques y canchas",
    capas: ["espacio_publico", "escenarios_deportivos"],
    color: "#2b6446",
    explica: "El espacio público existente (parques, plazoletas, zonas verdes) y los escenarios deportivos.",
    cobertura: "Capa de espacio público de la Alcaldía (datos de 2014) y escenarios del INDER. Puede no incluir espacios nuevos.",
    historia: "espacio-publico",
    tecnica: { to: "/indicadores", texto: "Comparar el espacio público por barrio" },
  },
  {
    id: "servicios",
    pregunta: "¿Dónde hay colegios y centros de salud?",
    corta: "Colegios y salud",
    capas: ["sedes_educativas", "equipamientos"],
    color: "#3b6fa8",
    explica: "Sedes educativas y equipamientos colectivos: salud, sedes comunales, cultura y seguridad.",
    cobertura: "Capas oficiales de la Alcaldía. La lista de equipamientos puede estar incompleta o desactualizada.",
    tecnica: { to: "/accesibilidad", texto: "Ver cuánto se camina a cada servicio" },
  },
  {
    id: "gente",
    pregunta: "¿Dónde vive más gente?",
    corta: "Dónde vive la gente",
    capas: ["manzanas"],
    color: "#3d7a5d",
    explica: "Las manzanas pintadas según cuántas personas viven en cada una.",
    cobertura: "Censo DANE 2018, por manzana. No incluye cambios posteriores a 2018.",
    tecnica: { to: "/indicadores", texto: "Ver la población por barrio" },
  },
  {
    id: "riesgo",
    pregunta: "¿Dónde hay riesgo de deslizamiento?",
    corta: "Riesgo de ladera",
    capas: ["amenaza_movimiento_masa", "riesgo_no_mitigable"],
    color: "#a2472a",
    explica: "Las zonas donde el POT marca amenaza alta, media o baja por movimiento en masa, y las de riesgo no mitigable.",
    cobertura: "Plan de Ordenamiento Territorial de Medellín. Es una zonificación de planeación, no un estudio casa por casa.",
    tecnica: { to: "/riesgo", texto: "Ver gente y viviendas en zonas de amenaza" },
  },
];

export const preguntaPorId = (id: string | null | undefined) => PREGUNTAS_MAPA.find((p) => p.id === id);
