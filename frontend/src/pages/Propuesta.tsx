import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDatos } from "../lib/datos";
import { dec, num, pct } from "../lib/formato";
import type { Indicadores } from "../lib/tipos";
import { Aviso, BotonCabecera, Cabecera, Relacionados, Seccion } from "../components/Pagina";
import { ConDatos } from "../components/Estado";

type Estado = "Funciona hoy" | "Prototipo" | "Por validar" | "Propuesta";
const CLASE: Record<Estado, string> = { "Funciona hoy": "clase-oficial", Prototipo: "clase-derivado", "Por validar": "clase-entregado", Propuesta: "clase-prensa" };
const Chip = ({ e }: { e: Estado }) => <span className={`clase ${CLASE[e]}`}>{e}</span>;

/** Lo que OTEA hace hoy y lo que viene, sin mezclar. */
const CAPACIDADES: { que: string; detalle: string; estado: Estado; to?: string }[] = [
  { que: "Vista ciudadana «Así vivimos Santa Cruz»", detalle: "Cuatro historias con cifras en lenguaje sencillo, mapa simple y compartir por WhatsApp. Las fotos reales de Santa Cruz aún no están: mientras tanto se muestran ilustraciones con datos, rotuladas como tales.", estado: "Prototipo", to: "/" },
  { que: "Mapa con las capas del territorio", detalle: "Más de 40 capas oficiales de movilidad, servicios, POT, riesgo y seguridad, con ficha de cada elemento.", estado: "Funciona hoy", to: "/mapa" },
  { que: "Ficha por barrio", detalle: "Síntesis, índice de entorno, comparación con la comuna y con otro barrio, imprimible.", estado: "Funciona hoy", to: "/barrios" },
  { que: "Minutos caminando por la red real", detalle: "Calles, andenes, escaleras y puentes con la pendiente de la ladera, para cada manzana.", estado: "Funciona hoy", to: "/accesibilidad" },
  { que: "Prioridad de obras con evidencia", detalle: "Espacio público del POT y andenes angostos ordenados por indicadores reales; se descarga en CSV.", estado: "Funciona hoy", to: "/prioridades" },
  { que: "Catálogo de fuentes", detalle: "Entidad, fecha, licencia y estado de cada conjunto de datos.", estado: "Funciona hoy", to: "/fuentes" },
  { que: "Radar de noticias", detalle: "Titulares públicos ordenados por tema, barrio y mes.", estado: "Funciona hoy", to: "/radar" },
  { que: "Cruzar datos propios", detalle: "Subir un CSV o GeoJSON y verlo sobre el mapa, en el navegador.", estado: "Funciona hoy", to: "/datos" },
  { que: "Reportes de vecinos", detalle: "Formulario de prueba que guarda solo en el navegador. Falta servidor, foto y validación por la JAC.", estado: "Prototipo", to: "/participacion" },
  { que: "Datos de ReportesMED y Emvarias", detalle: "Hay que pedirlos o confirmar sus condiciones de uso antes de publicar algo más que agregados.", estado: "Por validar" },
  { que: "Detección de daños en video", detalle: "Recorrer las calles con celular y marcar huecos y andenes con visión por computador. No se ha probado.", estado: "Propuesta" },
];

const NIVELES = [
  { n: "01", t: "Explorar", d: "Lo público: mapa, fichas de barrio, indicadores y fuentes, para que cualquier persona entienda su territorio.", hoy: "Es lo que ves en este sitio." },
  { n: "02", t: "Analizar", d: "Herramientas para equipos: comparar zonas, cruzar datos propios, exportar resultados con su fuente y preparar informes.", hoy: "Hay piezas: descargas CSV, ficha imprimible y subida de datos. Falta un espacio de trabajo con cuentas." },
  { n: "03", t: "Implementar", d: "Llevar OTEA a otra comuna o municipio: configurar el territorio, integrar sus datos, validar con la comunidad y acompañar el uso.", hoy: "Es un servicio por construir; no hay contratos ni precios definidos." },
];

const PASOS_IMPLEMENTAR = [
  { t: "Definir el territorio", d: "El código de la comuna o municipio y su área. Hoy el código del proyecto está escrito para la Comuna 2: hay que cambiar esos parámetros y revisar los resultados." },
  { t: "Descargar y procesar las capas", d: "Los scripts de data-pipeline bajan las capas del Geoportal de Medellín y del DANE y calculan los indicadores. Fuera de Medellín hay que buscar las capas equivalentes." },
  { t: "Calcular la red caminable", d: "Calles oficiales más caminos de OpenStreetMap y un modelo de elevación. Conviene revisar en campo 3 o 4 recorridos." },
  { t: "Validar con la gente", d: "Mostrar la ficha de cada barrio a la JAC o a líderes y corregir lo que no coincida con lo que viven." },
  { t: "Publicar y mantener", d: "El sitio es estático (funciona en cualquier hosting) y la API es opcional. Hay que decidir quién actualiza los datos y cada cuánto." },
];

const PARA_QUIEN = [
  { t: "Alcaldía y secretarías", d: "Priorizar obras de andenes, vías y espacio público con criterios escritos y trazables.", decide: "Qué obra va primero y por qué." },
  { t: "JAL, JAC y Presupuesto Participativo", d: "Llevar cifras a las reuniones y argumentar con datos del propio barrio.", decide: "Qué proponer y con qué evidencia." },
  { t: "Consultoras, constructoras e inmobiliarias", d: "Entender una zona: densidad, POT, accesibilidad y oferta publicada.", decide: "Dónde y qué estudiar a fondo." },
  { t: "Universidades", d: "Un método abierto y documentado sobre datos públicos para enseñar o investigar.", decide: "Qué replicar o mejorar." },
];

function Contenido({ ind }: { ind: Indicadores }) {
  const c = ind.comuna;
  const acc = ind.accesibilidad?.comuna as Record<string, number> | undefined;
  const an = ind.infraestructura?.andenes;
  const atropellos = ind.barrios.reduce((s, b) => s + b.atropellos, 0);
  const [params] = useSearchParams();
  useEffect(() => {
    if (params.get("ir") === "implementar") setTimeout(() => document.getElementById("t-p-implementar")?.scrollIntoView({ behavior: "smooth" }), 300);
  }, [params]);
  const problemas: [string, string][] = [
    ["Casi no hay espacio público", `${dec(c.espacio_publico_m2_hab)} m² por habitante frente a los 15 m² de referencia nacional.`],
    ["Llegar caminando cuesta", `Solo ${pct(acc?.transporte_masivo_10min_pct)} de las personas llega al Metro o al Metrocable en 10 minutos caminando.`],
    ["Andenes que no alcanzan", `${pct(an?.angostos_pct)} del andén inventariado mide menos de 1,2 m.`],
    ["Calles peligrosas", `${num(atropellos)} atropellos registrados entre 2019 y 2025 en los barrios de la comuna.`],
    ["Ladera y agua", `${pct(c.amenaza_pct?.Alta)} de la superficie tiene amenaza alta por movimiento en masa según el POT.`],
    ["Datos repartidos", "Lo que se sabe de la comuna está en portales, oficinas y formatos distintos, sin cruzar y sin contexto."],
  ];

  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera
        etiqueta="Propuesta de valor"
        icono="corazon"
        titulo="Por qué existe OTEA y para quién sirve"
        texto={<>Entender un territorio hoy exige abrir muchos portales, descargar archivos y cruzarlos a mano. OTEA hace ese trabajo una vez, con método escrito, y lo deja listo para que una persona del barrio o un equipo técnico tomen decisiones. Aquí se explica qué hace hoy, qué falta y qué se necesita para llevarlo a otro territorio.</>}
        pregunta="¿Qué problema resuelve, a quién le sirve, qué hace hoy y cómo se implementa?"
      >
        <BotonCabecera to="/mapa">Explorar el mapa</BotonCabecera>
        <a href="#t-p-implementar" className="boton boton-2" onClick={(e) => { e.preventDefault(); document.getElementById("t-p-implementar")?.scrollIntoView({ behavior: "smooth" }); }}>Cómo implementarlo</a>
      </Cabecera>

      <Seccion id="t-p-dos" pregunta="¿Cómo está organizado?" titulo="Una plataforma, dos experiencias" texto="Los mismos datos y las mismas fuentes, contados de dos maneras según quién los mira. Ninguna cifra cambia de una experiencia a la otra.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-nivel bg-superficie p-6">
            <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-marca">OTEA Ciudadano · Mi barrio, mi voz</p>
            <h3 className="fuente-titulo mt-2 text-xl font-bold">Para vecinos</h3>
            <p className="mt-2 text-tinta-suave">Cuatro problemas que se viven a diario, explicados con palabras de todos los días, un mapa simple y una forma fácil de compartirlos. Cada historia lleva a su análisis técnico.</p>
            <Link to="/" className="siguiente-a mt-3">Abrir la vista ciudadana →</Link>
          </div>
          <div className="rounded-2xl border border-nivel bg-superficie p-6">
            <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-marca">OTEA Técnico · Analizar el territorio</p>
            <h3 className="fuente-titulo mt-2 text-xl font-bold">Para JAC, JAL, entidades y analistas</h3>
            <p className="mt-2 text-tinta-suave">Todos los módulos: mapa con más de 40 capas, indicadores, prioridad de obras, fuentes con su ficha y herramientas para preparar solicitudes.</p>
            <Link to="/tecnico" className="siguiente-a mt-3">Abrir OTEA Técnico →</Link>
          </div>
        </div>
        <h3 className="fuente-titulo mt-8 text-lg font-bold">Qué le ofrece a cada quien</h3>
        <p className="text-sm text-tinta-suave">Son hipótesis de valor por validar con entrevistas; no hay precios, contratos ni clientes.</p>
        <ul className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["A la comunidad", "Entender qué pasa en su barrio sin leer informes técnicos, y tener una cifra clara para conversar con los vecinos."],
            ["A líderes comunales", "Cifras con su fuente y una carta de derecho de petición para llevar a la JAC, la JAL o la Alcaldía."],
            ["A analistas y administradores", "Datos cruzados, métodos escritos y descargas para trabajar sin repetir el trabajo de reunir y limpiar."],
            ["A entidades y compradores", "Una lectura del territorio con trazabilidad: qué se sabe, de dónde sale y qué falta validar, antes de decidir una inversión."],
          ].map(([t, x]) => <li key={t} className="border-t-2 border-tinta pt-3"><p className="font-semibold">{t}</p><p className="mt-1 text-sm text-tinta-suave">{x}</p></li>)}
        </ul>
      </Seccion>

      <Seccion id="t-p-problema" pregunta="¿Qué problema hay?" titulo="Lo que muestran los datos de Santa Cruz" texto="Seis problemas que ya se pueden medir con datos públicos. Las cifras salen de los mismos datos que usa el resto del sitio.">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          {problemas.map(([t, x], i) => (
            <div key={t} className="border-t-2 border-tinta pt-3">
              <p className="mono text-[0.72rem] text-tinta-tenue">0{i + 1}</p>
              <h3 className="fuente-titulo mt-1 text-xl font-bold">{t}</h3>
              <p className="mt-1 text-tinta-suave">{x}</p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion id="t-p-diferencia" pregunta="¿Qué lo diferencia?" titulo="Qué cambia frente a lo que ya se usa" texto="Comparación con las herramientas que se usan hoy para mirar un territorio. Es una descripción general de cada tipo de herramienta, no de un producto en particular.">
        <div className="overflow-x-auto">
          <table className="tabla min-w-[44rem]">
            <thead>
              <tr><th>Qué se necesita</th><th>Portal de datos abiertos</th><th>Mapa en línea</th><th>Hoja de cálculo</th><th className="!text-tinta">OTEA</th></tr>
            </thead>
            <tbody>
              {[
                ["Tener las capas oficiales", "Sí, por separado", "Algunas", "Si alguien las baja", "Sí, ya cruzadas"],
                ["Minutos caminando por la ladera", "No", "Rutas de ciudad, no por manzana", "No", "Sí, para cada manzana"],
                ["Comparar barrios con la comuna", "No", "No", "A mano", "Sí, en cada indicador"],
                ["Saber fuente, fecha y límites de cada cifra", "Por conjunto", "No", "Depende de quién la arme", "Sí, en cada bloque"],
                ["Usarlo sin saber de mapas o SIG", "Difícil", "Sí", "Más o menos", "Sí"],
              ].map((f) => (
                <tr key={f[0]}>
                  <td className="font-semibold">{f[0]}</td>
                  <td className="text-tinta-suave">{f[1]}</td><td className="text-tinta-suave">{f[2]}</td><td className="text-tinta-suave">{f[3]}</td>
                  <td className="font-semibold text-marca">{f[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion mitad id="t-p-quien" pregunta="¿A quién le sirve?" titulo="Para quién y qué decisión facilita" texto="Son hipótesis de uso. Cada una se valida con entrevistas antes de llamar a alguien cliente.">
        <ul className="grid gap-4">
          {PARA_QUIEN.map((p) => (
            <li key={p.t} className="border-t border-nivel pt-3">
              <p className="font-semibold">{p.t}</p>
              <p className="text-sm text-tinta-suave">{p.d}</p>
              <p className="mono mt-1 text-[0.72rem] text-tinta-tenue">Decide: {p.decide}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion mitad id="t-p-hoy" pregunta="¿Qué hace hoy?" titulo="Lo que funciona y lo que viene" texto="Cada capacidad con su estado real. Lo que no funciona todavía no se presenta como si funcionara.">
        <ul className="grid gap-0">
          {CAPACIDADES.map((x) => (
            <li key={x.que} className="flex items-start justify-between gap-4 border-t border-nivel py-2.5">
              <div className="min-w-0">
                {x.to ? <Link to={x.to} className="font-semibold hover:text-marca hover:underline">{x.que}</Link> : <p className="font-semibold">{x.que}</p>}
                <p className="text-sm text-tinta-suave">{x.detalle}</p>
              </div>
              <Chip e={x.estado} />
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion id="t-p-niveles" pregunta="¿Cómo podría ofrecerse?" titulo="Tres niveles de producto" texto="Una propuesta de cómo crecer. No son servicios que ya se vendan: no hay precios, clientes ni contratos.">
        <div className="grid gap-px overflow-hidden rounded-xl bg-nivel md:grid-cols-3">
          {NIVELES.map((n) => (
            <div key={n.t} className="bg-papel p-6">
              <p className="mono text-[0.75rem] text-marca">{n.n}</p>
              <h3 className="fuente-titulo mt-1 text-2xl font-extrabold">{n.t}</h3>
              <p className="mt-2 text-tinta-suave">{n.d}</p>
              <p className="mt-4 border-t border-nivel pt-2 text-sm"><span className="mono text-[0.68rem] uppercase tracking-[0.06em] text-tinta-tenue">Hoy</span><br />{n.hoy}</p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion id="t-p-implementar" pregunta="¿Qué se necesita para llevarlo a otro lugar?" titulo="Implementar OTEA en otro territorio" texto="Los pasos, en orden. No es un botón: el tiempo y el costo dependen de los datos que tenga cada territorio y todavía no están estimados.">
        <ol className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-5">
          {PASOS_IMPLEMENTAR.map((p, i) => (
            <li key={p.t} className="border-t-2 border-tinta pt-3">
              <p className="mono text-[0.72rem] text-marca">Paso {i + 1}</p>
              <h3 className="mt-1 font-semibold">{p.t}</h3>
              <p className="mt-1 text-sm text-tinta-suave">{p.d}</p>
            </li>
          ))}
        </ol>
        <Aviso tono="info" titulo="¿Quieres una demostración?">
          Por ahora no hay un canal de contacto público dentro del sitio. El código y la documentación están en el repositorio del proyecto; la forma más directa es escribir al equipo de OTEA por los canales de Territorio INN.
        </Aviso>
      </Seccion>

      <Seccion mitad id="t-p-existe" pregunta="¿Ya existe algo así?" titulo="Lo que encontramos" texto="No es una revisión exhaustiva: hay que confirmarlo con la Alcaldía y la comunidad.">
        <dl className="grid gap-4">
          <div className="border-t border-nivel pt-3">
            <dt className="font-semibold">ReportesMED (Alcaldía de Medellín)</dt>
            <dd className="mt-1 text-sm text-tinta-suave">App para reportar huecos, escombros, basuras y luminarias (según la <a className="font-semibold text-marca underline" href="https://www.medellin.gov.co/es/sala-de-prensa/noticias/con-reportesmed-ciudadanos-podran-reportar-escombros-huecos-en-las-calles-y-danos-en-luminarias/" target="_blank" rel="noopener noreferrer">noticia de 2022</a>). No cubre andenes, escaleras ni accesibilidad, y no es un mapa de decisión por comuna.</dd>
          </div>
          <div className="border-t border-nivel pt-3">
            <dt className="font-semibold">Datos geográficos abiertos de la Alcaldía</dt>
            <dd className="mt-1 text-sm text-tinta-suave">Publica capas de movilidad, espacio público, POT, riesgo y seguridad; OTEA usa decenas de ellas. Lo que no encontramos es un análisis que las junte para una sola comuna.</dd>
          </div>
          <div className="border-t border-nivel pt-3">
            <dt className="font-semibold">Lo que no sabemos</dt>
            <dd className="mt-1 text-sm text-tinta-suave">Si la Alcaldía, una universidad o una organización de la comuna ya tiene un tablero parecido. Si existe, lo correcto es conectarse, no competir.</dd>
          </div>
        </dl>
      </Seccion>

      <Seccion mitad id="t-p-redes" pregunta="¿Y las redes sociales?" titulo="TikTok, Facebook y otras redes">
        <div className="grid gap-4">
          <Aviso tono="ojo" titulo="Lo que no hacemos">No sacamos información de redes con programas automáticos: los términos de servicio lo prohíben y lo que publica una persona sigue siendo un dato personal protegido por la Ley 1581 de 2012 aunque sea visible.</Aviso>
          <ul className="grid gap-2 text-sm text-tinta-suave">
            <li className="border-t border-nivel pt-2"><strong className="text-tinta">Que el vecino nos cuente a nosotros</strong>, con foto, ubicación y su permiso.</li>
            <li className="border-t border-nivel pt-2"><strong className="text-tinta">Páginas de organizaciones de la comuna</strong>, con su autorización.</li>
            <li className="border-t border-nivel pt-2"><strong className="text-tinta">Programas oficiales de investigación</strong> de las plataformas, si aceptan al proyecto (no verificamos si aplican para Colombia).</li>
            <li className="border-t border-nivel pt-2"><strong className="text-tinta">Siempre agregado</strong>: conteos por barrio y tema, nunca perfiles ni nombres.</li>
          </ul>
        </div>
      </Seccion>

      <Seccion id="t-p-validar" pregunta="¿Qué falta para confiar del todo?" titulo="Lo que falta validar" texto="Lo que el equipo tiene pendiente antes de presentar OTEA como producto.">
        <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {[
            "Hablar con una JAC o líderes de la comuna y recoger su opinión de las fichas de barrio.",
            "Probar el reporte de problemas con 15 o 20 vecinos reales.",
            "Medir en campo si los minutos caminando se parecen a la realidad en 3 o 4 recorridos.",
            "Confirmar condiciones de uso de los datos entregados (Emvarias y EPM) y de ReportesMED.",
            "Estimar el costo de implementar y mantener OTEA en otro territorio.",
            "Conseguir velocidades de buses y carros en la Carrera 49.",
          ].map((t) => <li key={t} className="border-t border-nivel pt-2.5">{t}</li>)}
        </ul>
      </Seccion>

      <Relacionados ids={["mapa", "fuentes", "barrio"]} />
    </div>
  );
}

export default function Propuesta() {
  const estado = useDatos<Indicadores>("indicadores.json");
  return <ConDatos estado={estado}>{(d) => <Contenido ind={d} />}</ConDatos>;
}
