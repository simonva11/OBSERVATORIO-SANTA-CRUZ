import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../lib/datos";
import { dec, fecha, num, pct } from "../lib/formato";
import type { Indicadores } from "../lib/tipos";
import { ConDatos } from "../components/Estado";
import { Aviso, BotonCabecera, Cabecera, Fuente, Kpi, Relacionados, Seccion } from "../components/Pagina";
import { Revelar } from "../components/Animacion";
import MiniMapaBarrios from "../components/MiniMapaBarrios";

type Fila = {
  nombre: string; personas: number; viviendas: number; manzanas: number;
  personas_alta: number; viviendas_alta: number; manzanas_alta: number; manzanas_mayormente_alta: number; pct_personas_alta: number;
  personas_media: number; viviendas_media: number; pct_personas_media: number;
  personas_rnm: number; viviendas_rnm: number; pct_personas_rnm: number;
};
type Riesgo = { generado: string; metodo: string; comuna: Fila; barrios: Fila[] };

function Contenido({ r, ind }: { r: Riesgo; ind: Indicadores }) {
  // Los barrios ya vienen ordenados de más a menos personas en amenaza alta
  const [sel, setSel] = useState(r.barrios[0].nombre);
  const b = r.barrios.find((x) => x.nombre === sel) ?? r.barrios[0];
  const c = r.comuna;
  const maxAlta = Math.max(1, ...r.barrios.map((x) => x.personas_alta));
  const valores = useMemo(() => Object.fromEntries(r.barrios.map((x) => [x.nombre, x.personas_alta])), [r]);
  const area = (nombre: string) => ind.barrios.find((x) => x.nombre === nombre);
  const areaComuna = ind.comuna.amenaza_pct?.Alta ?? null;

  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera foto="laderas"
        etiqueta="Riesgo y ladera"
        icono="ladera"
        titulo="Riesgo de movimiento en masa"
        texto={<>Cuánta gente y cuántas viviendas de cada barrio están en zonas que el POT de Medellín marca con amenaza por movimientos en masa. Es un cruce de mapas oficiales de planeación con el Censo 2018: no es una predicción ni una alerta.</>}
        pregunta="¿Cuánta gente vive en zonas de amenaza, en qué barrios y a quién acudir?"
      >
        <BotonCabecera to="/mapa?capas=amenaza_movimiento_masa,riesgo_no_mitigable">Ver la amenaza en el mapa</BotonCabecera>
        <BotonCabecera to="/indicadores" claro>Indicadores</BotonCabecera>
      </Cabecera>

      <Aviso tono="ojo" titulo="OTEA no emite alertas">Esta página muestra mapas de planeación, no el estado del terreno hoy. Si ves grietas, hundimientos o agua saliendo de la ladera, o si hay una emergencia en curso, llama al <strong>123</strong>.</Aviso>

      <Seccion id="t-r-palabras" pregunta="¿Qué significa cada palabra?" titulo="Cuatro palabras que no son lo mismo" texto="Se confunden mucho y cambian lo que se puede concluir.">
        <dl className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Amenaza", "Qué tan probable es que el terreno se mueva en un lugar. La define el POT con estudios técnicos (alta, media o baja).", "Lo da la fuente oficial"],
            ["Exposición", "Cuánta gente y cuántas viviendas están dentro de esa zona. Es lo que calcula OTEA cruzando el POT con el Censo 2018.", "Lo calcula OTEA"],
            ["Vulnerabilidad", "Qué tan frágiles son esas viviendas y personas: materiales, cimientos, recursos para responder.", "No hay dato público por barrio"],
            ["Riesgo", "La combinación de las tres. El POT identifica zonas de «riesgo alto no mitigable», donde dice que las obras no alcanzan a reducirlo.", "Lo da la fuente oficial"],
          ].map(([t, d, x]) => (
            <div key={t} className="border-t-2 border-tinta pt-3">
              <dt className="fuente-titulo text-xl font-bold">{t}</dt>
              <dd className="mt-1 text-[0.95rem] text-tinta-suave">{d}</dd>
              <dd className="mono mt-2 text-[0.7rem] uppercase tracking-[0.05em] text-tinta-tenue">{x}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      <Seccion id="t-r-resumen" pregunta="¿Cuánta gente está expuesta?" titulo="En resumen" texto="Estimación para toda la comuna con el Censo 2018 y los polígonos oficiales del POT." fuente={<Fuente ids={["amenaza_movimiento_masa", "riesgo_no_mitigable", "manzanas_censo"]} calculo="exposición estimada por OTEA" />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            <Kpi key="a" valor={num(c.personas_alta)} texto="personas en zonas de amenaza alta" nota={`${pct(c.pct_personas_alta)} de la comuna`} tono="rojo" />,
            <Kpi key="v" valor={num(c.viviendas_alta)} texto="viviendas en zonas de amenaza alta" nota={`De ${num(c.viviendas)} viviendas`} tono="rojo" />,
            <Kpi key="n" valor={num(c.personas_rnm)} texto="personas en zonas de riesgo alto no mitigable" nota={`${num(c.viviendas_rnm)} viviendas`} tono="rojo" />,
            <Kpi key="p" valor={areaComuna == null ? "Sin dato" : pct(areaComuna)} texto="del área de la comuna está en amenaza alta" nota="Medido sobre el territorio, no sobre la población" tono="ambar" />,
          ].map((k, i) => <Revelar key={i} retraso={i * 50} className="h-full">{k}</Revelar>)}
        </div>
      </Seccion>

      <Seccion id="t-r-donde" pregunta="¿En qué barrios?" titulo="Dónde se concentra" texto="Personas que viven en amenaza alta, por barrio (estimado). Elige un barrio en el mapa o en la lista." siguiente={[{ to: "/mapa?capas=amenaza_movimiento_masa,riesgo_no_mitigable", texto: "Ver las zonas exactas en el mapa" }]}>
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-xl bg-papel-hondo p-3">
            <MiniMapaBarrios valores={valores} unidad="personas" seleccionado={sel} onElegir={setSel} formato={num} />
          </div>
          <div className="border-t-2 border-tinta pt-2">
            <h3 className="px-1 pb-2 text-base font-semibold">Barrios más expuestos</h3>
            <ol className="space-y-1">
              {r.barrios.map((x, i) => (
                <li key={x.nombre}>
                  <button
                    type="button"
                    aria-pressed={x.nombre === sel}
                    onClick={() => setSel(x.nombre)}
                    className={`grid w-full grid-cols-[1.4rem_1fr_auto] items-center gap-x-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${x.nombre === sel ? "bg-papel-hondo" : "hover:bg-papel-hondo/60"}`}
                  >
                    <span className="text-xs tabular-nums text-tinta-tenue">{i + 1}</span>
                    <span>
                      <span className="block font-medium">{x.nombre}</span>
                      <span className="mt-1 block h-1.5 rounded-full bg-papel-hondo">
                        <span className="block h-1.5 rounded-full bg-peligro" style={{ width: `${(x.personas_alta / maxAlta) * 100}%` }} />
                      </span>
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="block font-semibold">{num(x.personas_alta)}</span>
                      <span className="block text-xs text-tinta-suave">{pct(x.pct_personas_alta)} de su gente</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Seccion>

      <Seccion id="t-r-ficha" pregunta="¿Y en mi barrio?" titulo={`${b.nombre}, en detalle`} texto="Cifras estimadas del barrio elegido. Cambia de barrio con estos botones o en el mapa de arriba.">
        <nav aria-label="Elegir barrio" className="mb-3 flex flex-wrap gap-2">
          {r.barrios.map((x) => (
            <button key={x.nombre} type="button" onClick={() => setSel(x.nombre)} aria-pressed={x.nombre === sel}
              className="chip !py-1 !text-[0.85rem]">
              {x.nombre}
            </button>
          ))}
        </nav>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi valor={num(b.personas_alta)} texto="personas en amenaza alta" nota={`${pct(b.pct_personas_alta)} de ${num(b.personas)} habitantes`} tono="rojo" />
          <Kpi valor={num(b.viviendas_alta)} texto="viviendas en amenaza alta" nota={`De ${num(b.viviendas)} viviendas`} tono="rojo" />
          <Kpi valor={num(b.personas_media)} texto="personas en amenaza media" nota={`${pct(b.pct_personas_media)} de su gente`} tono="ambar" />
          <Kpi valor={num(b.personas_rnm)} texto="personas en riesgo alto no mitigable" nota={`${num(b.viviendas_rnm)} viviendas`} tono="rojo" />
        </div>
        <p className="mt-3 text-sm text-tinta-suave">
          {b.manzanas_alta === 0
            ? "Ninguna manzana de este barrio toca una zona de amenaza alta."
            : `${num(b.manzanas_alta)} de ${num(b.manzanas)} manzanas tocan una zona de amenaza alta; en ${num(b.manzanas_mayormente_alta)} de ellas más de la mitad del terreno está en amenaza alta.`}
          {area(b.nombre) && <> Del área del barrio, el {pct(area(b.nombre)!.amenaza_alta_pct)} está en amenaza alta y el {pct(area(b.nombre)!.amenaza_media_pct)} en amenaza media.</>}
        </p>
        <p className="mt-2 text-sm">
          <Link className="font-semibold text-marca underline underline-offset-2" to={`/barrios/${ind.barrios.find((x) => x.nombre === b.nombre)?.codigo ?? ""}`}>Ver la ficha completa de {b.nombre}</Link>
        </p>
      </Seccion>

      <Seccion id="t-r-tabla" pregunta="¿Todas las cifras juntas?" titulo="Todos los barrios" texto="Las mismas cifras en una sola tabla." fuente={<Fuente ids={["amenaza_movimiento_masa", "riesgo_no_mitigable", "manzanas_censo"]} calculo="exposición estimada por OTEA" />}>
        <div className="overflow-x-auto">
          <table className="tabla min-w-[720px]">
            <thead>
              <tr>
                <th>Barrio</th>
                <th className="text-right">Habitantes</th>
                <th className="text-right">En amenaza alta</th>
                <th className="text-right">% de su gente</th>
                <th className="text-right">Viviendas en alta</th>
                <th className="text-right">En riesgo no mitigable</th>
                <th className="text-right">Área en alta</th>
              </tr>
            </thead>
            <tbody>
              {r.barrios.map((x) => (
                <tr key={x.nombre} className={x.nombre === sel ? "bg-papel-hondo" : ""}>
                  <td className="py-1.5 pr-3">
                    <button type="button" onClick={() => setSel(x.nombre)} className="font-medium text-marca underline-offset-2 hover:underline">{x.nombre}</button>
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{num(x.personas)}</td>
                  <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{num(x.personas_alta)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{pct(x.pct_personas_alta)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{num(x.viviendas_alta)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{num(x.personas_rnm)}</td>
                  <td className="py-1.5 text-right tabular-nums">{pct(area(x.nombre)?.amenaza_alta_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion mitad id="t-r-alerta" pregunta="¿A quién acudir?" titulo="Alerta temprana y canales oficiales" texto="OTEA no emite alertas ni predice lluvias o deslizamientos. Para eso están estos canales oficiales.">
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="border-t-2 border-tinta pt-3 text-sm">
            <p className="font-semibold">SIATA, alerta temprana del Valle de Aburrá</p>
            <p className="mt-1 text-tinta-suave">Vigila minuto a minuto las condiciones del clima y los ríos, y muestra el radar de lluvia acumulada. Es lo que hay que mirar en temporada de lluvias.</p>
            <p className="mt-2"><span className="font-semibold">Cómo: </span>Entrar a la página. Para consultas, contacto@siata.gov.co.</p>
            <a className="mt-2 inline-block font-semibold text-marca underline underline-offset-2" href="https://siata.gov.co" target="_blank" rel="noopener noreferrer">siata.gov.co</a>
          </li>
          <li className="border-t-2 border-tinta pt-3 text-sm">
            <p className="font-semibold">DAGRD, Gestión del Riesgo de Desastres</p>
            <p className="mt-1 text-tinta-suave">Monitorea el riesgo en la ciudad y da asesorías, acompañamiento y talleres a juntas y grupos comunitarios.</p>
            <p className="mt-2"><span className="font-semibold">Cómo: </span>Línea Única 604 44 44 144 para pedir una asesoría o un taller para su junta. Si es una emergencia en curso, llame al 123.</p>
            <a className="mt-2 inline-block font-semibold text-marca underline underline-offset-2" href="https://www.medellin.gov.co/es/dagrd/" target="_blank" rel="noopener noreferrer">Página del DAGRD</a>
          </li>
        </ul>
        <p className="mt-3 text-sm text-tinta-suave">Para pedir una visita técnica o una obra de mitigación por escrito, use la carta de riesgo del <Link className="font-semibold text-marca underline underline-offset-2" to="/lideres">Kit para líderes</Link>.</p>
      </Seccion>

      <BasurasQuebradas />

      <Seccion id="t-r-metodo" pregunta="¿Qué tan confiable es?" titulo="Cómo se calculó y qué no dice">
        <div className="max-w-4xl space-y-2 text-[0.95rem] leading-relaxed text-tinta-suave">
          <p>{r.metodo}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-tinta">Es una estimación.</strong> El Censo cuenta personas por manzana, no por vivienda; por eso se reparten según el terreno que cae en cada zona y las cifras se redondean.</li>
            <li><strong className="text-tinta">Amenaza no es lo mismo que riesgo.</strong> La amenaza alta mide qué tan probable es el movimiento del terreno; el riesgo alto no mitigable es una condición aparte que identifica el POT. Por eso se muestran por separado.</li>
            <li><strong className="text-tinta">Periodo.</strong> Los polígonos son del POT (Acuerdo 48 de 2014), con la versión de la capa que publica la Alcaldía; la población es del Censo 2018. No reflejan obras de mitigación hechas después.</li>
            <li><strong className="text-tinta">No se predice nada.</strong> No se calcula cuándo ni dónde ocurrirá un evento: solo se cruzan datos oficiales.</li>
            <li>Fuentes: manzanas del Censo 2018 (DANE) y polígonos del POT de la Alcaldía de Medellín (Acuerdo 48 de 2014). Cifras calculadas el {fecha(r.generado)}. Detalle en <Link className="font-semibold text-marca underline underline-offset-2" to="/fuentes">Fuentes y calidad</Link>.</li>
          </ul>
          <p className="text-xs text-tinta-tenue">Área en amenaza alta de la comuna: {dec(areaComuna)} %.</p>
        </div>
      </Seccion>

      <Relacionados ids={["mapa", "lideres", "barrio"]} />
    </div>
  );
}

function BasurasQuebradas() {
  const d = useDatos<{ quebradas: { total: number; basuras: number } }>("reclamos.json");
  if (d.estado !== "listo") return null;
  const q = d.datos.quebradas;
  return (
    <Seccion mitad id="t-r-quebradas" pregunta="¿Qué reporta la gente?" titulo="Basuras en las quebradas" texto="La gente también reporta a la Alcaldía lo que ve en las quebradas." fuente={<Fuente ids={["solicitudes_quebradas"]} />}>
      <p className="text-sm leading-relaxed text-tinta-suave">
        Hay {q.total} solicitudes públicas sobre quebradas de la comuna y {q.basuras} son por basuras o escombros. Los residuos pueden tapar el cauce y agravar una creciente, por eso conviene cruzarlas con las zonas de amenaza.{" "}
        <Link className="font-semibold text-marca underline underline-offset-2" to="/mapa?capas=solicitudes_quebradas,amenaza_movimiento_masa">Verlas en el mapa</Link> o en <Link className="font-semibold text-marca underline underline-offset-2" to="/reclamos">Huecos y reclamos</Link>.
      </p>
    </Seccion>
  );
}

export default function RiesgoPagina() {
  const riesgo = useDatos<Riesgo>("riesgo.json");
  const ind = useDatos<Indicadores>("indicadores.json");
  return <ConDatos estado={riesgo}>{(r) => <ConDatos estado={ind}>{(i) => <Contenido r={r} ind={i} />}</ConDatos>}</ConDatos>;
}
