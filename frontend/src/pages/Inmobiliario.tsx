import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../lib/datos";
import { dec, num, pct } from "../lib/formato";
import type { Indicadores } from "../lib/tipos";
import { ConDatos } from "../components/Estado";
import { Aviso, BotonCabecera, Cabecera, Fuente, Kpi, Relacionados, Seccion } from "../components/Pagina";
import { Revelar } from "../components/Animacion";
import MiniMapaBarrios from "../components/MiniMapaBarrios";

type Capa<P> = { features: { properties: P }[] };
type Oferta = { operacion: string; inmueble: string; barrio: string | null; en_comuna: boolean; anio: number };
type Instrumento = { instrumento: string; nivel: string; categoria: string };
type Centralidad = { nombre: string; caracter: string; orden: string; estado: string; jerarquia: string };
type Corredor = { linea: string; tramo: string; nombre: string };
type Intervencion = { nombre: string; clasificacion: string; zona: string };

const cop = (v: number) => `$${Math.round(v).toLocaleString("es-CO")}`;
const lista = <P,>(e: { estado: string; datos?: Capa<P> }): P[] => (e.estado === "listo" && e.datos ? e.datos.features.map((f) => f.properties) : []);

// Una gama para los tratamientos del POT; el nombre completo va siempre en la leyenda, nunca solo el color.
const GAMA = ["#5144a3", "#8f86d6", "#1d5aa8", "#156a73", "#c98a1b", "#a2472a"];

function Contenido({ ind }: { ind: Indicadores }) {
  const ofertas = lista<Oferta>(useDatos("oferta_inmobiliaria.geojson")).filter((o) => o.en_comuna);
  const instrumentos = lista<Instrumento>(useDatos("instrumentos.geojson"));
  const centralidades = lista<Centralidad>(useDatos("pot_centralidades.geojson"));
  const corredores = lista<Corredor>(useDatos("pot_corredores_transporte.geojson"));
  const intervenciones = lista<Intervencion>(useDatos("pot_intervencion_estrategica.geojson"));

  const barrios = ind.barrios;
  const [sel, setSel] = useState(barrios[0].nombre);
  const b = barrios.find((x) => x.nombre === sel) ?? barrios[0];

  const venta = ofertas.filter((o) => o.operacion === "Venta").length;
  const arriendo = ofertas.filter((o) => o.operacion === "Arriendo").length;
  const porBarrio = useMemo(() => {
    const m: Record<string, { venta: number; arriendo: number; tipos: Record<string, number> }> = {};
    for (const o of ofertas) {
      const k = o.barrio ?? "Sin barrio";
      const x = (m[k] ??= { venta: 0, arriendo: 0, tipos: {} });
      if (o.operacion === "Venta") x.venta++;
      else x.arriendo++;
      x.tipos[o.inmueble] = (x.tipos[o.inmueble] ?? 0) + 1;
    }
    return m;
  }, [ofertas]);
  const total = (n: string) => (porBarrio[n]?.venta ?? 0) + (porBarrio[n]?.arriendo ?? 0);
  const valores = useMemo(() => Object.fromEntries(barrios.map((x) => [x.nombre, (porBarrio[x.nombre]?.venta ?? 0) + (porBarrio[x.nombre]?.arriendo ?? 0)])), [barrios, porBarrio]);
  const tipos = Object.entries(ofertas.reduce<Record<string, number>>((a, o) => ({ ...a, [o.inmueble]: (a[o.inmueble] ?? 0) + 1 }), {})).sort((x, y) => y[1] - x[1]);
  const anio = ofertas[0]?.anio;

  // Tratamientos del POT presentes en la comuna, en el orden en que más área cubren
  const nombresTrat = useMemo(() => {
    const suma: Record<string, number> = {};
    for (const x of barrios) for (const [k, v] of Object.entries(x.tratamientos_pct)) suma[k] = (suma[k] ?? 0) + v * x.area_ha;
    return Object.keys(suma).sort((p, q) => suma[q] - suma[p]);
  }, [barrios]);
  const color = (t: string) => GAMA[nombresTrat.indexOf(t) % GAMA.length];
  const tratBarrio = (x: typeof b) => Object.entries(x.tratamientos_pct).filter(([, v]) => v >= 0.5).sort((p, q) => q[1] - p[1]);
  const corredoresUnicos = Array.from(new Map(corredores.map((c) => [c.tramo, c])).values());

  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera
        etiqueta="Inmobiliario y norma"
        icono="cubo"
        titulo="Mercado inmobiliario y POT"
        texto={<>La oferta de vivienda y locales que se publicó en internet para la comuna y la norma del POT que aplica en cada barrio. Sirve para entender una zona antes de estudiarla a fondo; no reemplaza un avalúo ni una consulta de norma predio a predio.</>}
        pregunta="¿Qué se ofrece en cada barrio, a qué precio publicado y qué permite el POT?"
      >
        <BotonCabecera to="/mapa?capas=oferta_inmobiliaria">Ver las ofertas en el mapa</BotonCabecera>
        <BotonCabecera to="/mapa?capas=tratamientos,instrumentos,pot_centralidades" claro>Ver el plan de la ciudad</BotonCabecera>
      </Cabecera>

      <Seccion id="t-i-oferta" pregunta="¿Cuánto se ofrece?" titulo="La oferta observada" texto={`Ofertas publicadas en portales de internet${anio ? ` en ${anio}` : ""} y recogidas por el Observatorio Inmobiliario de Medellín (OIME). Muestra total: ${num(ofertas.length)} ofertas dentro de la comuna.`} fuente={<Fuente ids={["oferta_inmobiliaria"]} />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            <Kpi key="t" valor={num(ofertas.length)} texto="ofertas observadas en la comuna" />,
            <Kpi key="v" valor={num(venta)} texto="en venta" tono="ambar" />,
            <Kpi key="a" valor={num(arriendo)} texto="en arriendo" tono="ambar" />,
            <Kpi key="p" valor={tipos[0] ? tipos[0][0] : "Sin dato"} texto="el tipo de inmueble más ofrecido" nota={tipos.map(([t, n]) => `${t}: ${n}`).join(" · ")} />,
          ].map((k, i) => <Revelar key={i} retraso={i * 50} className="h-full">{k}</Revelar>)}
        </div>
        <div className="mt-4"><Aviso tono="ojo" titulo="Precio publicado no es precio de venta">Son ofertas publicadas, no ventas cerradas ni avalúos: el precio real de una transacción suele ser distinto y no hay una fuente pública que lo registre. Como son pocas por barrio, el precio por m² solo se calcula donde hay al menos tres ofertas de venta de vivienda.</Aviso></div>
      </Seccion>

      <Seccion id="t-i-barrio" pregunta="¿Y en un barrio en particular?" titulo={`${b.nombre}: oferta y norma`} texto="Cuánta oferta hay y qué tratamiento del POT aplica. Elige un barrio en el mapa o con los botones." fuente={<Fuente ids={["oferta_inmobiliaria", "tratamientos"]} calculo="mediana y porcentajes calculados por OTEA" />} siguiente={[{ to: `/barrios/${b.codigo}`, texto: `Ficha completa de ${b.nombre}` }]}>
        <nav aria-label="Elegir barrio" className="mb-3 flex flex-wrap gap-2">
          {barrios.map((x) => (
            <button key={x.codigo} type="button" onClick={() => setSel(x.nombre)} aria-pressed={x.nombre === sel}
              className="chip !py-1 !text-[0.85rem]">
              {x.nombre}
            </button>
          ))}
        </nav>
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-xl bg-papel-hondo p-3">
            <MiniMapaBarrios valores={valores} unidad="ofertas" seleccionado={sel} onElegir={setSel} formato={num} />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Kpi valor={num(total(b.nombre))} texto="ofertas observadas" nota={`${num(porBarrio[b.nombre]?.venta ?? 0)} en venta · ${num(porBarrio[b.nombre]?.arriendo ?? 0)} en arriendo`} tono="ambar" />
              <Kpi
                valor={b.mediana_precio_m2_venta == null ? "Sin cifra" : `${cop(b.mediana_precio_m2_venta)}`}
                texto={b.mediana_precio_m2_venta == null ? "precio por m² de venta" : "mediana del precio por m² (venta de vivienda)"}
                nota={b.mediana_precio_m2_venta == null ? `Hay ${num(b.ofertas_venta_vivienda)} oferta(s) de venta de vivienda: muy pocas para calcularlo` : `Calculada con ${num(b.ofertas_venta_vivienda)} ofertas publicadas`}
              />
            </div>
            <div className="border-t-2 border-tinta pt-3">
              <h3 className="text-base font-semibold">Norma del POT que aplica</h3>
              <p className="mt-0.5 text-sm text-tinta-tenue">Tratamiento urbanístico: parte del territorio del barrio que cubre cada uno.</p>
              <ul className="mt-3 space-y-2.5">
                {tratBarrio(b).map(([t, v]) => (
                  <li key={t} className="text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{t}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{pct(v)}</span>
                    </div>
                    <span className="mt-1 block h-1.5 rounded-full bg-papel-hondo"><span className="block h-1.5 rounded-full" style={{ width: `${v}%`, background: color(t) }} /></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion id="t-i-tabla" pregunta="¿Cómo se comparan?" titulo="Todos los barrios" texto="Oferta observada y norma dominante, lado a lado." fuente={<Fuente ids={["oferta_inmobiliaria", "tratamientos"]} />}>
        <div className="overflow-x-auto">
          <table className="tabla min-w-[720px]">
            <thead>
              <tr>
                <th>Barrio</th>
                <th className="text-right">Ofertas</th>
                <th className="text-right">Venta</th>
                <th className="text-right">Arriendo</th>
                <th className="text-right">Mediana por m² (venta)</th>
                <th>Tratamiento que más área cubre</th>
              </tr>
            </thead>
            <tbody>
              {barrios.map((x) => {
                const principal = tratBarrio(x)[0];
                return (
                  <tr key={x.codigo} className={x.nombre === sel ? "bg-papel-hondo" : ""}>
                    <td className="py-1.5 pr-3"><button type="button" onClick={() => setSel(x.nombre)} className="font-medium text-marca underline-offset-2 hover:underline">{x.nombre}</button></td>
                    <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{num(total(x.nombre))}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{num(porBarrio[x.nombre]?.venta ?? 0)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{num(porBarrio[x.nombre]?.arriendo ?? 0)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{x.mediana_precio_m2_venta == null ? "—" : cop(x.mediana_precio_m2_venta)}</td>
                    <td className="py-1.5">{principal ? `${principal[0]} (${pct(principal[1])})` : "Sin dato"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-tinta-tenue">«—» significa que no hay al menos tres ofertas de venta de vivienda: no se calcula precio por m².</p>
      </Seccion>

      <Seccion mitad id="t-i-norma" pregunta="¿Qué espera el POT de cada barrio?" titulo="La norma del POT en toda la comuna" texto="Cómo se reparte cada tratamiento urbanístico en el territorio de cada barrio. El tratamiento dice si la zona se consolida, se mejora o se renueva." fuente={<Fuente ids={["tratamientos"]} />}>
        <div>
          <ul className="space-y-2">
            {barrios.map((x) => (
              <li key={x.codigo} className="grid grid-cols-[8.5rem_1fr] items-center gap-3 text-sm">
                <span className="font-medium">{x.nombre}</span>
                <span className="flex h-3 overflow-hidden rounded-full bg-papel-hondo" role="img" aria-label={`${x.nombre}: ${tratBarrio(x).map(([t, v]) => `${t} ${dec(v)} %`).join(", ")}`}>
                  {tratBarrio(x).map(([t, v]) => <span key={t} style={{ width: `${v}%`, background: color(t) }} title={`${t}: ${pct(v)}`} />)}
                </span>
              </li>
            ))}
          </ul>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-nivel/60 pt-3 text-xs text-tinta-suave">
            {nombresTrat.map((t) => (
              <li key={t} className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: color(t) }} />{t}</li>
            ))}
          </ul>
        </div>
      </Seccion>

      <Seccion mitad id="t-i-pot" pregunta="¿Qué está planificado?" titulo="Instrumentos, centralidades y corredores" texto="Lo que el POT planifica dentro de la comuna. Estar en el plan no significa tener obra ni presupuesto." fuente={<Fuente ids={["instrumentos", "pot_centralidades", "pot_corredores_transporte", "pot_intervencion_estrategica"]} />}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-t-2 border-tinta pt-3">
            <h3 className="text-base font-semibold">Instrumentos de planificación ({instrumentos.length})</h3>
            <ul className="mt-2 space-y-1 text-sm text-tinta-suave">
              {Object.entries(instrumentos.reduce<Record<string, number>>((a, i) => ({ ...a, [i.instrumento]: (a[i.instrumento] ?? 0) + 1 }), {})).map(([n, c]) => (
                <li key={n} className="flex justify-between gap-3"><span>{n}</span><span className="font-semibold tabular-nums text-tinta">{c}</span></li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-tinta-tenue">{instrumentos[0]?.nivel}.</p>
          </div>
          <div className="border-t-2 border-tinta pt-3">
            <h3 className="text-base font-semibold">Centralidades ({centralidades.length})</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-tinta-suave">
              {centralidades.map((c) => (
                <li key={c.nombre}><strong className="text-tinta">{c.nombre}</strong> · {c.caracter}, {c.orden} ({c.estado.toLowerCase()})</li>
              ))}
            </ul>
            <h3 className="mt-4 text-base font-semibold">Áreas de intervención estratégica ({intervenciones.length})</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-tinta-suave">
              {intervenciones.map((c) => <li key={c.nombre}><strong className="text-tinta">{c.nombre}</strong> · {c.clasificacion}</li>)}
            </ul>
          </div>
          <div className="border-t-2 border-tinta pt-3 md:col-span-2">
            <h3 className="text-base font-semibold">Corredores de transporte de pasajeros ({corredoresUnicos.length})</h3>
            <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-tinta-suave sm:grid-cols-2">
              {corredoresUnicos.map((c) => <li key={c.tramo}>{c.tramo}{c.linea !== "Sin definir" ? ` · ${c.linea}` : ""}</li>)}
            </ul>
          </div>
        </div>
      </Seccion>

      <Seccion id="t-i-limites" pregunta="¿Qué no se puede concluir?" titulo="Qué dicen y qué no dicen las fuentes">
        <div>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-tinta-suave">
            <li><strong className="text-tinta">Oferta, no mercado cerrado.</strong> No hay una fuente pública de precios de venta efectivos. La plataforma muestra lo publicado y su cantidad.</li>
            <li><strong className="text-tinta">Pocos datos por barrio.</strong> Con tres ofertas o menos no se calcula precio por m²: sería inventar una cifra.</li>
            <li><strong className="text-tinta">No hay relación de causa demostrada.</strong> Que un barrio tenga más oferta o un tratamiento distinto no prueba que una cosa cause la otra.</li>
            <li><strong className="text-tinta">La norma no dice qué se puede construir en un predio concreto.</strong> Los tratamientos son del territorio del barrio; para un lote hay que consultar la Alcaldía.</li>
            <li>Fuentes: OIME y Departamento Administrativo de Planeación de Medellín (POT, Acuerdo 48 de 2014). Más en <Link className="font-semibold text-marca underline underline-offset-2" to="/fuentes">Fuentes y calidad</Link>.</li>
          </ul>
        </div>
      </Seccion>

      <Relacionados ids={["mapa", "indicadores", "prioridades"]} />
    </div>
  );
}

export default function Inmobiliario() {
  const ind = useDatos<Indicadores>("indicadores.json");
  return <ConDatos estado={ind}>{(d) => <Contenido ind={d} />}</ConDatos>;
}
