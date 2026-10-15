import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { calcularIndice } from "../lib/indice";
import { useDatos } from "../lib/datos";
import { dec, dec2, fecha, num, pct } from "../lib/formato";
import type { Indicadores } from "../lib/tipos";
import { ConDatos } from "../components/Estado";
import { Aviso, BotonCabecera, Cabecera, Fuente, Kpi, Relacionados, Seccion } from "../components/Pagina";
import MiniMapaBarrios from "../components/MiniMapaBarrios";
import { Revelar } from "../components/Animacion";

type Conteo = { nombre: string; n: number };
type Seguridad = { hurto_2017: { total: number; por_barrio: Conteo[] }; homicidio_2017: { total: number; por_barrio: Conteo[] }; camaras: { total: number; por_barrio: Conteo[] } };
type Eje = { destinos: Record<string, { nombre: string; por_barrio: { barrio: string; minutos_ruta_rapida: number; minutos_por_la_49: number; pct_49_en_el_camino: number }[] }> };
type Fila = Record<string, number | string | null>;

const en = (l: Conteo[] | undefined, nombre: string) => l?.find((x) => x.nombre === nombre)?.n ?? 0;

/** Barra de dos filas: el barrio contra el total de la comuna, en la misma escala. */
function Comparar({ titulo, barrio, comuna, unidad, mayorEsMalo = true, dec: d = 1 }: { titulo: string; barrio: number | null; comuna: number | null; unidad: string; mayorEsMalo?: boolean; dec?: number }) {
  const max = Math.max(barrio ?? 0, comuna ?? 0, 0.0001);
  const f = (v: number | null) => (v == null ? "Sin dato" : v.toLocaleString("es-CO", { maximumFractionDigits: d }));
  const peor = barrio != null && comuna != null && (mayorEsMalo ? barrio > comuna : barrio < comuna);
  return (
    <div className="border-t border-nivel pt-3">
      <p className="text-sm font-semibold">{titulo}</p>
      {[{ n: "Este barrio", v: barrio, c: peor ? "rgb(var(--peligro))" : "rgb(var(--marca))" }, { n: "Toda la comuna", v: comuna, c: "rgb(var(--tinta))" }].map((r) => (
        <div key={r.n} className="mt-2 grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-xs">
          <span className="text-tinta-suave">{r.n}</span>
          <span className="relative h-2.5 rounded-full bg-papel-hondo"><span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${((r.v ?? 0) / max) * 100}%`, background: r.c, transition: "width 600ms ease" }} /></span>
          <span className="min-w-[3.5rem] text-right font-semibold tabular-nums">{f(r.v)} {unidad}</span>
        </div>
      ))}
      {peor && <p className="mt-1.5 text-xs font-medium text-peligro">Peor que el promedio de la comuna</p>}
    </div>
  );
}

/** Lee en voz alta con la voz del navegador (sin servicios externos). Si no existe, el botón no aparece. */
function leer(texto: string) {
  const s = window.speechSynthesis;
  if (s.speaking) return s.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "es-CO";
  s.speak(u);
}

/** Síntesis: lo primero que hay que saber del barrio, en palabras, con su ubicación en la comuna. */
function Sintesis({ b, mio, puesto, total, acc, hue, ir, pob }: {
  b: Indicadores["barrios"][number]; mio: ReturnType<typeof calcularIndice>[number]; puesto: number; total: number;
  acc: Fila | undefined; hue: { total: number; pendientes: number } | undefined; nombres: string[]; ir: (n: string) => void; pob: Record<string, number>;
}) {
  const orden = [...mio.componentes].sort((x, y) => x.puntos - y.puntos);
  const debil = orden[0];
  const fuerte = orden[orden.length - 1];
  const f = (v: number | null, u: string) => (v == null ? "sin dato" : `${v.toLocaleString("es-CO", { maximumFractionDigits: 2 })}${u ? ` ${u}` : ""}`);
  return (
    <section aria-labelledby="t-b-sint" className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <p className="seccion-pregunta">En resumen</p>
        <h2 id="t-b-sint" className="seccion-titulo">Lo primero que hay que saber de {b.nombre}</h2>
        <ul className="mt-5 grid gap-4">
          <li className="border-t-2 border-tinta pt-3">
            <p className="text-sm text-tinta-suave">Frente a los otros barrios de la comuna</p>
            <p className="mt-1 text-lg leading-snug"><strong className="fuente-titulo text-2xl">Puesto {puesto} de {total}</strong> en el índice de entorno, con {mio.total} de 100 puntos.</p>
          </li>
          <li className="border-t border-nivel pt-3">
            <p className="text-sm text-tinta-suave">Donde está más débil</p>
            <p className="mt-1 text-lg leading-snug"><strong>{debil.nombre}</strong>: {f(debil.valor, debil.unidad)}. Es el aspecto con menos puntos ({debil.puntos} de 100).</p>
          </li>
          <li className="border-t border-nivel pt-3">
            <p className="text-sm text-tinta-suave">Donde está mejor</p>
            <p className="mt-1 text-lg leading-snug"><strong>{fuerte.nombre}</strong>: {f(fuerte.valor, fuerte.unidad)} ({fuerte.puntos} de 100).</p>
          </li>
          {acc && (
            <li className="border-t border-nivel pt-3">
              <p className="text-sm text-tinta-suave">Para llegar al Metro o al Metrocable</p>
              <p className="mt-1 text-lg leading-snug">{pct(acc.transporte_masivo_10min_pct as number)} de su gente llega caminando en 10 minutos o menos.</p>
            </li>
          )}
          {hue && (
            <li className="border-t border-nivel pt-3">
              <p className="text-sm text-tinta-suave">Lo que ya se reportó</p>
              <p className="mt-1 text-lg leading-snug">{num(hue.total)} reportes de huecos desde 2020, {num(hue.pendientes)} siguen pendientes.</p>
            </li>
          )}
        </ul>
      </div>
      <figure className="min-w-0">
        <div className="rounded-xl bg-papel-hondo p-3">
          <MiniMapaBarrios valores={pob} unidad="personas" seleccionado={b.nombre} onElegir={ir} formato={num} />
        </div>
        <figcaption className="mt-2 text-sm text-tinta-tenue">{b.nombre} dentro de la comuna. Más oscuro, más población (Censo 2018). Toca otro barrio para cambiar de ficha.</figcaption>
      </figure>
    </section>
  );
}

/** Sin barrio elegido (o con un código que no existe): elegir en el mapa o en la lista. */
function Elegir({ ind, codigoMalo }: { ind: Indicadores; codigoMalo?: string }) {
  const ir = useNavigate();
  const pob = Object.fromEntries(ind.barrios.map((x) => [x.nombre, x.poblacion_2018 ?? 0]));
  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Mi barrio" icono="personas" titulo="Elige tu barrio" texto="Cada barrio tiene una ficha con su gente, sus servicios cercanos, el riesgo de ladera, lo que ya se reportó y cómo se compara con el resto de la comuna." />
      {codigoMalo && <Aviso tono="ojo" titulo="Ese barrio no está en la comuna">No hay un barrio de Santa Cruz con el código «{codigoMalo}». Elige uno en el mapa o en la lista.</Aviso>}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl bg-papel-hondo p-3">
          <MiniMapaBarrios valores={pob} unidad="personas" onElegir={(n) => { const x = ind.barrios.find((y) => y.nombre === n); if (x) ir(`/barrios/${x.codigo}`); }} formato={num} />
        </div>
        <ul className="border-t-2 border-tinta">
          {[...ind.barrios].sort((a, z) => a.nombre.localeCompare(z.nombre)).map((x) => (
            <li key={x.codigo}>
              <Link to={`/barrios/${x.codigo}`} className="group flex items-baseline justify-between gap-4 border-b border-nivel py-3.5">
                <span className="text-lg font-semibold group-hover:text-marca">{x.nombre}</span>
                <span className="mono text-[0.75rem] text-tinta-tenue">{num(x.poblacion_2018)} personas · {dec(x.area_ha)} ha</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Fuente ids={["barrios", "manzanas_censo"]} />
    </div>
  );
}

function Contenido({ ind, seg, eje }: { ind: Indicadores; seg: Seguridad | null; eje: Eje | null }) {
  const { codigo } = useParams();
  const ir = useNavigate();
  const hallado = ind.barrios.find((x) => x.codigo === codigo);
  const b = hallado ?? ind.barrios[0];
  const [params, setParams] = useSearchParams();
  const rec = useDatos<{ huecos: { por_barrio: { barrio: string; total: number; arreglados: number; pendientes: number; dias_mediana: number | null }[] }; obras: { por_barrio: Record<string, number> }; quebradas: { por_barrio: Record<string, number> } }>("reclamos.json");
  const hue = rec.estado === "listo" ? rec.datos.huecos.por_barrio.find((x) => x.barrio === b.nombre) : undefined;
  const obrasPedidas = rec.estado === "listo" ? rec.datos.obras.por_barrio[b.nombre] : undefined;
  const quebReportes = rec.estado === "listo" ? rec.datos.quebradas.por_barrio[b.nombre] : undefined;
  if (!hallado) return <Elegir ind={ind} codigoMalo={codigo} />;
  const otro = ind.barrios.find((x) => x.codigo === params.get("vs") && x.codigo !== b.codigo);
  const ranking = calcularIndice(ind);
  const mio = ranking.find((x) => x.codigo === b.codigo)!;
  const puesto = ranking.indexOf(mio) + 1;
  const hablar = `${b.nombre}. ${num(b.poblacion_2018)} personas. ${dec2(b.espacio_publico_m2_hab)} metros cuadrados de espacio público por habitante. Puesto ${puesto} de ${ranking.length} en el índice de entorno, con ${mio.total} puntos de 100.`;
  const c = ind.comuna;
  const acc = (ind.accesibilidad?.barrios as Fila[] | undefined)?.find((x) => x.barrio === b.nombre);
  const accC = ind.accesibilidad?.comuna as Fila | undefined;
  const e49 = eje?.destinos.transporte_masivo.por_barrio.find((x) => x.barrio === b.nombre);
  const atrMil = (x: { atropellos: number; poblacion_2018: number | null }) => (x.poblacion_2018 ? (x.atropellos / x.poblacion_2018) * 1000 : null);
  const anchoB = ind.infraestructura?.andenes.barrios.find((x: Fila) => x.barrio === b.nombre) as Fila | undefined;

  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera
        etiqueta={`Ficha de barrio · código ${b.codigo}`}
        icono="personas"
        titulo={b.nombre}
        texto={<>{num(b.poblacion_2018)} personas y {num(b.viviendas_2018)} viviendas (Censo 2018) en {dec(b.area_ha)} hectáreas. Lo que los datos públicos dicen de este barrio, comparado con el resto de la comuna.</>}
      >
        <BotonCabecera to={`/mapa?barrio=${b.codigo}`}>Verlo en el mapa</BotonCabecera>
        <button type="button" onClick={() => window.print()} className="boton boton-2 no-imprimir">Imprimir ficha</button>
        {"speechSynthesis" in window && (
          <button type="button" onClick={() => leer(hablar)} className="boton boton-2 no-imprimir">Escuchar resumen</button>
        )}
      </Cabecera>

      <nav aria-label="Cambiar de barrio" className="no-imprimir -mt-6 flex flex-wrap items-center gap-1.5">
        <span className="mono mr-1 text-[0.7rem] uppercase tracking-[0.06em] text-tinta-tenue">Cambiar de barrio</span>
        {ind.barrios.map((x) => (
          <button key={x.codigo} type="button" onClick={() => ir(`/barrios/${x.codigo}`)} aria-pressed={x.codigo === b.codigo} className="chip !py-1 !text-[0.82rem]">
            {x.nombre}
          </button>
        ))}
      </nav>

      <Sintesis b={b} mio={mio} puesto={puesto} total={ranking.length} acc={acc} hue={hue} nombres={ind.barrios.map((x) => x.nombre)} ir={(n) => { const x = ind.barrios.find((y) => y.nombre === n); if (x) ir(`/barrios/${x.codigo}`); }} pob={Object.fromEntries(ind.barrios.map((x) => [x.nombre, x.poblacion_2018 ?? 0]))} />

      <Seccion id="t-b-cifras" pregunta="¿Cómo es el barrio?" titulo="Lo básico" texto="Quiénes viven aquí, qué tan apretados y con cuánto espacio público y equipamientos cuentan." fuente={<Fuente ids={["manzanas_censo", "espacio_publico", "equipamientos"]} calculo="cifras por barrio calculadas por OTEA" />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            <Kpi key="p" valor={num(b.poblacion_2018)} texto="personas" nota={`${pct(((b.poblacion_2018 ?? 0) / (c.poblacion_2018 ?? 1)) * 100)} de la comuna`} />,
            <Kpi key="d" valor={num(Math.round(b.densidad_hab_ha ?? 0))} texto="habitantes por hectárea" nota={`Comuna: ${num(Math.round(c.densidad_hab_ha ?? 0))}`} tono={(b.densidad_hab_ha ?? 0) > (c.densidad_hab_ha ?? 0) ? "ambar" : "verde"} />,
            <Kpi key="e" valor={`${dec2(b.espacio_publico_m2_hab)} m²`} texto="de espacio público por habitante" nota="Referencia nacional: 15 m²" tono="rojo" />,
            <Kpi key="q" valor={num(b.equipamientos)} texto="equipamientos colectivos" nota={`${b.sedes_educativas} sedes educativas`} />,
          ].map((k, i) => <Revelar key={i} retraso={i * 50} className="h-full">{k}</Revelar>)}
        </div>
      </Seccion>

      <Seccion id="t-b-indice" pregunta="¿Cómo le va frente a los otros 10 barrios?" titulo="Índice de entorno" texto="Un puntaje de 0 a 100 que resume cuatro condiciones del entorno. Sirve para ordenar los barrios de la comuna, no para compararlos con otras ciudades." fuente={<Fuente ids={["espacio_publico", "siniestros_viales", "amenaza_movimiento_masa"]} calculo="índice relativo de OTEA" />} metodo={<><p>Cada componente se pone en una escala de 0 a 100 entre los 11 barrios: el mejor de la comuna vale 100 y el peor 0. El índice es el promedio de los cuatro, con el mismo peso.</p><p>Componentes: <strong>espacio público por habitante</strong>, <strong>minutos caminando al Metro o Metrocable</strong>, <strong>atropellos por 1.000 habitantes</strong> (2019 a 2025) y <strong>superficie con amenaza alta</strong> (POT).</p><p><strong>Qué no dice:</strong> no es un indicador oficial, no mide calidad de vida y un puntaje bajo no significa que el barrio esté "mal" en términos absolutos, solo que está por debajo de sus vecinos en esos cuatro aspectos.</p></>}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-t-2 border-tinta pt-3">
            <p className="fuente-titulo text-5xl font-extrabold tabular-nums text-marca">{mio.total}<span className="text-base font-medium text-tinta-suave"> / 100</span></p>
            <p className="text-sm text-tinta-suave">Puesto {puesto} de {ranking.length}</p>
            <ul className="mt-5 space-y-4 text-sm">
              {mio.componentes.map((c) => (
                <li key={c.clave} className="grid grid-cols-[1fr_6rem_2.2rem] items-center gap-2">
                  <span>{c.nombre}</span>
                  <span className="h-2 rounded-full bg-papel-hondo"><span className="block h-full rounded-full bg-marca" style={{ width: `${c.puntos}%` }} /></span>
                  <span className="text-right font-semibold tabular-nums">{c.puntos}</span>
                </li>
              ))}
            </ul>
          </div>
          <ol className="border-t-2 border-tinta pt-2 text-sm">
            {ranking.map((r, i) => (
              <li key={r.codigo}>
                <Link to={`/barrios/${r.codigo}`} className={`grid grid-cols-[1.5rem_1fr_5rem_2rem] items-center gap-2 rounded-md px-1 py-1 hover:bg-papel-hondo ${r.codigo === b.codigo ? "bg-papel-hondo font-bold" : ""}`}>
                  <span className="tabular-nums text-tinta-suave">{i + 1}</span>
                  <span>{r.nombre}</span>
                  <span className="h-2 rounded-full bg-papel-hondo"><span className="block h-full rounded-full" style={{ width: `${r.total}%`, background: r.codigo === b.codigo ? "rgb(var(--marca))" : "rgb(var(--tinta) / 0.25)" }} /></span>
                  <span className="text-right tabular-nums">{r.total}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </Seccion>

      <Seccion mitad id="t-b-vs" pregunta="¿Y frente a un barrio vecino?" titulo="Compararlo con otro barrio" texto="Elige un segundo barrio para ver los cuatro componentes lado a lado. Útil para argumentar en una reunión o una carta.">
        <div className="no-imprimir mb-3 flex flex-wrap gap-2">
          {ind.barrios.filter((x) => x.codigo !== b.codigo).map((x) => (
            <button key={x.codigo} type="button" aria-pressed={x.codigo === otro?.codigo} onClick={() => setParams(x.codigo === otro?.codigo ? {} : { vs: x.codigo })}
              className="chip !py-1 !text-xs">{x.nombre}</button>
          ))}
        </div>
        {otro ? (
          (() => {
            const po = ranking.find((x) => x.codigo === otro.codigo)!;
            const f = (v: number | null) => (v == null ? "Sin dato" : v.toLocaleString("es-CO", { maximumFractionDigits: 2 }));
            const peor = mio.componentes.map((c, i) => ({ c, o: po.componentes[i] })).filter(({ c, o }) => c.puntos <= o.puntos - 10);
            return (
              <>
              <div className="overflow-x-auto rounded-2xl border border-nivel bg-superficie shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-nivel text-xs text-tinta-suave"><th className="p-3 font-medium">Componente</th><th className="p-3 font-semibold text-tinta">{b.nombre}</th><th className="p-3 font-semibold text-tinta">{otro.nombre}</th></tr></thead>
                  <tbody>
                    {mio.componentes.map((c, i) => {
                      const o = po.componentes[i];
                      return (
                        <tr key={c.clave} className="border-b border-nivel/60">
                          <td className="p-3">{c.nombre}</td>
                          <td className={`p-3 tabular-nums ${c.puntos >= o.puntos ? "font-bold" : ""}`}>{f(c.valor)} {c.unidad} <span className="text-xs text-tinta-suave">({c.puntos})</span></td>
                          <td className={`p-3 tabular-nums ${o.puntos >= c.puntos ? "font-bold" : ""}`}>{f(o.valor)} {o.unidad} <span className="text-xs text-tinta-suave">({o.puntos})</span></td>
                        </tr>
                      );
                    })}
                    <tr><td className="p-3 font-semibold">Índice de entorno</td><td className="p-3 text-lg font-bold tabular-nums">{mio.total}</td><td className="p-3 text-lg font-bold tabular-nums">{po.total}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 rounded-2xl border border-nivel bg-superficie p-4 text-sm shadow-sm">
                <p className="font-semibold">Para argumentar</p>
                {peor.length === 0 ? (
                  <p className="mt-1 text-tinta-suave">{b.nombre} no queda claramente peor que {otro.nombre} en ningún componente (diferencia menor a 10 puntos).</p>
                ) : (
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {peor.map(({ c, o }) => (
                      <li key={c.clave}>{c.nombre}: {f(c.valor)} {c.unidad} en {b.nombre} frente a {f(o.valor)} {o.unidad} en {otro.nombre}.</li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-tinta-suave">Comparación entre barrios de la comuna con cifras de la Alcaldía y el DANE; el puntaje es relativo, no oficial.</p>
              </div>
              </>
            );
          })()
        ) : (
          <p className="vacio text-sm">Elige arriba un segundo barrio para ver la comparación.</p>
        )}
      </Seccion>

      <Seccion mitad id="t-b-comp" pregunta="¿Está por encima o por debajo del promedio?" titulo="Este barrio frente a la comuna" texto="Misma escala para el barrio y para toda la comuna. En rojo, cuando el barrio queda peor que el promedio." fuente={<Fuente ids={["espacio_publico", "siniestros_viales", "amenaza_movimiento_masa"]} calculo="comparación hecha por OTEA" />}>
        <div className="grid gap-3 md:grid-cols-2">
          <Comparar titulo="Espacio público por habitante" barrio={b.espacio_publico_m2_hab} comuna={c.espacio_publico_m2_hab} unidad="m²" mayorEsMalo={false} dec={2} />
          <Comparar titulo="Atropellos por cada 1.000 habitantes" barrio={atrMil(b)} comuna={atrMil({ atropellos: ind.barrios.reduce((s, x) => s + x.atropellos, 0), poblacion_2018: c.poblacion_2018 ?? null })} unidad="" />
          <Comparar titulo="Superficie con amenaza alta por movimiento en masa" barrio={b.amenaza_alta_pct} comuna={c.amenaza_pct?.Alta ?? null} unidad="%" />
          {acc && accC && <Comparar titulo="Minutos promedio caminando al Metro o Metrocable" barrio={acc.transporte_masivo_promedio_min as number} comuna={accC.transporte_masivo_promedio_min as number} unidad="min" />}
        </div>
      </Seccion>

      <Seccion mitad id="t-b-mov" pregunta="¿Qué tan fácil es salir del barrio?" titulo="Movilidad y la Carrera 49" texto="Minutos estimados caminando por la red de calles, andenes y escaleras, con la pendiente de cada tramo. No son recorridos medidos en campo." fuente={<Fuente ids={["vias", "manzanas_censo", "siniestros_viales"]} calculo="tiempos de caminata de OTEA" />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {acc && <Kpi valor={pct(acc.transporte_masivo_10min_pct as number)} texto="de las personas llegan al Metro en 10 min o menos" tono="ambar" />}
          {acc && <Kpi valor={`${dec(acc.transporte_masivo_promedio_min as number)} min`} texto="promedio hasta la estación más cercana" />}
          {e49 && <Kpi valor={`${dec(e49.minutos_ruta_rapida)} → ${dec(e49.minutos_por_la_49)}`} texto="min a la estación: ruta rápida contra ir por la 49" nota={`${pct(e49.pct_49_en_el_camino)} de la ruta rápida ya va por la 49`} tono={e49.minutos_por_la_49 - e49.minutos_ruta_rapida <= 3 ? "verde" : "rojo"} />}
          <Kpi valor={num(b.atropellos)} texto="atropellos registrados (2019 a 2025)" nota={`${num(b.siniestros_viales)} siniestros en total`} tono={(atrMil(b) ?? 0) > (atrMil({ atropellos: ind.barrios.reduce((t, x) => t + x.atropellos, 0), poblacion_2018: c.poblacion_2018 ?? null }) ?? 0) ? "rojo" : "verde"} />
        </div>
        <p className="mt-3 text-sm">
          <Link className="font-semibold text-marca underline underline-offset-2" to="/corredor-49">Ver el análisis completo de la Carrera 49</Link>
        </p>
      </Seccion>

      {(hue || obrasPedidas != null || quebReportes != null) && (
        <Seccion mitad id="t-b-rec" pregunta="¿Qué ya le pidió la gente a la Alcaldía?" titulo="Huecos y reclamos" texto="Reportes registrados en los sistemas de la Alcaldía. Son lo que alguien reportó, no un inventario de todo lo dañado." fuente={<Fuente ids={["huecos", "solicitudes_obras", "solicitudes_quebradas"]} />}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {hue && <Kpi valor={num(hue.total)} texto="reportes de huecos desde 2020" nota={`${num(hue.arreglados)} ya figuran arreglados`} />}
            {hue && <Kpi valor={num(hue.pendientes)} texto="huecos siguen pendientes" nota={hue.dias_mediana != null ? `La mitad se arregló en ${hue.dias_mediana} días o menos` : undefined} tono={hue.pendientes > 20 ? "rojo" : "ambar"} />}
            {obrasPedidas != null && <Kpi valor={num(obrasPedidas)} texto="obras pedidas a Infraestructura" />}
            {quebReportes != null && <Kpi valor={num(quebReportes)} texto="solicitudes sobre quebradas" />}
          </div>
          <p className="mt-3 text-sm">
            <Link className="font-semibold text-marca underline underline-offset-2" to={`/mapa?capas=huecos&barrio=${b.codigo}`}>Ver los huecos de este barrio en el mapa</Link>
            {" · "}
            <Link className="font-semibold text-marca underline underline-offset-2" to="/reclamos">Todos los reclamos de la comuna</Link>
          </p>
        </Seccion>
      )}

      {seg && (
        <Seccion id="t-b-seg" pregunta="¿Qué se sabe de seguridad?" titulo="Seguridad y cuidado del espacio" texto="Hurto y homicidio son de 2017, el último año que la Alcaldía publicó por barrio. Se muestran solo conteos, nunca ubicaciones de víctimas." fuente={<Fuente ids={["hurto_2017", "homicidio_2017", "cctv_camaras", "andenes"]} />}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi valor={num(en(seg.hurto_2017.por_barrio, b.nombre))} texto="hurtos en 2017" nota={`Comuna: ${num(seg.hurto_2017.total)}`} />
            <Kpi valor={num(en(seg.homicidio_2017.por_barrio, b.nombre))} texto="homicidios en 2017" nota={`Comuna: ${num(seg.homicidio_2017.total)}`} />
            <Kpi valor={num(en(seg.camaras.por_barrio, b.nombre))} texto="cámaras de vigilancia registradas" nota={`Comuna: ${num(seg.camaras.total)}`} />
            {anchoB && <Kpi valor={`${dec2(anchoB.ancho_mediano_m as number)} m`} texto="ancho mediano de andén" nota={`${pct(anchoB.andenes_angostos_pct as number)} más angosto que 1,2 m`} tono={(anchoB.ancho_mediano_m as number) < 1.2 ? "rojo" : "verde"} />}
          </div>
        </Seccion>
      )}

      {/* Pie solo para la hoja impresa: de dónde sale cada cosa. */}
      <p className="hidden text-xs print:block">
        OTEA, Observatorio Santa Cruz. Cifras de la Alcaldía de Medellín y el DANE (Censo 2018), calculadas el {fecha(ind.generado)}; impreso el {fecha(new Date().toISOString())}.
        El índice de entorno es un puntaje relativo entre los barrios de la comuna, no una cifra oficial. Fuentes y límites en la sección Fuentes y calidad del sitio.
      </p>

      <Relacionados ids={["prioridades", "lideres", "indicadores"]} />
    </div>
  );
}

export default function Barrio() {
  const ind = useDatos<Indicadores>("indicadores.json");
  const seg = useDatos<Seguridad>("seguridad.json");
  const eje = useDatos<Eje>("eje49.json");
  return (
    <ConDatos estado={ind}>
      {(d) => <Contenido ind={d} seg={seg.estado === "listo" ? seg.datos : null} eje={eje.estado === "listo" ? eje.datos : null} />}
    </ConDatos>
  );
}
