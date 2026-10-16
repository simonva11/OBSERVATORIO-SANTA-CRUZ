import { useEffect, useState } from "react";
import { useDatos } from "./datos";
import { dec, dec2, num } from "./formato";
import { ACENTOS } from "./marca";

/* =====================================================================================================
 * Datos y textos de la vista ciudadana.
 * Todas las cifras salen de ciudadano.json (lo arma data-pipeline/ciudadano.py con los mismos archivos que
 * usan las páginas técnicas). Los textos se escriben aquí con esas cifras, nunca con números sueltos.
 * ===================================================================================================== */

export interface BarrioCiu {
  codigo: string;
  nombre: string;
  personas: number;
  mayores_60: number;
  menores_10: number;
  espacio_m2_hab: number | null;
  mayores_lejos_10: number;
  mayores_lejos_15: number;
  min_metro_mayores: number | null;
  residuos_t_mes: number | null;
  residuos_kg_persona_dia: number | null;
  huecos_total: number | null;
  huecos_arreglados: number | null;
  huecos_pendientes: number | null;
  andenes_angostos_pct: number | null;
  basuras_quebradas: number;
}

export interface Ciudadano {
  generado: string;
  comuna: {
    personas: number;
    mayores_60: number;
    menores_10: number;
    mayores_lejos_10: number;
    mayores_lejos_15: number;
    metro_10min_pct_todos: number;
    metro_promedio_min_todos: number;
    espacio_m2_hab: number;
    residuos_t_mes: number;
    residuos_t_dia: number;
    residuos_kg_persona_dia: number;
    residuos_periodo: { desde: string; hasta: string; meses: number };
    huecos: { total: number; arreglados: number; pendientes: number; descartados: number; duplicados: number; dias_mediana: number; dias_p90: number; desde: string; hasta: string; por_dia: number };
    andenes: { km: number; angostos_pct: number; umbral_m: number };
    quebradas: { total: number; basuras: number; desde: string };
  };
  barrios: BarrioCiu[];
}

export const useCiudadano = () => useDatos<Ciudadano>("ciudadano.json");

// ------------------------------------------------------------------ barrio elegido (se recuerda en el navegador)
const CLAVE_BARRIO = "observatorio-santa-cruz:mi-barrio";

/** El barrio que la persona eligió. Un ?barrio=0201 en la dirección manda sobre lo guardado. */
export function useMiBarrio(): [string, (codigo: string) => void] {
  const [codigo, setCodigo] = useState(() => {
    const desdeUrl = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("barrio");
    if (desdeUrl) return desdeUrl;
    try {
      return localStorage.getItem(CLAVE_BARRIO) ?? "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    try {
      if (codigo) localStorage.setItem(CLAVE_BARRIO, codigo);
    } catch {
      /* sin almacenamiento */
    }
  }, [codigo]);
  return [codigo, setCodigo];
}

// ------------------------------------------------------------------ las historias
export type IdHistoria = "movilidad-mayores" | "basuras" | "huecos" | "espacio-publico";

/** Una línea de "Fuente" de la página: se pasa tal cual al componente Fuente. */
export interface FuenteHistoria { ids: string[]; calculo?: string; clase?: "oficial" | "entregado" | "derivado" | "ciudadano" | "prensa" | "demostrativo" | "pendiente"; texto?: string }

export interface Historia {
  id: IdHistoria;
  numero: number;
  /** Título corto de la tarjeta. */
  titulo: string;
  /** Pregunta de la tarjeta. */
  pregunta: string;
  /** Frase humana que abre la historia. */
  frase: string;
  situacion: string[];
  porQue: string[];
  /** Lo que todavía no se sabe o no se puede concluir. */
  noSabemos: string[];
  /** Foto principal (id del catálogo en lib/fotos.ts). */
  foto: string;
  /** Otras fotos del tema para "Lo que vemos". */
  fotosExtra: string[];
  /** Qué muestra la foto y qué no permite concluir. */
  vemos: string;
  color: string;
  /** Cifra principal con su traducción a algo cotidiano. */
  cifra: (c: Ciudadano) => { valor: string; texto: string; traduccion: string; otras: string[] };
  /** Lo que el mapa de esta historia colorea. */
  mapa: {
    etiqueta: string;
    valor: (b: BarrioCiu) => number | null;
    /** true: menos es peor (se pinta más oscuro donde hay menos). */
    invertir?: boolean;
    unidad: string;
    leyenda: string;
    formato: (v: number) => string;
  };
  /** Qué dice la ficha de un barrio, en palabras sencillas. */
  ficha: (b: BarrioCiu, c: Ciudadano) => string[];
  /** Lo que se manda por WhatsApp (el enlace se agrega aparte). */
  compartir: (c: Ciudadano) => string;
  fuentes: FuenteHistoria[];
  /** Cómo profundizar: páginas técnicas. La primera es la principal. */
  tecnica: { to: string; texto: string }[];
  /** Cómo se calculó, para quien quiera saberlo. */
  metodo: string;
}

const mes = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
const lado = (m2: number) => Math.sqrt(m2);
const cm = (m: number) => `${Math.round(m * 100)} cm`;

export const HISTORIAS: Historia[] = [
  {
    id: "movilidad-mayores",
    numero: 1,
    titulo: "Moverse por el barrio",
    pregunta: "¿Qué tan fácil es llegar a pie a donde necesitamos ir?",
    frase: "Caminar hasta el Metro no es igual para todos.",
    situacion: [
      "Santa Cruz está construido sobre una ladera: sus calles suben, bajan y a veces se vuelven escaleras. En un terreno así, un trayecto que en un plano parece corto puede tomar bastante más tiempo.",
      "Para saber cuánto, OTEA calculó cuántos minutos camina cada manzana hasta la estación de Metro, Metrocable o Metroplús más cercana, y lo cruzó con el Censo 2018 para mirar a las personas de 60 años o más.",
    ],
    porQue: [
      "La estación es la puerta al resto del Valle de Aburrá. Mientras más largo y empinado es el camino, más cuesta salir y volver, sobre todo si se camina despacio o con peso.",
    ],
    noSabemos: [
      "Los minutos son un cálculo de OTEA: la velocidad baja con la pendiente, pero no se ajustó a personas mayores. Quien camina más despacio tardaría más.",
      "No sabemos cuántas personas mayores usan el Metro ni cuántas tienen dificultad para moverse.",
      "Los andenes y las escaleras no se midieron en terreno: vienen de un inventario de la Alcaldía y de OpenStreetMap.",
    ],
    foto: "aniversario",
    fotosExtra: ["calle"],
    vemos: "Así son muchas calles de la comuna: en pendiente, con andenes que cambian de ancho y carros parqueados a un lado. La foto muestra el tipo de terreno; no mide cuánto tarda nadie en subirla.",
    color: ACENTOS.vial.medio,
    cifra: (c) => {
      const p = (c.comuna.mayores_lejos_10 / c.comuna.mayores_60) * 100;
      return {
        valor: num(c.comuna.mayores_lejos_10),
        texto: `de las ${num(c.comuna.mayores_60)} personas de 60 años o más de la comuna viven a más de 10 minutos caminando de una estación`,
        traduccion: `Es decir, unas ${Math.round(p / 10)} de cada 10. Y ${num(c.comuna.mayores_lejos_15)} viven a más de 15 minutos.`,
        otras: [
          `No es solo de las personas mayores: de toda la comuna, apenas ${dec(c.comuna.metro_10min_pct_todos)} % llega en 10 minutos, y el promedio es de ${dec(c.comuna.metro_promedio_min_todos)} minutos.`,
        ],
      };
    },
    mapa: {
      etiqueta: "Personas mayores lejos del Metro",
      valor: (b) => (b.mayores_60 ? (b.mayores_lejos_10 / b.mayores_60) * 100 : null),
      unidad: "% de las personas mayores",
      leyenda: "Más oscuro: más personas mayores viven a más de 10 minutos caminando de una estación.",
      formato: (v) => `${Math.round(v)} %`,
    },
    ficha: (b) => [
      `En ${b.nombre} viven ${num(b.mayores_60)} personas de 60 años o más.`,
      `${b.mayores_lejos_10 === b.mayores_60 ? "Todas" : `${num(b.mayores_lejos_10)} de ellas`} están a más de 10 minutos caminando de una estación${b.min_metro_mayores != null ? `; el tiempo promedio estimado es de ${dec(b.min_metro_mayores)} minutos` : ""}.`,
    ],
    compartir: (c) =>
      `En Santa Cruz viven ${num(c.comuna.mayores_60)} personas de 60 años o más y ${num(c.comuna.mayores_lejos_10)} de ellas están a más de 10 minutos caminando de una estación de Metro (cálculo de OTEA con datos del Censo 2018 y la Alcaldía de Medellín). Mira cómo está tu barrio:`,
    fuentes: [{ ids: ["manzanas_censo", "vias", "estaciones"], calculo: "tiempo de caminata calculado por OTEA" }],
    tecnica: [
      { to: "/accesibilidad", texto: "Ver los datos y cómo se calcularon" },
      { to: "/mapa-vecinos?pregunta=metro", texto: "Ver estaciones y paraderos en el mapa del barrio" },
    ],
    metodo:
      "Cada manzana del Censo 2018 camina hasta la estación más cercana por la red de calles, andenes y escaleras, con la fórmula de Tobler (la velocidad baja con la pendiente; unos 5 km/h en plano). Se suman las personas de 60 años o más de las manzanas que quedan a más de 10 minutos. Es un modelo, no un recorrido medido.",
  },
  {
    id: "basuras",
    numero: 2,
    titulo: "Las basuras que nos rodean",
    pregunta: "¿Cuánta basura generamos y qué falta saber para actuar?",
    frase: "Lo que botamos cada día suma toneladas.",
    situacion: [
      "Todos los días se recogen residuos en la comuna. Cuando se acumulan en una esquina, un andén o una quebrada, se ven y afectan el paso y el aseo del barrio.",
      "Emvarias y EPM entregaron al proyecto las toneladas de residuos de la comuna. OTEA las sumó por barrio para ver cuánto se estima que genera cada uno.",
    ],
    porQue: [
      "Saber cuánto pesa lo que se recoge en cada barrio es el primer paso para pedir una recolección que se ajuste a lo que de verdad se genera. Hoy, sin ese dato, se decide a ojo.",
    ],
    noSabemos: [
      "Las toneladas son una estimación mensual por barrio a partir de datos que entregaron Emvarias y EPM; no son pesajes medidos barrio por barrio.",
      "No sabemos qué tipo de residuo es (orgánico, reciclable, escombros) ni si viene de casas o de negocios.",
      "OTEA solo publica toneladas por barrio, no rutas, horarios ni puntos de recolección.",
      "Que un barrio genere más toneladas no quiere decir que lo maneje peor: también puede tener más gente.",
    ],
    foto: "pasaje",
    fotosExtra: ["rio"],
    vemos: "Un contenedor en un pasaje y residuos en la orilla del río. Son escenas de 2015 que ayudan a ubicar el tema; no prueban que hoy haya basura acumulada en esos puntos.",
    color: ACENTOS.petroleo.medio,
    cifra: (c) => {
      const kg = Math.round(c.comuna.residuos_kg_persona_dia * 10) / 10;
      return {
        valor: num(Math.round(c.comuna.residuos_t_mes)),
        texto: "toneladas de residuos al mes se estima que genera la comuna",
        traduccion: `Son unas ${num(Math.round(c.comuna.residuos_t_dia))} toneladas cada día: unos ${dec(kg)} kg por persona, lo que pesa una botella de agua de ${num(kg * 1000)} ml.`,
        otras: [
          `Promedio mensual entre ${mes(c.comuna.residuos_periodo.desde)} y ${mes(c.comuna.residuos_periodo.hasta)}.`,
          `Además, desde ${c.comuna.quebradas.desde.slice(0, 4)} se han hecho ${num(c.comuna.quebradas.basuras)} solicitudes por basuras o escombros en las quebradas de la comuna (de ${num(c.comuna.quebradas.total)} solicitudes sobre quebradas).`,
        ],
      };
    },
    mapa: {
      etiqueta: "Toneladas de residuos",
      valor: (b) => b.residuos_t_mes,
      unidad: "toneladas al mes",
      leyenda: "Más oscuro: más toneladas de residuos al mes. Un barrio con más gente genera más.",
      formato: (v) => `${num(Math.round(v))} t`,
    },
    ficha: (b) => [
      `Se estima que ${b.nombre} genera ${b.residuos_t_mes != null ? num(Math.round(b.residuos_t_mes)) : "—"} toneladas de residuos al mes${b.residuos_kg_persona_dia != null ? `, unos ${dec2(b.residuos_kg_persona_dia)} kg por persona al día` : ""}.`,
      ...(b.basuras_quebradas > 0 ? [`Hay ${num(b.basuras_quebradas)} ${b.basuras_quebradas === 1 ? "solicitud" : "solicitudes"} por basuras o escombros en quebradas del barrio.`] : []),
    ],
    compartir: (c) =>
      `Se estima que la Comuna 2 de Medellín genera unas ${num(Math.round(c.comuna.residuos_t_mes))} toneladas de residuos al mes, unos ${dec(Math.round(c.comuna.residuos_kg_persona_dia * 10) / 10)} kg por persona al día (cálculo de OTEA con datos entregados por Emvarias y EPM, de ${mes(c.comuna.residuos_periodo.desde)} a ${mes(c.comuna.residuos_periodo.hasta)}). Mira cómo está tu barrio:`,
    fuentes: [
      { ids: ["residuos_toneladas_barrio"], texto: "Emvarias y EPM (datos entregados al proyecto, no abiertos)" },
      { ids: ["solicitudes_quebradas"], clase: "ciudadano", texto: "Alcaldía de Medellín, solicitudes sobre quebradas (SIRO)" },
    ],
    tecnica: [
      { to: "/residuos", texto: "Ver las toneladas por barrio y el método" },
      { to: "/mapa-vecinos?pregunta=quebradas", texto: "Ver lo que se ha pedido sobre las quebradas en el mapa" },
    ],
    metodo:
      "Toneladas por mes por barrio, estimadas por OTEA a partir de los pesajes que entregaron Emvarias y EPM para el periodo indicado. Los kilos por persona dividen las toneladas entre la población del Censo 2018 de cada barrio y entre los días del mes. La comparación con una botella de agua es solo de peso (1 litro de agua pesa 1 kg).",
  },
  {
    id: "huecos",
    numero: 3,
    titulo: "Calles y andenes en mal estado",
    pregunta: "¿Qué se ha reportado y qué tan rápido se arregla?",
    frase: "Un hueco lo ve todo el barrio. ¿Qué pasa después de reportarlo?",
    situacion: [
      "Un hueco o un andén roto estorba a quien camina, a quien maneja y a quien se mueve en silla de ruedas o con un coche de bebé.",
      "La Alcaldía guarda los reportes de huecos que llegan por ReportesMED y otros canales. OTEA los contó por barrio y miró cuánto tardan en cerrarse.",
    ],
    porQue: [
      "Cada reporte es alguien que avisó. Saber cuánto tarda en llegar el arreglo, y en qué barrios se acumulan los pendientes, sirve para pedir con argumentos.",
    ],
    noSabemos: [
      "Los reportes cuentan avisos, no huecos: un mismo hueco puede estar reportado varias veces y hay huecos que nadie ha reportado.",
      "El estado “pendiente” es el que figura en la base de la Alcaldía; no sabemos si el hueco sigue ahí.",
      "Un barrio con más reportes no necesariamente tiene más huecos: puede tener más gente que reporta.",
      "Los andenes angostos no son lo mismo que andenes en mal estado: el inventario mide el ancho, no el estado.",
    ],
    foto: "callejon-tierra",
    fotosExtra: ["pasaje"],
    vemos: "Una calle de tierra y un pasaje estrecho: así se camina en varios sectores. Las fotos son de 2015 y no corresponden a reportes de huecos concretos.",
    color: ACENTOS.ambar.medio,
    cifra: (c) => {
      const h = c.comuna.huecos;
      return {
        valor: num(h.total),
        texto: `reportes de huecos se han registrado en la comuna desde ${mes(h.desde)}`,
        traduccion: `En promedio, más de ${Math.floor(h.por_dia)} cada día. ${num(h.arreglados)} figuran como arreglados y ${num(h.pendientes)} siguen pendientes; los demás se descartaron (${num(h.descartados)}) o estaban repetidos (${num(h.duplicados)}).`,
        otras: [
          `Los arreglados tardaron una mediana de ${num(h.dias_mediana)} días, pero 1 de cada 10 tardó ${num(h.dias_p90)} días o más.`,
          `En los andenes, ${dec(c.comuna.andenes.angostos_pct)} % del largo inventariado (${dec(c.comuna.andenes.km)} km) mide menos de ${dec(c.comuna.andenes.umbral_m)} m, el ancho que OTEA toma como referencia para pasar cómodo.`,
        ],
      };
    },
    mapa: {
      etiqueta: "Huecos reportados",
      valor: (b) => b.huecos_total,
      unidad: "reportes desde 2020",
      leyenda: "Más oscuro: más reportes de huecos desde 2020. Un barrio con más gente reporta más.",
      formato: (v) => num(v),
    },
    ficha: (b) => [
      `En ${b.nombre} se han reportado ${b.huecos_total != null ? num(b.huecos_total) : "—"} huecos desde 2020: ${b.huecos_arreglados != null ? num(b.huecos_arreglados) : "—"} figuran como arreglados y ${b.huecos_pendientes != null ? num(b.huecos_pendientes) : "—"} como pendientes.`,
      ...(b.andenes_angostos_pct != null ? [`${dec(b.andenes_angostos_pct)} % de sus andenes inventariados miden menos de 1,2 m de ancho.`] : []),
    ],
    compartir: (c) =>
      `Desde ${mes(c.comuna.huecos.desde)} se han reportado ${num(c.comuna.huecos.total)} huecos en la Comuna 2 de Medellín: ${num(c.comuna.huecos.arreglados)} figuran como arreglados y ${num(c.comuna.huecos.pendientes)} siguen pendientes, según la base de la Alcaldía (resumen de OTEA). Mira cómo está tu barrio:`,
    fuentes: [
      { ids: ["huecos"], clase: "ciudadano", texto: "Alcaldía de Medellín, Sistema de Gestión Vial (reportes ciudadanos)" },
      { ids: ["andenes"], texto: "Secretaría de Movilidad, inventario de andenes" },
    ],
    tecnica: [
      { to: "/reclamos", texto: "Ver los reportes, los tiempos y los pendientes" },
      { to: "/mapa-vecinos?pregunta=huecos", texto: "Ver los huecos reportados en el mapa del barrio" },
    ],
    metodo:
      "Se cuentan los reportes de huecos de la Comuna 2 que publica la Alcaldía, por barrio y por estado. Los días de arreglo se miden desde que se reporta hasta que figura como arreglado (mediana: la mitad tardó eso o menos). Los andenes angostos son tramos de menos de 1,2 m de ancho en el inventario de la Secretaría de Movilidad; 1,2 m es una referencia de OTEA, no una norma verificada.",
  },
  {
    id: "espacio-publico",
    numero: 4,
    titulo: "Espacios para encontrarnos",
    pregunta: "¿Cuánto espacio público nos toca a cada persona?",
    frase: "¿Cuánto espacio nos toca para encontrarnos?",
    situacion: [
      "Los parques, las plazas y las canchas son lugares donde los vecinos se encuentran y los niños juegan. Para saber cuánto hay, se suma el espacio público existente y se divide entre la gente que vive en el barrio.",
    ],
    porQue: [
      "Donde hay poco espacio público quedan pocos lugares cerca para jugar, hacer deporte o simplemente sentarse. Por eso es un dato que se compara con una referencia: 15 m² por persona.",
    ],
    noSabemos: [
      "Usamos la capa de espacio público existente de la Alcaldía (datos de diciembre de 2014) con la población del Censo 2018: son años distintos y los barrios han cambiado.",
      "No es el indicador oficial de espacio público efectivo: no separa parques y plazas de otros tipos de espacio.",
      "No sabemos si esos lugares se sienten seguros o cómodos: eso solo lo pueden contar quienes los usan.",
    ],
    foto: "laderas",
    fotosExtra: ["aniversario"],
    vemos: "La ladera está casi toda construida: quedan pocos espacios abiertos entre las casas. Por eso muchas veces la calle hace de plaza, como en un aniversario del barrio.",
    color: ACENTOS.musgo.medio,
    cifra: (c) => {
      const e = c.comuna.espacio_m2_hab;
      return {
        valor: `${dec2(e)} m²`,
        texto: "de espacio público le tocan a cada persona de la comuna",
        traduccion: `Es un cuadrado de unos ${cm(lado(e))} de lado. La referencia nacional, 15 m² por persona, sería un cuadrado de ${dec(lado(15))} metros de lado.`,
        otras: [],
      };
    },
    mapa: {
      etiqueta: "Espacio público por persona",
      valor: (b) => b.espacio_m2_hab,
      invertir: true,
      unidad: "m² por persona",
      leyenda: "Más oscuro: menos espacio público por persona.",
      formato: (v) => `${dec2(v)} m²`,
    },
    ficha: (b) => [
      `En ${b.nombre} le tocan ${b.espacio_m2_hab != null ? dec2(b.espacio_m2_hab) : "—"} m² de espacio público a cada persona${b.espacio_m2_hab != null ? `, un cuadrado de unos ${cm(lado(b.espacio_m2_hab))} de lado` : ""}. La referencia nacional es de 15 m².`,
    ],
    compartir: (c) =>
      `En la Comuna 2 de Medellín le tocan ${dec2(c.comuna.espacio_m2_hab)} m² de espacio público a cada persona; la referencia nacional es de 15 m² (cálculo de OTEA con datos de la Alcaldía y el Censo 2018). Mira cómo está tu barrio:`,
    fuentes: [{ ids: ["espacio_publico", "manzanas_censo"], calculo: "m² por habitante calculado por OTEA" }],
    tecnica: [
      { to: "/indicadores", texto: "Comparar barrios cifra por cifra" },
      { to: "/mapa-vecinos?pregunta=parques", texto: "Ver parques y canchas en el mapa del barrio" },
    ],
    metodo:
      "Suma de los metros cuadrados de la capa de espacio público existente (Alcaldía, datos de diciembre de 2014) dividida entre la población del Censo 2018. La referencia de 15 m² por habitante es la que usa el sitio en todas sus páginas. La equivalencia en cuadrados es solo geométrica: la raíz cuadrada del área.",
  },
];

export const historiaPorId = (id: string | undefined) => HISTORIAS.find((h) => h.id === id);

/** Qué puede hacer cada persona, sin prometer lo que OTEA no hace. */
export const HACER: Record<IdHistoria, { titulo: string; texto: string; to?: string; externo?: string }[]> = {
  "movilidad-mayores": [
    { titulo: "Conversarlo con tus vecinos", texto: "¿Qué tramo del camino a la estación se hace más difícil? Cuéntaselo a la JAC: una cifra y un lugar concreto ayudan a pedir mejor." },
    { titulo: "Llevar la cifra a la JAC o la JAL", texto: "El Kit para líderes trae cifras, una carta de derecho de petición y los plazos de respuesta.", to: "/lideres" },
    { titulo: "Dejar tu opinión", texto: "En Participa puedes escribir qué tramo te preocupa. Es una prueba: todavía no llega a ninguna entidad.", to: "/participacion" },
  ],
  basuras: [
    { titulo: "Mirar las toneladas de tu barrio", texto: "Con la cifra a la mano es más fácil conversar con la JAC sobre qué tan frecuente o suficiente es la recolección." },
    { titulo: "Llevarlo a una reunión", texto: "El Kit para líderes explica cómo pedir información o una solicitud por escrito a la Alcaldía.", to: "/lideres" },
    { titulo: "Cuéntanos qué ves", texto: "En Participa puedes dejar un comentario. Es una prueba: no reemplaza un reporte a la Alcaldía.", to: "/participacion" },
  ],
  huecos: [
    { titulo: "Reportarlo por el canal oficial", texto: "ReportesMED es la aplicación de la Alcaldía para reportar huecos. Un reporte que no llega a ese sistema no genera una respuesta oficial.", externo: "https://www.medellin.gov.co/es/sala-de-prensa/noticias/con-reportesmed-ciudadanos-podran-reportar-escombros-huecos-en-las-calles-y-danos-en-luminarias/" },
    { titulo: "Ver si ya lo reportaron", texto: "En el módulo de reclamos se ven los reportes por barrio y cuánto llevan esperando.", to: "/reclamos" },
    { titulo: "Si pasa mucho tiempo", texto: "Una carta de derecho de petición exige una respuesta con plazo. El Kit para líderes tiene un modelo.", to: "/lideres" },
  ],
  "espacio-publico": [
    { titulo: "Contar cómo usas los espacios", texto: "¿Qué parque o cancha usas? ¿Cuál evitas? Eso no sale en los datos y solo lo saben quienes viven aquí." },
    { titulo: "Llevarlo al Presupuesto Participativo", texto: "El Kit para líderes explica cómo funciona y cómo presentar una idea con cifras.", to: "/lideres" },
    { titulo: "Ver qué obra ayudaría a más gente", texto: "El módulo de prioridades ordena posibles obras de espacio público según cuánta gente beneficiarían.", to: "/prioridades" },
  ],
};

/** Resumen de una línea por tema para un barrio, en palabras sencillas (portada: "¿Y en tu barrio?"). */
export function resumenBarrio(b: BarrioCiu) {
  const todas = b.mayores_60 > 0 && b.mayores_lejos_10 === b.mayores_60;
  return [
    { id: "movilidad-mayores" as const, titulo: "Moverse", texto: b.mayores_60 === 0 ? "No hay datos de personas mayores en este barrio." : `${todas ? "Todas las" : `${num(b.mayores_lejos_10)} de las`} ${num(b.mayores_60)} personas de 60 años o más viven a más de 10 minutos caminando del Metro.` },
    { id: "basuras" as const, titulo: "Basuras", texto: `Se estima que genera ${b.residuos_t_mes != null ? num(Math.round(b.residuos_t_mes)) : "—"} toneladas de residuos al mes.` },
    { id: "huecos" as const, titulo: "Huecos", texto: `Tiene ${b.huecos_total != null ? num(b.huecos_total) : "—"} reportes de huecos desde 2020; ${b.huecos_pendientes != null ? num(b.huecos_pendientes) : "—"} siguen pendientes.` },
    { id: "espacio-publico" as const, titulo: "Espacio", texto: `Le tocan ${b.espacio_m2_hab != null ? dec2(b.espacio_m2_hab) : "—"} m² de espacio público a cada persona.` },
  ];
}
