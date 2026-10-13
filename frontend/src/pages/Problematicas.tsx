import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../lib/datos";
import { dec, num } from "../lib/formato";
import { Cuenta, Revelar } from "../components/Animacion";
import { ConDatos } from "../components/Estado";
import IconoNav from "../components/IconosNav";
import type { Coleccion, Indicadores } from "../lib/tipos";
import { Cabecera, Relacionados, Seccion } from "../components/Pagina";

const ROJO = "#c2301a";
const VERDE = "rgb(var(--marca))";
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
  mapa?: string;
  enlace?: { a: string; texto: string };
  reto: string;
}

function Contenido({ ind, seg, eje, andenes }: { ind: Indicadores; seg: Seguridad; eje: Eje; andenes: Coleccion | null }) {
  const c = ind.comuna;
  const barrios = ind.barrios;
  const anchoMediano = useMemo(() => {
    if (!andenes) return null;
    const a = andenes.features.map((f) => Number(f.properties?.ancho_m)).filter((x) => isFinite(x) && x > 0).sort((x, y) => x - y);
    if (!a.length) return null;
    return { mediana: a[Math.floor(a.length / 2)], menores: (a.filter((x) => x < 1.5).length / a.length) * 100, n: a.length };
  }, [andenes]);

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
      id: "ep", icono: "arbol", color: ROJO, titulo: "Casi no hay dónde estar afuera",
      numero: c.espacio_publico_m2_hab ?? 0, decimales: 2, unidad: "m² de espacio público por persona",
      explica: `La referencia nacional es de 15 m². En ${peorEP.nombre} son ${dec(peorEP.espacio_publico_m2_hab)} m²: prácticamente nada.`,
      donde: `Peor: ${peorEP.nombre}, ${barrios.filter((b) => b.codigo !== peorEP.codigo && (b.espacio_publico_m2_hab ?? 99) < 0.5).map((b) => b.nombre).slice(0, 4).join(", ")}.`,
      fuente: "Alcaldía de Medellín, espacio público existente y Censo 2018 (DANE)", mapa: "espacio_publico", reto: "Espacio público",
    },
    {
      id: "atrop", icono: "alerta", color: ROJO, titulo: "Cruzar la calle se paga caro",
      numero: atropellos, unidad: "personas atropelladas entre 2019 y 2025",
      explica: `De ${num(c.siniestros_total)} siniestros viales, ${num(atropellos)} fueron atropellos. Además hay ${seg.mortalidad_vial.total} muertes viales registradas, ${atrop} de ellas por atropello.`,
      donde: `Más atropellos: ${peorAtrop.nombre} (${peorAtrop.atropellos}). Muertes por año: ${anios.map((a) => `${a.anio}: ${a.n}`).join(", ")}.`,
      fuente: "Secretaría de Movilidad de Medellín: siniestros viales y mortalidad", mapa: "siniestros_viales,mortalidad_vial", reto: "Infraestructura peatonal",
    },
    {
      id: "49", icono: "andenes", color: ROJO, titulo: "La vía principal es la más peligrosa",
      numero: eje.estado_del_eje.siniestros_por_km, decimales: 0, unidad: "siniestros por km en la Carrera 49",
      explica: `${eje.estado_del_eje.siniestros_por_km_comuna ? `El promedio de las calles de la comuna es ${dec(eje.estado_del_eje.siniestros_por_km_comuna)}. ` : ""}Por la 49 van varias líneas de bus y sus andenes tienen una mediana de ${dec(eje.estado_del_eje.ancho_andén_mediana_m)} m.`,
      donde: "Eje de unos 2 km formado por Venezuela (Carrera 49), 49B y 49C.",
      fuente: "Siniestros, andenes, paradas y rutas de la Secretaría de Movilidad; POT", mapa: "eje49,siniestros_viales", enlace: { a: "/corredor-49", texto: "Ver el análisis de la 49" }, reto: "Infraestructura vial",
    },
    {
      id: "andenes", icono: "andenes", color: AMBAR, titulo: "Los andenes no alcanzan",
      numero: anchoMediano?.mediana ?? 0, decimales: 1, unidad: "m de ancho mediano del andén",
      explica: anchoMediano ? `${dec(anchoMediano.menores)} % de los ${num(anchoMediano.n)} tramos inventariados mide menos de 1,5 m. El estado y el material no se pueden leer: el inventario oficial no publica el diccionario de sus códigos.` : "Pendiente de datos",
      donde: "En toda la comuna; el mapa los pinta rojo, amarillo y violeta según su ancho.",
      fuente: "Inventario de andenes de la Secretaría de Movilidad (sin fecha de corte publicada)", mapa: "andenes", reto: "Infraestructura peatonal",
    },
    {
      id: "metro", icono: "tren", color: AMBAR, titulo: "El Metro queda lejos de varios barrios",
      numero: eje.destinos.transporte_masivo.minutos_ruta_rapida, decimales: 1, unidad: "min caminando al Metro o Metrocable",
      explica: `Es el promedio de toda la comuna por la ruta más rápida. Dentro de la comuna solo está la estación ${c.estaciones_en_comuna[0] ?? "—"}. Los barrios más lejos son ${lejosMetro.map((b) => `${b.barrio} (${dec(b.minutos_ruta_rapida)} min)`).join(" y ")}.`,
      donde: `Tiempos estimados con la velocidad de Tobler sobre la red de caminos, no medidos en campo.`,
      fuente: "Red peatonal del proyecto (calles, senderos y escaleras) y estaciones del Metro", mapa: "estaciones,lineas_transporte,escaleras_osm", enlace: { a: "/accesibilidad", texto: "Ver accesibilidad" }, reto: "Conexión con el resto de Medellín",
    },
    {
      id: "riesgo", icono: "alerta", color: AMBAR, titulo: "Vivir en la ladera tiene riesgo",
      numero: c.amenaza_pct["Alta"] ?? 0, decimales: 1, unidad: "% del área con amenaza alta por movimiento en masa",
      explica: `${dec(c.riesgo_pct["Con condiciones de riesgo"])} % del área tiene condiciones de riesgo y ${dec(c.riesgo_pct["Alto riesgo no mitigable"])} % está catalogada de alto riesgo no mitigable.`,
      donde: `Más expuesto: ${peorAmenaza.nombre} (${dec(peorAmenaza.amenaza_alta_pct)} % del barrio).`,
      fuente: "POT de Medellín: amenaza por movimiento en masa y zonas de riesgo", mapa: "amenaza_movimiento_masa,riesgo_no_mitigable", reto: "Dónde construir",
    },
    {
      id: "seguridad", icono: "corazon", color: AMBAR, titulo: "Hurtos que pasan cerca de la gente",
      numero: seg.hurto_2017.total, unidad: "hurtos registrados en 2017",
      explica: `${seg.hurto_2017.por_tipo[0] ? `El más frecuente fue ${seg.hurto_2017.por_tipo[0].nombre.toLowerCase()} (${seg.hurto_2017.por_tipo[0].n}). ` : ""}Hubo ${seg.homicidio_2017.total} homicidios ese año. Es el último año publicado en esa capa y hay ${seg.camaras.total} cámaras registradas dentro de la comuna.`,
      donde: `Más hurtos: ${seg.hurto_2017.por_barrio.slice(0, 3).map((b) => `${b.nombre} (${b.n})`).join(", ")}.`,
      fuente: "Secretaría de Seguridad de Medellín, indicadores de seguridad 2017 (solo conteos por barrio)", mapa: "camaras_cctv", reto: "Entorno de las obras",
    },
    {
      id: "vida", icono: "personas", color: ROJO, titulo: "Peor calidad de vida que casi toda la ciudad",
      numero: imcv.posicion ?? 0, unidad: `puesto entre ${imcv.de} en el índice de condiciones de vida (${imcv.ultimo_anio})`,
      explica: `Tiene ${dec(imcv.ultimo_valor)} puntos contra ${dec(imcv.mejor_valor_ciudad)} de ${imcv.mejor_territorio}. Solo ${imcv.de - (imcv.posicion ?? 0)} territorios están peor.`,
      donde: "Es un índice de toda la comuna: no se publica por barrio.",
      fuente: "Encuesta de Calidad de Vida de Medellín (Alcaldía)", enlace: { a: "/indicadores", texto: "Ver indicadores" }, reto: "Contexto de la comuna",
    },
  ] as Problema[]).filter((p) => p.id !== "vida" || imcv.posicion != null);

  return (
    <div className="space-y-8">
      <Cabecera etiqueta="Problemáticas reales de la comuna" icono="alerta" titulo="Lo que pasa en Santa Cruz, con datos"
        texto="Ocho problemas. Cada número viene de una fuente oficial que puedes revisar, y cada uno se puede ver en el mapa." />

      <Seccion id="t-p-ocho" titulo="Los ocho problemas" texto="Cada número viene de una fuente oficial que puedes revisar.">
      <div className="grid gap-4 md:grid-cols-2">
        {problemas.map((p, i) => (
          <Revelar key={p.id} retraso={(i % 2) * 100}>
            <article className="vidrio vidrio--quieto flex h-full flex-col rounded-xl p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white" style={{ background: p.color }}><IconoNav nombre={p.icono} className="h-7 w-7" trazo={1.9} /></span>
                <h2 className="text-base font-semibold leading-snug">{p.titulo}</h2>
              </div>
              <p className="mt-4 text-[1.9rem] font-semibold leading-none tabular-nums" style={{ color: p.color === ROJO ? "rgb(var(--peligro))" : "rgb(var(--ambar))" }}>
                <Cuenta hasta={p.numero} decimales={p.decimales ?? 0} activo />
              </p>
              <p className="mt-1 text-base font-semibold">{p.unidad}</p>
              <p className="mt-3 text-base leading-relaxed">{p.explica}</p>
              <p className="mt-3 text-base text-tinta-suave">{p.donde}</p>
              <div className="mt-auto pt-5">
                <p className="text-sm text-tinta-tenue">Fuente: {p.fuente}. Reto: {p.reto}.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {p.mapa && (
                    <Link to={`/mapa?capas=${p.mapa}`} className="inline-flex items-center gap-2 rounded-xl bg-menta px-4 py-2 text-base font-semibold text-marca transition hover:brightness-95">
                      <IconoNav nombre="mapa" className="h-5 w-5" trazo={2} /> Verlo en el mapa
                    </Link>
                  )}
                  {p.enlace && (
                    <Link to={p.enlace.a} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-base font-semibold text-marca underline underline-offset-4">
                      {p.enlace.texto} <IconoNav nombre="flecha" className="h-5 w-5" trazo={2} />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          </Revelar>
        ))}
      </div>
      </Seccion>

      <Revelar>
        <div className="rounded-xl bg-menta-2 px-5 py-5">
          <h2 className="text-lg font-semibold" style={{ color: VERDE }}>Y qué se hace con esto</h2>
          <p className="mt-2 max-w-3xl text-sm text-tinta-suave">La plataforma convierte estas problemáticas en obras posibles, con cuánta gente ayuda cada una y cuánto cuesta. Los costos quedan en blanco hasta que se registre una fuente.</p>
          <Link to="/prioridades" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" style={{ color: VERDE }}>
            Ver prioridad de obras <IconoNav nombre="flecha" className="h-5 w-5" trazo={2} />
          </Link>
        </div>
      </Revelar>
      <Relacionados ids={["corredor", "accesibilidad", "prioridades"]} />
    </div>
  );
}

export default function Problematicas() {
  const ind = useDatos<Indicadores>("indicadores.json");
  const seg = useDatos<Seguridad>("seguridad.json");
  const eje = useDatos<Eje>("eje49.json");
  const and = useDatos<Coleccion>("andenes.geojson");
  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-papel" />
      <div className="mx-auto max-w-[112rem] space-y-10 px-4 py-6 lg:px-8 2xl:px-12">
        <ConDatos estado={ind}>
          {(i) => <ConDatos estado={seg}>{(s) => <ConDatos estado={eje}>{(e) => <Contenido ind={i} seg={s} eje={e} andenes={and.estado === "listo" ? and.datos : null} />}</ConDatos>}</ConDatos>}
        </ConDatos>
      </div>
    </div>
  );
}
