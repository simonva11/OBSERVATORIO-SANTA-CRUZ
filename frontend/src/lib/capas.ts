import type { Props } from "./tipos";
import { cop, dec, fecha, num, texto } from "./formato";

export type Geometria = "punto" | "linea" | "poligono";
export type Formato = (v: unknown, p: Props) => string;

export interface ItemLeyenda {
  color: string;
  etiqueta: string;
  forma?: "punto" | "linea" | "area" | "borde";
}

export type TemaId = "transporte" | "caminar" | "colegios" | "comunidad" | "parques" | "riesgo" | "accidentes" | "plan" | "personas" | "vivienda" | "seguridad" | "corredor" | "misdatos" | "reclamos";

export interface DefCapa {
  id: string; // nombre del archivo en /data para Santa Cruz
  nombre: string;
  tema: TemaId;
  fuente: string; // id en fuentes.json
  archivoCiudad?: string; // si existe, la capa también se ve en "Toda Medellín"
  descripcion: string;
  geometria: Geometria;
  titulo: (p: Props) => string;
  campos: [string, string, Formato?][];
  leyenda: ItemLeyenda[];
  nota?: string;
}

export const COLOR = {
  tinta: "#1d2b2a",
  tintaSuave: "#4a5958",
  ladera: "#2d6a4f",
  laderaHondo: "#1f4d39",
  cable: "#24598a",
  ladrillo: "#a8452b",
  ambar: "#b7791f",
  nivel: "#d4d9cf",
  papel: "#f5f6f2",
};

export const DOMINIOS_OBRA: Record<string, string> = {
  "Malla vial": "#24598a",
  "Mitigación y Estabilización": "#b8641f",
  "Corredores Peatonales": "#7a4e9b",
  "Puentes": "#4a5958",
  "Espacio Público Efectivo": "#2d6a4f",
};
export const COLOR_OBRA_OTRO = "#8b9795";
export const COLOR_HUECO_PENDIENTE = "#c2412d";
export const COLOR_HUECO_ARREGLADO = "#2d6a4f";

export const GRUPOS_EQUIPAMIENTO: Record<string, string> = {
  Educación: "#24598a",
  Salud: "#c2412d",
  "Primera infancia": "#d08a1c",
  "Deporte y recreación": "#2d6a4f",
  Cultura: "#7a4e9b",
  "Seguridad y justicia": "#4a5958",
  Culto: "#8a7656",
  Comunitario: "#2f8a83",
  Transporte: "#1d2b2a",
  "Infraestructura de servicios": "#9a8f80",
  "Otro o sin nombre": "#a3aba7",
};

export const TRATAMIENTOS: Record<string, string> = {
  "Consolidación Nivel 2": "#7fb59a",
  "Consolidación Nivel 3": "#c9a75d",
  "Renovación Urbana": "#b9706a",
  "Mejoramiento Integral en Suelo Urbano": "#8c6bb1",
  "Áreas de Preservación de Infraestructuras y del Sistema Público y Colectivo": "#7f9db9",
};

export const AMENAZA: Record<string, string> = { Alta: "#a8452b", Media: "#d39b3a", Baja: "#efe2b0" };

export const LINEAS_METRO: Record<string, string> = {
  "Línea A": "#2d6a4f",
  "Línea B": "#2d6a4f",
  "Línea K": "#c98a1a",
  "Línea J": "#c98a1a",
  "Línea H": "#c98a1a",
  "Línea M": "#c98a1a",
  "Línea L": "#8a7656",
  "Línea P": "#7a4e9b",
  "Línea 1": "#24598a",
  "Línea 2": "#4f86b8",
  "Línea O": "#2f8a83",
  "Línea T-A": "#b03a5b",
};

const siNo = (v: unknown) => (v ? "Sí" : "No");
const dias = (v: unknown) => (typeof v === "number" ? `${num(v)} ${v === 1 ? "día" : "días"}` : "Sin dato");
const fechaTxt = (v: unknown) => (typeof v === "string" ? fecha(v) : "Sin dato");
const m2 = (v: unknown) => (typeof v === "number" ? `${num(Math.round(v))} m²` : "Sin dato");

export const CAPAS: DefCapa[] = [
  // Transporte
  {
    id: "estaciones",
    nombre: "Estaciones de Metro, Metrocable y Metroplús",
    tema: "transporte",
    fuente: "estaciones",
    archivoCiudad: "estaciones_ciudad",
    descripcion: "Estaciones del sistema Metro.",
    geometria: "punto",
    titulo: (p) => `Estación ${texto(p.nombre)}`,
    campos: [["linea", "Línea"], ["modo", "Sistema"], ["barrio", "Barrio"], ["comuna", "Comuna"]],
    leyenda: [
      { color: LINEAS_METRO["Línea A"], etiqueta: "Metro", forma: "punto" },
      { color: LINEAS_METRO["Línea K"], etiqueta: "Metrocable K", forma: "punto" },
      { color: LINEAS_METRO["Línea P"], etiqueta: "Metrocable P", forma: "punto" },
      { color: LINEAS_METRO["Línea 1"], etiqueta: "Metroplús", forma: "punto" },
    ],
  },
  {
    id: "lineas_transporte",
    nombre: "Líneas de Metro y cable",
    tema: "transporte",
    fuente: "lineas_transporte",
    archivoCiudad: "lineas_ciudad",
    descripcion: "Recorrido de las líneas del sistema Metro.",
    geometria: "linea",
    titulo: (p) => `${texto(p.linea)}: ${texto(p.nombre)}`,
    campos: [["linea", "Línea"], ["nombre", "Recorrido"]],
    leyenda: [{ color: COLOR.cable, etiqueta: "Línea del sistema Metro", forma: "linea" }],
  },
  {
    id: "rutas_bus",
    nombre: "Rutas de bus",
    tema: "transporte",
    fuente: "rutas_bus",
    descripcion: "Recorridos de transporte público colectivo que pasan por la comuna.",
    geometria: "linea",
    titulo: (p) => `Ruta ${texto(p.codigo)}: ${texto(p.nombre)}`,
    campos: [["codigo", "Código"], ["tipo", "Tipo"], ["empresa", "Empresa"]],
    leyenda: [{ color: "#2f6fb0", etiqueta: "Ruta de bus", forma: "linea" }],
  },
  {
    id: "paradas",
    nombre: "Paradas de bus",
    tema: "transporte",
    fuente: "paradas",
    descripcion: "Paraderos reglamentarios con las rutas que paran en cada uno.",
    geometria: "punto",
    titulo: (p) => `Parada: ${texto(p.direccion)}`,
    campos: [["direccion", "Dirección"], ["n_rutas", "Rutas que paran", (v) => num(v as number)], ["rutas", "Rutas"]],
    leyenda: [{ color: "#4f86b8", etiqueta: "Parada de bus", forma: "punto" }],
  },
  // Caminar: andenes, escaleras y ciclorrutas
  {
    id: "andenes",
    nombre: "Andenes (inventario oficial)",
    tema: "caminar",
    fuente: "andenes",
    descripcion: "Tramos de andén inventariados por la Alcaldía, coloreados por su ancho.",
    geometria: "linea",
    titulo: (p) => `Andén de ${p.ancho_m != null ? `${dec(p.ancho_m as number)} m` : "ancho sin dato"}`,
    campos: [
      ["ancho_m", "Ancho", (v) => (v == null ? "Sin dato" : `${dec(v as number)} m`)],
      ["largo_m", "Largo del tramo", (v) => `${num(Math.round(v as number))} m`],
      ["obstaculo", "Valor del campo obstáculo"],
      ["estado_cod", "Código de estado (sin diccionario publicado)"],
      ["barrio", "Barrio"],
    ],
    leyenda: [
      { color: "#a8452b", etiqueta: "Menos de 1,2 m", forma: "linea" },
      { color: "#d39b3a", etiqueta: "1,2 a 2 m", forma: "linea" },
      { color: "#2d6a4f", etiqueta: "2 m o más", forma: "linea" },
    ],
    nota: "La fuente trae códigos de estado y material sin su significado publicado, por eso solo se usa el ancho.",
  },
  {
    id: "escaleras_osm",
    nombre: "Escaleras y senderos (OpenStreetMap)",
    tema: "caminar",
    fuente: "osm_caminos",
    descripcion: "Escaleras, senderos y pasajes peatonales mapeados por la comunidad de OpenStreetMap.",
    geometria: "linea",
    titulo: (p) => (p.tipo === "steps" ? "Escaleras" : p.tipo === "pedestrian" ? "Vía peatonal" : "Sendero o andén"),
    campos: [["tipo", "Tipo en OpenStreetMap"]],
    leyenda: [
      { color: "#7a4e9b", etiqueta: "Escaleras", forma: "linea" },
      { color: "#8a7656", etiqueta: "Sendero o pasaje", forma: "linea" },
    ],
    nota: "Dato abierto de terceros (© colaboradores de OpenStreetMap, licencia ODbL). Puede estar incompleto.",
  },
  {
    id: "red_ciclista",
    nombre: "Ciclorrutas",
    tema: "caminar",
    fuente: "red_ciclista",
    descripcion: "Red ciclista oficial de Medellín en el entorno de la comuna.",
    geometria: "linea",
    titulo: (p) => texto(p.nombre_ciclorruta),
    campos: [["tipologia_redciclista", "Tipología"], ["estado", "Estado"], ["anio_construido", "Año de construcción"]],
    leyenda: [{ color: "#16917f", etiqueta: "Ciclorruta", forma: "linea" }],
  },
  {
    id: "red_peatonal_pot",
    nombre: "Red peatonal del POT",
    tema: "caminar",
    fuente: "red_peatonal_pot",
    descripcion: "Andenes y corredores peatonales que el POT reconoce o proyecta.",
    geometria: "linea",
    titulo: (p) => `${texto(p.tipo)} (${texto(p.estado)})`,
    campos: [["tipo", "Tipo"], ["estado", "Estado en el POT"], ["jerarquia", "Jerarquía"]],
    leyenda: [
      { color: "#5b4a8a", etiqueta: "Existente", forma: "linea" },
      { color: "#a99bd0", etiqueta: "Proyectado", forma: "linea" },
    ],
  },
  // Colegios
  {
    id: "sedes_educativas",
    nombre: "Colegios y sedes educativas",
    tema: "colegios",
    fuente: "sedes_educativas",
    archivoCiudad: "sedes_educativas_ciudad",
    descripcion: "Sedes oficiales y privadas de la Secretaría de Educación.",
    geometria: "punto",
    titulo: (p) => texto(p.nombre),
    campos: [
      ["establecimiento", "Establecimiento"],
      ["sector", "Sector"],
      ["servicio", "Servicio"],
      ["direccion", "Dirección"],
      ["barrio", "Barrio"],
      ["comuna", "Comuna"],
    ],
    leyenda: [
      { color: COLOR.cable, etiqueta: "Colegio oficial", forma: "punto" },
      { color: "#7fa6cc", etiqueta: "Colegio no oficial", forma: "punto" },
    ],
  },
  // Salud y comunidad
  {
    id: "equipamientos",
    nombre: "Salud, comunidad y otros equipamientos",
    tema: "comunidad",
    fuente: "equipamientos",
    archivoCiudad: "equipamientos_ciudad",
    descripcion: "Centros de salud, sedes comunitarias, policía, iglesias y demás equipamientos.",
    geometria: "poligono",
    titulo: (p) => texto(p.nombre),
    campos: [
      ["grupo", "Tipo (según su nombre)"],
      ["categoria", "Categoría oficial"],
      ["tipo", "Detalle"],
      ["nivel", "Cobertura"],
      ["barrio", "Barrio"],
      ["comuna", "Comuna"],
      ["en_comuna", "Dentro de Santa Cruz", siNo],
    ],
    leyenda: ["Salud", "Educación", "Primera infancia", "Comunitario", "Deporte y recreación", "Cultura", "Seguridad y justicia", "Culto"].map(
      (g) => ({ color: GRUPOS_EQUIPAMIENTO[g], etiqueta: g, forma: "area" as const }),
    ),
    nota: "El tipo se asigna con una regla por palabras del nombre, porque la capa oficial no lo trae para muchos equipamientos.",
  },
  // Parques y deporte
  {
    id: "espacio_publico",
    nombre: "Parques y zonas verdes",
    tema: "parques",
    fuente: "espacio_publico",
    archivoCiudad: "espacio_publico_ciudad",
    descripcion: "Espacio público existente: parques, zonas verdes, plazas y ecoparques.",
    geometria: "poligono",
    titulo: (p) => texto(p.nombre ?? p.categoria),
    campos: [["categoria", "Categoría"], ["subcategoria", "Subcategoría"], ["nivel", "Cobertura"], ["comuna", "Comuna"]],
    leyenda: [{ color: "#5aa37c", etiqueta: "Parque o zona verde", forma: "area" }],
  },
  {
    id: "escenarios_deportivos",
    nombre: "Canchas y escenarios deportivos",
    tema: "parques",
    fuente: "escenarios_deportivos",
    archivoCiudad: "escenarios_deportivos_ciudad",
    descripcion: "Escenarios del INDER.",
    geometria: "punto",
    titulo: (p) => texto(p.nombre),
    campos: [["tipologia", "Tipo de escenario"], ["equipamiento", "Lugar"], ["direccion", "Dirección"], ["barrio", "Barrio"], ["comuna", "Comuna"]],
    leyenda: [{ color: COLOR.ladera, etiqueta: "Cancha o escenario", forma: "punto" }],
  },
  {
    id: "bibliotecas",
    nombre: "Bibliotecas",
    tema: "parques",
    fuente: "bibliotecas",
    archivoCiudad: "bibliotecas_ciudad",
    descripcion: "Red de Bibliotecas de Medellín.",
    geometria: "punto",
    titulo: (p) => texto(p.nombre),
    campos: [["tipo", "Tipo"], ["direccion", "Dirección"], ["horario", "Horario"], ["comuna", "Comuna"]],
    leyenda: [{ color: "#7a4e9b", etiqueta: "Biblioteca", forma: "punto" }],
  },
  {
    id: "espacio_publico_proyectado",
    nombre: "Parques que propone el POT",
    tema: "parques",
    fuente: "espacio_publico_proyectado",
    descripcion: "Espacio público proyectado por el Plan de Ordenamiento Territorial.",
    geometria: "poligono",
    titulo: (p) => texto(p.nombre),
    campos: [["categoria", "Categoría"], ["barrio", "Barrio"], ["area_m2", "Área", m2]],
    leyenda: [{ color: COLOR.laderaHondo, etiqueta: "Parque propuesto por el POT", forma: "borde" }],
    nota: "Que esté en el POT no significa que tenga presupuesto ni fecha de construcción.",
  },
  // Riesgo
  {
    id: "amenaza_movimiento_masa",
    nombre: "Amenaza de deslizamiento",
    tema: "riesgo",
    fuente: "amenaza_movimiento_masa",
    descripcion: "Probabilidad de deslizamientos según el POT.",
    geometria: "poligono",
    titulo: (p) => `Amenaza ${texto(p.grado).toLowerCase()} de deslizamiento`,
    campos: [["grado", "Grado de amenaza"], ["categoria", "Categoría"]],
    leyenda: [
      { color: AMENAZA.Alta, etiqueta: "Amenaza alta", forma: "area" },
      { color: AMENAZA.Media, etiqueta: "Amenaza media", forma: "area" },
      { color: AMENAZA.Baja, etiqueta: "Amenaza baja", forma: "area" },
    ],
  },
  {
    id: "riesgo_no_mitigable",
    nombre: "Zonas con condición de riesgo",
    tema: "riesgo",
    fuente: "riesgo_no_mitigable",
    descripcion: "Zonas con condiciones de riesgo y alto riesgo no mitigable.",
    geometria: "poligono",
    titulo: (p) => texto(p.riesgo),
    campos: [["riesgo", "Condición"], ["tipo_amenaza", "Amenaza"], ["descripcion", "Descripción"]],
    leyenda: [{ color: "#7d2a18", etiqueta: "Alto riesgo no mitigable", forma: "borde" }],
  },
  // Reclamos de la ciudadanía
  {
    id: "huecos",
    nombre: "Huecos reportados",
    tema: "reclamos",
    fuente: "huecos",
    descripcion: "Reportes de huecos en la vía hechos por la ciudadanía (ReportesMED y otros canales) y si ya se arreglaron.",
    geometria: "punto",
    titulo: (p) => (p.estado === "Pendiente" ? "Hueco pendiente de arreglar" : "Hueco arreglado"),
    campos: [
      ["barrio", "Barrio"],
      ["reportado", "Reportado el", fechaTxt],
      ["espera", "Lleva esperando", dias],
      ["arreglado", "Arreglado el", fechaTxt],
      ["dias", "Tardó en arreglarse", dias],
      ["prioridad", "Prioridad asignada"],
      ["origen", "Canal del reporte"],
      ["costo_cop", "Valor registrado de la obra", (v) => (typeof v === "number" ? cop(v) : "Sin dato")],
    ],
    leyenda: [
      { color: COLOR_HUECO_PENDIENTE, etiqueta: "Pendiente de arreglar", forma: "punto" },
      { color: COLOR_HUECO_ARREGLADO, etiqueta: "Ya arreglado", forma: "punto" },
    ],
    nota: "Cada punto es un reporte, no necesariamente un hueco distinto. No se dibujan los reportes descartados ni los duplicados. Un hueco marcado como arreglado no dice cuánto duró el arreglo.",
  },
  {
    id: "solicitudes_obras",
    nombre: "Obras pedidas a la Alcaldía",
    tema: "reclamos",
    fuente: "solicitudes_obras",
    descripcion: "Solicitudes de obra en vías, andenes, pasamanos, puentes y laderas registradas por Infraestructura Física.",
    geometria: "punto",
    titulo: (p) => texto(p.tipo),
    campos: [
      ["dominio", "Tipo de obra"],
      ["estado", "Estado"],
      ["barrio", "Barrio"],
      ["fecha", "Fecha de la solicitud", fechaTxt],
      ["origen", "Quién la pidió"],
    ],
    leyenda: [...Object.entries(DOMINIOS_OBRA).map(([etiqueta, color]) => ({ color, etiqueta, forma: "punto" as const })), { color: COLOR_OBRA_OTRO, etiqueta: "Otras solicitudes", forma: "punto" as const }],
    nota: "Una solicitud en proceso no significa que la obra tenga presupuesto o fecha.",
  },
  {
    id: "solicitudes_quebradas",
    nombre: "Quebradas: basuras y daños",
    tema: "reclamos",
    fuente: "solicitudes_quebradas",
    descripcion: "Solicitudes sobre quebradas: basuras y escombros, socavación, obstrucción de cauces.",
    geometria: "punto",
    titulo: (p) => (p.basura === true ? "Basuras o escombros en la quebrada" : texto(p.problema)),
    campos: [
      ["quebrada", "Quebrada"],
      ["problema", "Problema reportado"],
      ["estado", "Estado"],
      ["barrio", "Barrio"],
      ["fecha", "Fecha de la solicitud", fechaTxt],
    ],
    leyenda: [
      { color: "#b7791f", etiqueta: "Basuras o escombros", forma: "punto" },
      { color: "#4f7fb0", etiqueta: "Otro daño o riesgo", forma: "punto" },
    ],
  },
  // Accidentes
  {
    id: "siniestros_viales",
    nombre: "Atropellos y siniestros viales",
    tema: "accidentes",
    fuente: "siniestros_viales",
    descripcion: "Registros de la Secretaría de Movilidad, 2019 a 2025.",
    geometria: "punto",
    titulo: (p) => `${texto(p.clase)} (${texto(p.anio)})`,
    campos: [["clase", "Clase"], ["gravedad", "Gravedad"], ["anio", "Año"], ["barrio", "Barrio"]],
    leyenda: [
      { color: COLOR.ladrillo, etiqueta: "Atropello", forma: "punto" },
      { color: "#8b9795", etiqueta: "Otro siniestro", forma: "punto" },
    ],
  },
  // Plan (POT)
  {
    id: "tratamientos",
    nombre: "Tratamientos del POT",
    tema: "plan",
    fuente: "tratamientos",
    descripcion: "Lo que el POT espera que cada zona llegue a ser.",
    geometria: "poligono",
    titulo: (p) => `${texto(p.tratamiento)} (${texto(p.codigo)})`,
    campos: [
      ["codigo", "Código del polígono"],
      ["tratamiento", "Tratamiento"],
      ["densidad_max_viv_ha", "Densidad máxima (viviendas/ha)"],
      ["indice_construccion_max", "Índice de construcción máximo"],
      ["altura_normativa", "Altura normativa (pisos)"],
    ],
    leyenda: Object.entries(TRATAMIENTOS).map(([etiqueta, color]) => ({
      color,
      etiqueta: etiqueta.startsWith("Áreas de Preservación") ? "Preservación de infraestructuras" : etiqueta,
      forma: "area" as const,
    })),
  },
  {
    id: "instrumentos",
    nombre: "Planes parciales y otros instrumentos",
    tema: "plan",
    fuente: "instrumentos",
    descripcion: "Zonas donde el POT exige un plan adicional.",
    geometria: "poligono",
    titulo: (p) => `${texto(p.instrumento)} (${texto(p.codigo_tratamiento)})`,
    campos: [["instrumento", "Instrumento"], ["nivel", "Nivel"], ["codigo_tratamiento", "Polígono"]],
    leyenda: [{ color: "#5b4a8a", etiqueta: "Plan parcial u otro instrumento", forma: "borde" }],
  },
  {
    id: "jerarquia_vial_pot",
    nombre: "Vías principales del POT",
    tema: "plan",
    fuente: "jerarquia_vial_pot",
    descripcion: "Vías arterias y colectoras del POT.",
    geometria: "linea",
    titulo: (p) => texto(p.nombre),
    campos: [["jerarquia", "Jerarquía"], ["clasificacion", "Clasificación"], ["estado", "Estado"]],
    leyenda: [{ color: "#5b4a8a", etiqueta: "Vía arteria o colectora", forma: "linea" }],
  },
  // Personas
  {
    id: "manzanas",
    nombre: "Personas por manzana (Censo 2018)",
    tema: "personas",
    fuente: "manzanas_censo",
    descripcion: "Densidad de población. En 3D, cada manzana sube según cuánta gente vive en ella.",
    geometria: "poligono",
    titulo: (p) => `Manzana con ${num(p.personas as number)} personas`,
    campos: [
      ["barrio", "Barrio"],
      ["personas", "Personas (2018)", (v) => num(v as number)],
      ["viviendas", "Viviendas", (v) => num(v as number)],
      ["menores_10", "Menores de 10 años", (v) => num(v as number)],
      ["mayores_60", "Personas de 60 años o más", (v) => num(v as number)],
      ["densidad_hab_ha", "Densidad", (v) => `${dec(v as number)} hab/ha`],
    ],
    leyenda: [
      { color: "#dbe8e0", etiqueta: "Menos de 250 hab/ha", forma: "area" },
      { color: "#a8cbb6", etiqueta: "250 a 500", forma: "area" },
      { color: "#6fa58a", etiqueta: "500 a 750", forma: "area" },
      { color: "#3d7a5d", etiqueta: "750 a 1.000", forma: "area" },
      { color: "#1f4d39", etiqueta: "Más de 1.000", forma: "area" },
    ],
  },
  // Vivienda
  {
    id: "oferta_inmobiliaria",
    nombre: "Viviendas en venta y arriendo (2023)",
    tema: "vivienda",
    fuente: "oferta_inmobiliaria",
    descripcion: "Precios pedidos en internet, recopilados por el Observatorio Inmobiliario de Medellín.",
    geometria: "punto",
    titulo: (p) => `${texto(p.inmueble)} en ${texto(p.operacion).toLowerCase()}`,
    campos: [
      ["precio", "Precio pedido", (v) => cop(v as number)],
      ["area_m2", "Área", m2],
      ["precio_m2", "Precio por m²", (v) => cop(v as number)],
      ["estrato", "Estrato"],
      ["antiguedad", "Antigüedad"],
      ["anio", "Año de la oferta"],
      ["barrio", "Barrio"],
    ],
    leyenda: [
      { color: COLOR.ambar, etiqueta: "En venta", forma: "punto" },
      { color: "#8a7656", etiqueta: "En arriendo", forma: "punto" },
    ],
    nota: "Es un precio pedido en internet, no un avalúo ni un precio de venta final.",
  },
  // Seguridad (capas del 10 de octubre de 2026)
  {
    id: "mortalidad_vial",
    nombre: "Muertes en siniestros viales",
    tema: "seguridad",
    fuente: "mortalidad_vial",
    descripcion: "Fallecidos en siniestros viales en la comuna (Secretaría de Movilidad). Sin sexo ni edad.",
    geometria: "punto",
    titulo: (p) => `${texto(p.clase)} (${texto(p.anio)})`,
    campos: [["clase", "Clase"], ["anio", "Año"], ["barrio", "Barrio"]],
    leyenda: [{ color: "#7d2a18", etiqueta: "Muerte en siniestro vial", forma: "punto" }],
  },
  {
    id: "camaras_cctv",
    nombre: "Cámaras de vigilancia",
    tema: "seguridad",
    fuente: "cctv_camaras",
    descripcion: "Cámaras registradas por la Secretaría de Seguridad dentro de la comuna.",
    geometria: "punto",
    titulo: (p) => texto(p.tipo),
    campos: [["tipo", "Tipo"], ["estado", "Estado"], ["direccion", "Dirección"], ["barrio", "Barrio"]],
    leyenda: [{ color: "#4a5958", etiqueta: "Cámara", forma: "punto" }],
  },
  {
    id: "semaforos",
    nombre: "Cruces semaforizados",
    tema: "seguridad",
    fuente: "semaforos",
    descripcion: "Cruces con semáforo dentro de la comuna.",
    geometria: "punto",
    titulo: (p) => texto(p.direccion),
    campos: [["direccion", "Dirección"], ["instalacion", "Instalado"], ["barrio", "Barrio"]],
    leyenda: [{ color: "#d08a1c", etiqueta: "Semáforo", forma: "punto" }],
    nota: "La capa oficial trae muy pocos cruces dentro de la comuna.",
  },
  // Corredor 49
  {
    id: "eje49",
    nombre: "Carrera 49 (Avenida Venezuela, 49B y 49C)",
    tema: "corredor",
    fuente: "jerarquia_vial_pot",
    descripcion: "Eje de la Carrera 49 según el POT. El tramo proyectado todavía no existe.",
    geometria: "linea",
    titulo: (p) => texto(p.nombre),
    campos: [["jerarquia", "Jerarquía"], ["estado", "Estado"]],
    leyenda: [
      { color: "#3d2fa8", etiqueta: "Existente", forma: "linea" },
      { color: "#f5b82e", etiqueta: "Proyectado en el POT", forma: "linea" },
    ],
  },
  // POT complementario
  {
    id: "pot_centralidades",
    nombre: "Centralidades del POT",
    tema: "plan",
    fuente: "pot_centralidades",
    descripcion: "Zonas donde el POT concentra comercio, servicios y equipamientos.",
    geometria: "poligono",
    titulo: (p) => texto(p.nombre),
    campos: [["caracter", "Carácter"], ["orden", "Orden"], ["estado", "Estado"], ["jerarquia", "Jerarquía"]],
    leyenda: [{ color: "#5b4a8a", etiqueta: "Centralidad", forma: "area" }],
  },
  {
    id: "pot_corredores_transporte",
    nombre: "Corredores de transporte del POT",
    tema: "plan",
    fuente: "pot_corredores_transporte",
    descripcion: "Corredores de transporte de pasajeros previstos por el POT.",
    geometria: "linea",
    titulo: (p) => texto(p.tramo ?? p.nombre),
    campos: [["linea", "Línea"], ["tramo", "Tramo"], ["nombre", "Calle"]],
    leyenda: [{ color: "#24598a", etiqueta: "Corredor de transporte", forma: "linea" }],
  },
  {
    id: "pot_intervencion_estrategica",
    nombre: "Áreas de intervención estratégica",
    tema: "plan",
    fuente: "pot_intervencion_estrategica",
    descripcion: "Macroproyectos y áreas donde el POT prevé grandes intervenciones.",
    geometria: "poligono",
    titulo: (p) => texto(p.nombre),
    campos: [["clasificacion", "Clasificación"], ["zona", "Zona"]],
    leyenda: [{ color: "#8a6bbf", etiqueta: "Área de intervención", forma: "area" }],
  },
  // Datos propios
  {
    id: "mis_datos",
    nombre: "Mis datos (archivos que subiste)",
    tema: "misdatos",
    fuente: "mis_datos",
    descripcion: "Lo que subiste en la página Mis datos. Se queda solo en tu navegador.",
    geometria: "punto",
    titulo: (p) => texto(p.nombre ?? p.name ?? p.titulo ?? p.archivo),
    campos: [["archivo", "Archivo"]],
    leyenda: [{ color: "#7a4e9b", etiqueta: "Tus datos", forma: "punto" }],
  },
];

export interface Tema {
  id: TemaId;
  nombre: string;
  ayuda: string;
  color: string;
  capas: string[];
}

/** Temas: botones grandes que prenden varias capas a la vez. */
export const TEMAS: Tema[] = [
  { id: "transporte", nombre: "Metro y buses", ayuda: "Estaciones, líneas y rutas", color: COLOR.cable, capas: ["lineas_transporte", "rutas_bus", "estaciones", "paradas"] },
  { id: "reclamos", nombre: "Huecos y reclamos", ayuda: "Huecos, obras pedidas y basuras en quebradas", color: COLOR_HUECO_PENDIENTE, capas: ["huecos", "solicitudes_obras", "solicitudes_quebradas"] },
  { id: "caminar", nombre: "Andenes y escaleras", ayuda: "Ancho de andenes, escaleras, ciclorrutas", color: "#7a4e9b", capas: ["andenes", "escaleras_osm", "red_ciclista"] },
  { id: "colegios", nombre: "Colegios", ayuda: "Sedes educativas", color: "#3b6fa8", capas: ["sedes_educativas"] },
  { id: "comunidad", nombre: "Salud y comunidad", ayuda: "Centros de salud, sedes, policía", color: "#c2412d", capas: ["equipamientos"] },
  { id: "parques", nombre: "Parques y deporte", ayuda: "Zonas verdes, canchas, bibliotecas", color: COLOR.ladera, capas: ["espacio_publico", "escenarios_deportivos", "bibliotecas", "espacio_publico_proyectado"] },
  { id: "personas", nombre: "Dónde vive la gente", ayuda: "Personas por manzana", color: "#3d7a5d", capas: ["manzanas"] },
  { id: "accidentes", nombre: "Atropellos", ayuda: "Siniestros viales 2019 a 2025", color: COLOR.ladrillo, capas: ["siniestros_viales"] },
  { id: "riesgo", nombre: "Riesgo de deslizamiento", ayuda: "Amenaza y zonas de riesgo", color: "#b8641f", capas: ["amenaza_movimiento_masa", "riesgo_no_mitigable"] },
  { id: "plan", nombre: "Plan de la ciudad (POT)", ayuda: "Tratamientos y planes parciales", color: "#5b4a8a", capas: ["tratamientos", "instrumentos", "jerarquia_vial_pot", "pot_centralidades", "pot_corredores_transporte", "pot_intervencion_estrategica"] },
  { id: "corredor", nombre: "Carrera 49", ayuda: "El eje y su tramo proyectado", color: "#3d2fa8", capas: ["eje49"] },
  { id: "seguridad", nombre: "Seguridad y cruces", ayuda: "Muertes viales, cámaras, semáforos", color: "#7d2a18", capas: ["mortalidad_vial", "camaras_cctv", "semaforos"] },
  { id: "misdatos", nombre: "Mis datos", ayuda: "Lo que subiste", color: "#7a4e9b", capas: ["mis_datos"] },
  { id: "vivienda", nombre: "Precios de vivienda", ayuda: "Ofertas publicadas en 2023", color: COLOR.ambar, capas: ["oferta_inmobiliaria"] },
];

export function capaPorId(id: string) {
  return CAPAS.find((c) => c.id === id);
}

/** Indicadores con los que se puede colorear el mapa de barrios. */
export const COLORES_BARRIO: { id: string; nombre: string; unidad: string; mayorEsPeor: boolean }[] = [
  { id: "densidad_hab_ha", nombre: "Densidad de población", unidad: "hab/ha", mayorEsPeor: true },
  { id: "espacio_publico_m2_hab", nombre: "Espacio público por habitante", unidad: "m²/hab", mayorEsPeor: false },
  { id: "equipamientos", nombre: "Número de equipamientos", unidad: "", mayorEsPeor: false },
  { id: "amenaza_alta_pct", nombre: "Área con amenaza alta", unidad: "%", mayorEsPeor: true },
  { id: "atropellos", nombre: "Atropellos 2019 a 2025", unidad: "", mayorEsPeor: true },
  { id: "estacion_distancia_lineal_m", nombre: "Distancia en línea recta a Metro o cable", unidad: "m", mayorEsPeor: true },
];

/** Escala de 5 colores: claro = mejor situación, oscuro = peor situación. */
export const ESCALA_ALERTA = ["#f3efe0", "#ecd3a4", "#d9a36a", "#bd6d45", "#8f3b25"];
