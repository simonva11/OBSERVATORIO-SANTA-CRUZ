import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { calcularIndice } from "../lib/indice";
import { useDatos } from "../lib/datos";
import { dec, dec2, fecha, num, pct } from "../lib/formato";
import type { Indicadores } from "../lib/tipos";
import { ConDatos } from "../components/Estado";
import { BotonCabecera, Cabecera, Kpi, Relacionados, Seccion } from "../components/Pagina";
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
    <div className="rounded-2xl border border-nivel bg-superficie p-4 shadow-sm">
      <p className="text-sm font-semibold">{titulo}</p>
      {[{ n: "Este barrio", v: barrio, c: peor ? "#c0583a" : "#6a4fe0" }, { n: "Toda la comuna", v: comuna, c: "#1b1d3a" }].map((r) => (
        <div key={r.n} className="mt-2 grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-xs">
          <span className="text-tinta-suave">{r.n}</span>
          <span className="relative h-2.5 rounded-full bg-papel-hondo"><span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${((r.v ?? 0) / max) * 100}%`, background: r.c, transition: "width 600ms ease" }} /></span>
          <span className="min-w-[3.5rem] text-right font-semibold tabular-nums">{f(r.v)} {unidad}</span>
        </div>
      ))}
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

function Contenido({ ind, seg, eje }: { ind: Indicadores; seg: Seguridad | null; eje: Eje | null }) {
  const { codigo } = useParams();
  const ir = useNavigate();
  const b = ind.barrios.find((x) => x.codigo === codigo) ?? ind.barrios[0];
  const [params, setParams] = useSearchParams();
  const rec = useDatos<{ huecos: { por_barrio: { barrio: string; total: number; arreglados: number; pendientes: number; dias_mediana: number | null }[] }; obras: { por_barrio: Record<string, number> }; quebradas: { por_barrio: Record<string, number> } }>("reclamos.json");
  const hue = rec.estado === "listo" ? rec.datos.huecos.por_barrio.find((x) => x.barrio === b.nombre) : undefined;
  const obrasPedidas = rec.estado === "listo" ? rec.datos.obras.por_barrio[b.nombre] : undefined;
  const quebReportes = rec.estado === "listo" ? rec.datos.quebradas.por_barrio[b.nombre] : undefined;
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
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-5 lg:px-8">
      <Cabecera
        etiqueta="Mi barrio"
        icono="personas"
        titulo={b.nombre}
        texto={<>{num(b.poblacion_2018)} personas y {num(b.viviendas_2018)} viviendas (Censo 2018) en {dec(b.area_ha)} hectáreas. Todo lo que el observatorio sabe de este barrio, en un solo lugar.</>}
      >
        <BotonCabecera to={`/mapa?barrio=${b.codigo}`}>Verlo en el mapa</BotonCabecera>
        <BotonCabecera to="/accesibilidad" claro>Accesibilidad</BotonCabecera>
      </Cabecera>
      <div className="no-imprimir -mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} className="rounded-full bg-superficie px-3 py-1.5 text-sm font-medium ring-1 ring-nivel transition hover:bg-menta">Imprimir ficha</button>
        {"speechSynthesis" in window && (
          <button type="button" onClick={() => leer(hablar)} className="rounded-full bg-superficie px-3 py-1.5 text-sm font-medium ring-1 ring-nivel transition hover:bg-menta">Escuchar resumen</button>
        )}
      </div>

      <nav aria-label="Elegir barrio" className="no-imprimir flex flex-wrap gap-2">
        {ind.barrios.map((x) => (
          <button key={x.codigo} type="button" onClick={() => ir(`/barrios/${x.codigo}`)} aria-pressed={x.codigo === b.codigo}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${x.codigo === b.codigo ? "bg-[#3a2d8f] text-white shadow" : "bg-superficie text-tinta ring-1 ring-nivel hover:bg-menta"}`}>
            {x.nombre}
          </button>
        ))}
      </nav>

      <Seccion id="t-b-cifras" titulo="Lo básico" texto="Datos del Censo 2018, el POT y el inventario oficial.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            <Kpi key="p" valor={num(b.poblacion_2018)} texto="personas" nota={`${pct(((b.poblacion_2018 ?? 0) / (c.poblacion_2018 ?? 1)) * 100)} de la comuna`} />,
            <Kpi key="d" valor={num(Math.round(b.densidad_hab_ha ?? 0))} texto="habitantes por hectárea" nota={`Comuna: ${num(Math.round(c.densidad_hab_ha ?? 0))}`} tono="ambar" />,
            <Kpi key="e" valor={`${dec2(b.espacio_publico_m2_hab)} m²`} texto="de espacio público por habitante" nota="Referencia nacional: 15 m²" tono="rojo" />,
            <Kpi key="q" valor={num(b.equipamientos)} texto="equipamientos colectivos" nota={`${b.sedes_educativas} sedes educativas`} />,
          ].map((k, i) => <Revelar key={i} retraso={i * 50} className="h-full">{k}</Revelar>)}
        </div>
      </Seccion>

      <Seccion id="t-b-indice" titulo="Índice de entorno" texto="De 0 a 100, comparando los 11 barrios entre sí. Promedia espacio público, cercanía al Metro, atropellos y amenaza alta con el mismo peso. Es una guía relativa, no una cifra oficial.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-nivel bg-superficie p-4 shadow-sm">
            <p className="text-4xl font-bold tabular-nums text-marca">{mio.total}<span className="text-base font-medium text-tinta-suave"> / 100</span></p>
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
          <ol className="rounded-2xl border border-nivel bg-superficie p-4 text-xs shadow-sm">
            {ranking.map((r, i) => (
              <li key={r.codigo}>
                <Link to={`/barrios/${r.codigo}`} className={`grid grid-cols-[1.5rem_1fr_5rem_2rem] items-center gap-2 rounded-md px-1 py-1 hover:bg-menta ${r.codigo === b.codigo ? "font-bold" : ""}`}>
                  <span className="tabular-nums text-tinta-suave">{i + 1}</span>
                  <span>{r.nombre}</span>
                  <span className="h-2 rounded-full bg-papel-hondo"><span className="block h-full rounded-full" style={{ width: `${r.total}%`, background: r.codigo === b.codigo ? "#6a4fe0" : "#9aa0d6" }} /></span>
                  <span className="text-right tabular-nums">{r.total}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </Seccion>

      <Seccion id="t-b-vs" titulo="Compararlo con otro barrio" texto="Elige un segundo barrio y mira los cuatro componentes lado a lado.">
        <div className="no-imprimir mb-3 flex flex-wrap gap-2">
          {ind.barrios.filter((x) => x.codigo !== b.codigo).map((x) => (
            <button key={x.codigo} type="button" aria-pressed={x.codigo === otro?.codigo} onClick={() => setParams(x.codigo === otro?.codigo ? {} : { vs: x.codigo })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${x.codigo === otro?.codigo ? "bg-[#1d4f9a] text-white" : "bg-superficie ring-1 ring-nivel hover:bg-menta"}`}>{x.nombre}</button>
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
          <p className="text-sm text-tinta-suave">Aún no has elegido un segundo barrio.</p>
        )}
      </Seccion>

      <Seccion id="t-b-comp" titulo="Este barrio frente a la comuna" texto="Rojo = peor que el total de la comuna.">
        <div className="grid gap-3 md:grid-cols-2">
          <Comparar titulo="Espacio público por habitante" barrio={b.espacio_publico_m2_hab} comuna={c.espacio_publico_m2_hab} unidad="m²" mayorEsMalo={false} dec={2} />
          <Comparar titulo="Atropellos por cada 1.000 habitantes" barrio={atrMil(b)} comuna={atrMil({ atropellos: ind.barrios.reduce((s, x) => s + x.atropellos, 0), poblacion_2018: c.poblacion_2018 ?? null })} unidad="" />
          <Comparar titulo="Superficie con amenaza alta por movimiento en masa" barrio={b.amenaza_alta_pct} comuna={c.amenaza_pct?.Alta ?? null} unidad="%" />
          {acc && accC && <Comparar titulo="Minutos promedio caminando al Metro o Metrocable" barrio={acc.transporte_masivo_promedio_min as number} comuna={accC.transporte_masivo_promedio_min as number} unidad="min" />}
        </div>
      </Seccion>

      <Seccion id="t-b-mov" titulo="Movilidad y la Carrera 49" texto="Tiempos caminando por la red de calles y escaleras, con la pendiente.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {acc && <Kpi valor={pct(acc.transporte_masivo_10min_pct as number)} texto="de las personas llegan al Metro en 10 min o menos" tono="ambar" />}
          {acc && <Kpi valor={`${dec(acc.transporte_masivo_promedio_min as number)} min`} texto="promedio hasta la estación más cercana" />}
          {e49 && <Kpi valor={`${dec(e49.minutos_ruta_rapida)} → ${dec(e49.minutos_por_la_49)}`} texto="min a la estación: ruta rápida contra ir por la 49" nota={`${pct(e49.pct_49_en_el_camino)} de la ruta rápida ya va por la 49`} tono={e49.minutos_por_la_49 - e49.minutos_ruta_rapida <= 3 ? "verde" : "rojo"} />}
          <Kpi valor={num(b.atropellos)} texto="atropellos registrados (2019 a 2025)" nota={`${num(b.siniestros_viales)} siniestros en total`} tono="rojo" />
        </div>
        <p className="mt-3 text-sm">
          <Link className="font-semibold text-marca underline underline-offset-2" to="/corredor-49">Ver el análisis completo de la Carrera 49</Link>
        </p>
      </Seccion>

      {(hue || obrasPedidas != null || quebReportes != null) && (
        <Seccion id="t-b-rec" titulo="Huecos y reclamos" texto="Lo que ya se reportó a la Alcaldía en este barrio. Son reportes, no un conteo de todo lo dañado.">
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
        <Seccion id="t-b-seg" titulo="Seguridad" texto="Hurto y homicidio son de 2017, el último año publicado. Solo conteos por barrio, nunca puntos de víctimas.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi valor={num(en(seg.hurto_2017.por_barrio, b.nombre))} texto="hurtos en 2017" nota={`Comuna: ${num(seg.hurto_2017.total)}`} tono="ambar" />
            <Kpi valor={num(en(seg.homicidio_2017.por_barrio, b.nombre))} texto="homicidios en 2017" nota={`Comuna: ${num(seg.homicidio_2017.total)}`} tono="rojo" />
            <Kpi valor={num(en(seg.camaras.por_barrio, b.nombre))} texto="cámaras de vigilancia registradas" nota={`Comuna: ${num(seg.camaras.total)}`} />
            {anchoB && <Kpi valor={`${dec2(anchoB.ancho_mediano_m as number)} m`} texto="ancho mediano de andén" nota={`${pct(anchoB.andenes_angostos_pct as number)} más angosto que 1,2 m`} tono="rojo" />}
          </div>
        </Seccion>
      )}

      {/* Pie solo para la hoja impresa: de dónde sale cada cosa. */}
      <p className="hidden text-xs print:block">
        OTEA, Observatorio Santa Cruz. Cifras de la Alcaldía de Medellín y el DANE (Censo 2018), calculadas el {fecha(ind.generado)}; impreso el {fecha(new Date().toISOString())}.
        El índice de entorno es un puntaje relativo entre los barrios de la comuna, no una cifra oficial. Fuentes y límites en la sección Fuentes y calidad del sitio.
      </p>

      <Relacionados ids={["mapa", "indicadores", "prioridades"]} />
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
