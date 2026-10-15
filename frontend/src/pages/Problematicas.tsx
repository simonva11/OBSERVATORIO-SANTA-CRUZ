import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../lib/datos";
import { dec, num } from "../lib/formato";
import { Cuenta } from "../components/Animacion";
import { ConDatos } from "../components/Estado";
import IconoNav from "../components/IconosNav";
import type { Indicadores } from "../lib/tipos";
import { Cabecera, Fuente, Relacionados, Seccion } from "../components/Pagina";

const ROJO = "#c2301a";
const AMBAR = "#b7791f";

interface Seguridad {
  hurto_2017: { total: number; por_barrio: { nombre: string; n: number }[]; por_tipo: { nombre: string; n: number }[] };
  homicidio_2017: { total: number };
  mortalidad_vial: { total: number; por_anio: { anio: string; n: number }[]; por_clase: { nombre: string; n: number }[] };
  camaras: { total: number };
}
interface Eje {
  destinos: Record<string, { minutos_ruta_rapida: number; por_barrio: { barrio: string; personas: number; minutos_ruta_rapida: number }[] }>;
  estado_del_eje: { siniestros_por_km: number; siniestros_por_km_comuna: number | null; ancho_andén_mediana_m: number | null };
}

interface Problema {
  id: string;
  icono: string;
  color: string;
  titulo: string;
  numero: number;
  decimales?: number;
  unidad: string;
  explica: string;
  donde: string;
  fuente: string;
  ids: string[];
  limite: string;
  mapa?: string;
  enlace?: { a: string; texto: string };
  reto: string;
}

function Contenido({ ind, seg, eje }: { ind: Indicadores; seg: Seguridad; eje: Eje }) {
  const c = ind.comuna;
  const barrios = ind.barrios;
  const an = ind.infraestructura?.andenes;
  const anchoMediano = useMemo(() => (an ? { mediana: an.ancho_mediano_m, menores: an.angostos_pct, km: an.km } : null), [an]);

  const peorEP = [...barrios].sort((a, b) => (a.espacio_publico_m2_hab ?? 99) - (b.espacio_publico_m2_hab ?? 99))[0];
  const peorAtrop = [...barrios].sort((a, b) => b.atropellos - a.atropellos)[0];
  const peorAmenaza = [...barrios].sort((a, b) => b.amenaza_alta_pct - a.amenaza_alta_pct)[0];
  const lejosMetro = [...eje.destinos.transporte_masivo.por_barrio].sort((a, b) => b.minutos_ruta_rapida - a.minutos_ruta_rapida).slice(0, 2);
  const atrop = seg.mortalidad_vial.por_clase.find((x) => x.nombre === "Atropello")?.n ?? 0;
  const atropellos = barrios.reduce((s, b) => s + b.atropellos, 0);
  const anios = seg.mortalidad_vial.por_anio;
  const imcv = ind.ecv.imcv;

  const problemas: Problema[] = ([
    {
      id: "ep", icono: "arbol", color: ROJO, titulo: "Muy poco espacio público por persona",
      numero: c.espacio_publico_m2_hab ?? 0, decimales: 2, unidad: "m² de espacio público por persona",
      explica: `La referencia nacional es de 15 m². En ${peorEP.nombre} son ${dec(peorEP.espacio_publico_m2_hab)} m²: prácticamente nada.`,
      donde: `Peor: ${peorEP.nombre}, ${barrios.filter((b) => b.codigo !== peorEP.codigo && (b.espacio_publico_m2_hab ?? 99) < 0.5).map((b) => b.nombre).slice(0, 4).join(", ")}.`,
      fuente: "Alcaldía de Medellín, espacio público existente y Censo 2018 (DANE)", ids: ["espacio_publico", "manzanas_censo"], limite: "Suma la capa de espacio público existente; no es el indicador oficial de espacio público efectivo.", mapa: "espacio_publico", reto: "Espacio público",
    },
    {
      id: "atrop", icono: "alerta", color: ROJO, titulo: "Muchos atropellos en las calles de la comuna",
      numero: atropellos, unidad: "personas atropelladas entre 2019 y 2025",
      explica: `De ${num(c.siniestros_total)} siniestros viales, ${num(atropellos)} fueron atropellos. Además hay ${seg.mortalidad_vial.total} muertes viales registradas, ${atrop} de ellas por atropello.`,
      donde: `Más atropellos: ${peorAtrop.nombre} (${peorAtrop.atropellos}). Muertes por año: ${anios.map((a) => `${a.anio}: ${a.n}`).join(", ")}.`,
      fuente: "Secretaría de Movilidad de Medellín: siniestros viales y mortalidad", ids: ["siniestros_viales", "mortalidad_vial"], limite: "Son siniestros registrados: los que no se reportan no aparecen, y 2025 puede estar incompleto.", mapa: "siniestros_viales,mortalidad_vial", reto: "Infraestructura peatonal",
    },
    {
      id: "49", icono: "andenes", color: ROJO, titulo: "La Carrera 49 concentra siniestros",
      numero: eje.estado_del_eje.siniestros_por_km, decimales: 0, unidad: "siniestros por km en la Carrera 49",
      explica: `${eje.estado_del_eje.siniestros_por_km_comuna ? `El promedio de las calles de la comuna es ${dec(eje.estado_del_eje.siniestros_por_km_comuna)}. ` : ""}Por la 49 van varias líneas de bus y sus andenes tienen una mediana de ${dec(eje.estado_del_eje.ancho_andén_mediana_m)} m.`,
      donde: "Eje de unos 2 km formado por Venezuela (Carrera 49), 49B y 49C.",
      fuente: "Siniestros, andenes, paradas y rutas de la Secretaría de Movilidad; POT", ids: ["siniestros_viales", "andenes", "rutas_bus"], limite: "Por la 49 pasa más gente y más buses: parte de la diferencia es exposición, no solo el diseño de la vía.", mapa: "eje49,siniestros_viales", enlace: { a: "/corredor-49", texto: "Ver el análisis de la 49" }, reto: "Infraestructura vial",
    },
    {
      id: "andenes", icono: "andenes", color: AMBAR, titulo: "Andenes angostos",
      numero: anchoMediano?.mediana ?? 0, decimales: 1, unidad: "m de ancho mediano del andén",
      explica: anchoMediano ? `${dec(anchoMediano.menores)} % del largo de los ${dec(anchoMediano.km)} km de andén inventariado mide menos de 1,2 m, el ancho que OTEA usa como referencia para circular cómodo.` : "Pendiente de datos",
      donde: "En toda la comuna; el mapa los pinta rojo, amarillo y violeta según su ancho.",
      fuente: "Inventario de andenes de la Secretaría de Movilidad (sin fecha de corte publicada)", ids: ["andenes"], limite: "El inventario no tiene fecha de corte publicada ni diccionario de estado y material; 1,2 m es una referencia, no una norma verificada.", mapa: "andenes", reto: "Infraestructura peatonal",
    },
    {
      id: "metro", icono: "tren", color: AMBAR, titulo: "El Metro queda lejos de varios barrios",
      numero: eje.destinos.transporte_masivo.minutos_ruta_rapida, decimales: 1, unidad: "min caminando al Metro o Metrocable",
      explica: `Es el promedio de toda la comuna por la ruta más rápida. Dentro de la comuna solo está la estación ${c.estaciones_en_comuna[0] ?? "—"}. Los barrios más lejos son ${lejosMetro.map((b) => `${b.barrio} (${dec(b.minutos_ruta_rapida)} min)`).join(" y ")}.`,
      donde: `Tiempos estimados con la velocidad de Tobler sobre la red de caminos, no medidos en campo.`,
      fuente: "Red peatonal del proyecto (calles, senderos y escaleras) y estaciones del Metro", ids: ["vias", "estaciones", "manzanas_censo"], limite: "Velocidad teórica de caminata: no incluye semáforos, cruces difíciles ni la sensación de seguridad.", mapa: "estaciones,lineas_transporte,escaleras_osm", enlace: { a: "/accesibilidad", texto: "Ver accesibilidad" }, reto: "Conexión con el resto de Medellín",
    },
    {
      id: "riesgo", icono: "alerta", color: AMBAR, titulo: "Parte de la comuna está en amenaza alta",
      numero: c.amenaza_pct["Alta"] ?? 0, decimales: 1, unidad: "% del área con amenaza alta por movimiento en masa",
      explica: `${dec(c.riesgo_pct["Con condiciones de riesgo"])} % del área tiene condiciones de riesgo y ${dec(c.riesgo_pct["Alto riesgo no mitigable"])} % está catalogada de alto riesgo no mitigable.`,
      donde: `Más expuesto: ${peorAmenaza.nombre} (${dec(peorAmenaza.amenaza_alta_pct)} % del barrio).`,
      fuente: "POT de Medellín: amenaza por movimiento en masa y zonas de riesgo", ids: ["amenaza_movimiento_masa", "riesgo_no_mitigable"], limite: "Es amenaza de planeación del POT, no una predicción ni el estado del terreno hoy.", mapa: "amenaza_movimiento_masa,riesgo_no_mitigable", enlace: { a: "/riesgo", texto: "Ver riesgo de ladera" }, reto: "Dónde construir",
    },
    {
      id: "seguridad", icono: "corazon", color: AMBAR, titulo: "Hurtos (último dato: 2017)",
      numero: seg.hurto_2017.total, unidad: "hurtos registrados en 2017",
      explica: `${seg.hurto_2017.por_tipo[0] ? `El más frecuente fue ${seg.hurto_2017.por_tipo[0].nombre.toLowerCase()} (${seg.hurto_2017.por_tipo[0].n}). ` : ""}Hubo ${seg.homicidio_2017.total} homicidios ese año. Es el último año publicado en esa capa y hay ${seg.camaras.total} cámaras registradas dentro de la comuna.`,
      donde: `Más hurtos: ${seg.hurto_2017.por_barrio.slice(0, 3).map((b) => `${b.nombre} (${b.n})`).join(", ")}.`,
      fuente: "Secretaría de Seguridad de Medellín, indicadores de seguridad 2017 (solo conteos por barrio)", ids: ["hurto_2017", "homicidio_2017", "cctv_camaras"], limite: "El último año publicado por barrio es 2017: no sirve para decir cómo está la seguridad hoy.", mapa: "camaras_cctv", reto: "Entorno de las obras",
    },
    {
      id: "vida", icono: "personas", color: ROJO, titulo: "Calidad de vida por debajo de casi toda la ciudad",
      numero: imcv.posicion ?? 0, unidad: `puesto entre ${imcv.de} en el índice de condiciones de vida (${imcv.ultimo_anio})`,
      explica: `Tiene ${dec(imcv.ultimo_valor)} puntos contra ${dec(imcv.mejor_valor_ciudad)} de ${imcv.mejor_territorio}. Solo ${imcv.de - (imcv.posicion ?? 0)} territorios están peor.`,
      donde: "Es un índice de toda la comuna: no se publica por barrio.",
      fuente: "Encuesta de Calidad de Vida de Medellín (Alcaldía)", ids: ["indicadores_ecv"], limite: "Es un índice de toda la comuna; no se publica por barrio.", enlace: { a: "/indicadores", texto: "Ver indicadores" }, reto: "Contexto de la comuna",
    },
  ] as Problema[]).filter((p) => p.id !== "vida" || imcv.posicion != null);

  return (
    <>
      <Cabecera etiqueta="Problemáticas reales de la comuna" icono="alerta" titulo="Lo que pasa en Santa Cruz, con datos"
        texto="Ocho problemas que se pueden medir con datos públicos. Para cada uno: el número, dónde pesa más, de dónde sale, qué no se puede concluir y dónde estudiarlo mejor."
        pregunta="¿Cuáles son los problemas que los datos ya muestran y qué tan seguros estamos de cada uno?" />

      <Seccion id="t-p-ocho" pregunta="¿Qué muestran los datos?" titulo="Ocho problemas, uno por uno" texto="El orden no es un ranking de gravedad: va de lo que se vive en la calle al contexto de toda la comuna.">
        <ol className="grid border-t-2 border-tinta">
          {problemas.map((p, i) => (
            <li key={p.id} className="grid gap-x-8 gap-y-3 border-b border-nivel py-6 lg:grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
              <p className="mono text-sm text-tinta-tenue">0{i + 1}</p>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-papel-hondo text-tinta"><IconoNav nombre={p.icono} className="h-5 w-5" trazo={1.9} /></span>
                  <h3 className="fuente-titulo text-xl font-bold leading-tight">{p.titulo}</h3>
                </div>
                <p className="fuente-titulo mt-3 text-4xl font-extrabold leading-none tabular-nums" style={{ color: p.color === ROJO ? "rgb(var(--peligro))" : "rgb(var(--tinta))" }}>
                  <Cuenta hasta={p.numero} decimales={p.decimales ?? 0} activo />
                </p>
                <p className="mt-1 text-sm font-medium">{p.unidad}</p>
              </div>
              <div className="text-[0.95rem]">
                <p>{p.explica}</p>
                <p className="mt-2 text-tinta-suave"><span className="mono text-[0.68rem] uppercase tracking-[0.05em] text-tinta-tenue">Dónde · </span>{p.donde}</p>
                <p className="mt-2 text-tinta-suave"><span className="mono text-[0.68rem] uppercase tracking-[0.05em] text-tinta-tenue">Qué no dice · </span>{p.limite}</p>
              </div>
              <div className="grid content-start gap-3">
                <Fuente ids={p.ids} />
                <p className="mono text-[0.7rem] text-tinta-tenue">Tema del reto: {p.reto}</p>
                <div className="flex flex-wrap gap-2">
                  {p.mapa && <Link to={`/mapa?capas=${p.mapa}`} className="boton boton-2 !px-3 !py-1.5 !text-sm"><IconoNav nombre="mapa" className="h-4 w-4" trazo={2} /> En el mapa</Link>}
                  {p.enlace && <Link to={p.enlace.a} className="boton boton-1 !px-3 !py-1.5 !text-sm">{p.enlace.texto}</Link>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion id="t-p-ahora" pregunta="¿Y ahora qué?" titulo="De los problemas a las decisiones" texto="Los problemas se convierten en obras posibles en Prioridad de obras, con cuánta gente ayudaría cada una. El costo no se muestra porque no hay una fuente pública confiable de precios." siguiente={[{ to: "/prioridades", texto: "Ver prioridad de obras" }, { to: "/lideres", texto: "Pedir una obra por escrito" }]}>
        <span className="sr-only">Acciones</span>
      </Seccion>
      <Relacionados ids={["corredor", "accesibilidad", "prioridades"]} />
    </>
  );
}

export default function Problematicas() {
  const ind = useDatos<Indicadores>("indicadores.json");
  const seg = useDatos<Seguridad>("seguridad.json");
  const eje = useDatos<Eje>("eje49.json");
  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <ConDatos estado={ind}>
        {(i) => <ConDatos estado={seg}>{(s) => <ConDatos estado={eje}>{(e) => <Contenido ind={i} seg={s} eje={e} />}</ConDatos>}</ConDatos>}
      </ConDatos>
    </div>
  );
}
