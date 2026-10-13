import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConDatos } from "../components/Estado";
import { useDatos } from "../lib/datos";
import { dec2, num } from "../lib/formato";
import { BotonCabecera, Cabecera, Relacionados } from "../components/Pagina";

/** Escenario de intervención calculado en data-pipeline/red.py. */
interface Escenario {
  id: string;
  tipo: "espacio_publico" | "andenes";
  tipo_nombre: string;
  nombre: string;
  barrio: string | null;
  origen: string;
  problema: string;
  cantidad: number;
  unidad_cantidad: string;
  area_m2: number;
  beneficiarios: number;
  metodo_beneficiarios: string;
  mejora: number;
  metodo_mejora: string;
  ep_barrio_m2_hab: number | null;
  atropellos_por_mil: number | null;
  confianza: string;
}

/** Ficha oficial del espacio público proyectado (capa de Planeación). Trae la categoría que el POT le da a cada espacio. */
interface Oficial {
  nombre: string;
  categoria: string;
  subcategoria: string;
  barrio: string;
  codigo_barrio: string;
  area_m2: number;
}

/**
 * Une cada escenario del POT con su ficha oficial por nombre y barrio; si hay dos con el mismo nombre (La Herrera) gana el área más parecida.
 * shortcut: el JSON de escenarios no trae la categoría; lo ideal es que el pipeline la escriba ahí y este cruce desaparezca.
 */
function emparejar(escenarios: Escenario[], oficiales: Oficial[]) {
  const libres = [...oficiales];
  const res = new Map<string, Oficial>();
  for (const e of escenarios.filter((x) => x.tipo === "espacio_publico")) {
    const cand = libres.filter((o) => o.nombre === e.nombre && o.barrio === e.barrio).sort((a, b) => Math.abs(a.area_m2 - e.area_m2) - Math.abs(b.area_m2 - e.area_m2));
    if (cand[0]) {
      res.set(e.id, cand[0]);
      libres.splice(libres.indexOf(cand[0]), 1);
    }
  }
  return res;
}

/** Texto en palabras simples de qué es cada obra, según la categoría oficial. */
function queEs(e: Escenario, o?: Oficial): string[] {
  if (e.tipo === "andenes")
    return [
      "Un andén angosto es un tramo de acera que mide menos de 1,2 m de ancho según el inventario oficial de andenes de la ciudad.",
      "Esta obra no está en el POT: es una propuesta del modelo. El 1,2 m es la medida que usa el modelo como referencia, no una norma.",
    ];
  const t: string[] = [];
  if (!o) return ["Es un espacio público que el POT (Acuerdo 48 de 2014) prevé en este barrio y que todavía no existe."];
  t.push(`En la base de Planeación figura como «${o.categoria}», de tipo «${o.subcategoria.toLowerCase()}», con estado proyectado: el POT lo prevé, pero todavía no existe.`);
  if (o.categoria === "Ecoparque") t.push("Un ecoparque es un espacio público pensado para cuidar el ambiente y a la vez poder estar ahí, por ejemplo a lo largo de una quebrada.");
  if (o.subcategoria.toLowerCase().includes("mitigación del riesgo")) t.push("Este en particular se plantea para reducir el riesgo en terrenos de ladera.");
  if (o.categoria === "Parque Recreativo") t.push("En general, un parque pasivo es para caminar, sentarse y descansar. Uno activo suma zonas de juego o deporte.");
  if (o.categoria === "Mirador Panorámico") t.push("Un mirador es un punto pensado para ver el paisaje de la ciudad.");
  if (e.nombre.startsWith("Retranqueo del paramento"))
    t.push("El paramento es la línea donde empiezan las fachadas sobre la calle. Retranquear es correrla hacia atrás para ganar espacio libre, que aquí el POT cuenta como parque.");
  return t;
}

function queHaria(e: Escenario): string {
  return e.tipo === "andenes"
    ? `Ensanchar ${num(e.mejora)} m de andén que hoy miden menos de 1,2 m. Eso equivale a unos ${num(e.cantidad)} m² de andén.`
    : `Crear o recuperar ${num(e.cantidad)} m² de espacio público en ${e.barrio ?? "la comuna"}.`;
}

const META_EP = 15; // m² por habitante, Decreto 1077 de 2015 art. 2.2.3.2.7

type Tipo = Escenario["tipo"];
type Nivel = "alta" | "media" | "baja";

/**
 * Indicadores de cada tipo de obra, con su valor real. Solo se comparan obras del mismo tipo: los beneficiarios de espacios
 * públicos se cuentan a 10 minutos caminando por la red y los de andenes a 100 m en línea recta, y no se pueden mezclar.
 */
const INDICADORES: Record<Tipo, { nombre: string; mayor: boolean; valor: (e: Escenario) => number | null; texto: (v: number) => string; que: string }[]> = {
  espacio_publico: [
    { nombre: "Personas que ganarían un parque cerca", mayor: true, valor: (e) => e.mejora, texto: (v) => `${num(v)} personas`, que: "Hoy no tienen un parque a 5 minutos caminando y lo tendrían con esta obra." },
    { nombre: "Personas que viven cerca", mayor: true, valor: (e) => e.beneficiarios, texto: (v) => `${num(v)} personas`, que: "Residentes (Censo 2018) a 10 minutos o menos caminando del borde del espacio." },
    { nombre: "Espacio público del barrio hoy", mayor: false, valor: (e) => e.ep_barrio_m2_hab, texto: (v) => `${dec2(v)} m² por persona`, que: `Entre menos tenga el barrio, más falta hace. La meta nacional es ${META_EP}.` },
  ],
  andenes: [
    { nombre: "Metros de andén angosto", mayor: true, valor: (e) => e.mejora, texto: (v) => `${num(v)} m`, que: "Largo de andén que hoy mide menos de 1,2 m según el inventario oficial." },
    { nombre: "Personas que viven cerca", mayor: true, valor: (e) => e.beneficiarios, texto: (v) => `${num(v)} personas`, que: "Residentes (Censo 2018) a 100 m o menos de esos tramos, en línea recta." },
    { nombre: "Atropellos del barrio", mayor: true, valor: (e) => e.atropellos_por_mil, texto: (v) => `${dec2(v)} por cada mil habitantes`, que: "Atropellos de 2019 a 2025. Es un dato del barrio, no del tramo." },
  ],
};

interface Calculo {
  e: Escenario;
  filas: { nombre: string; que: string; texto: string; puesto: number | null; de: number }[];
  arriba: number; // en cuántos indicadores está en el tercio de arriba
  total: number; // cuántos indicadores tienen dato
  nivel: Nivel;
  puesto: number; // puesto dentro de su tipo
  de: number; // cuántas obras tiene su tipo
}

/** Puesto 1 = el mejor en ese indicador; los empates comparten puesto. */
function puestos(valores: (number | null)[], mayor: boolean) {
  return valores.map((v) => (v == null ? null : 1 + valores.filter((x) => x != null && (mayor ? x > v : x < v)).length));
}

function calcular(escenarios: Escenario[]): Calculo[] {
  const salida: Calculo[] = [];
  for (const tipo of ["espacio_publico", "andenes"] as const) {
    const grupo = escenarios.filter((e) => e.tipo === tipo);
    const n = grupo.length;
    const tercio = Math.ceil(n / 3);
    const por = INDICADORES[tipo].map((ind) => puestos(grupo.map(ind.valor), ind.mayor));
    const calc = grupo.map((e, i) => {
      const filas = INDICADORES[tipo].map((ind, k) => {
        const v = ind.valor(e);
        return { nombre: ind.nombre, que: ind.que, texto: v == null ? "Sin dato" : ind.texto(v), puesto: por[k][i], de: n };
      });
      const conDato = filas.filter((f) => f.puesto != null);
      const arriba = conDato.filter((f) => (f.puesto as number) <= tercio).length;
      const nivel: Nivel = arriba >= 2 ? "alta" : arriba === 1 ? "media" : "baja";
      const promedio = conDato.length ? conDato.reduce((a, f) => a + (f.puesto as number), 0) / conDato.length : n;
      return { e, filas, arriba, total: conDato.length, nivel, promedio, puesto: 0, de: n };
    });
    // Dentro de cada nivel se ordena por el promedio de puestos (todos los indicadores pesan igual).
    const orden = { alta: 0, media: 1, baja: 2 };
    calc.sort((a, b) => orden[a.nivel] - orden[b.nivel] || a.promedio - b.promedio);
    calc.forEach((c, i) => { c.puesto = i + 1; salida.push(c); });
  }
  return salida;
}

const DUDAS: { p: string; r: React.ReactNode }[] = [
  { p: "¿Esto significa que ya se va a construir algo?", r: "No. Son propuestas del modelo para conversar. No son obras aprobadas, contratadas ni prometidas por ninguna entidad." },
  { p: "¿De dónde salen los escenarios?", r: "De dos fuentes: los espacios públicos que ya propone el POT y los andenes angostos que aparecen en el inventario. Al abrir una obra se ve su origen y el problema que atendería." },
  { p: "¿Por qué no hay un puntaje de 0 a 100?", r: "Porque un número así parece más exacto de lo que es: dependía de pesos que escogió el equipo y mezclaba datos que no se pueden comparar. Ahora se muestra el dato real de cada obra y su puesto frente a las de su tipo." },
  { p: "¿Qué quiere decir «tercio de arriba»?", r: "Que entre las obras del mismo tipo, esa obra está entre el tercio con los valores más altos en ese indicador (o más bajos, en el caso del espacio público del barrio, donde tener poco significa más necesidad)." },
  { p: "¿Qué es un «retranqueo del paramento»?", r: "El paramento es la línea donde empiezan las fachadas sobre la calle. Retranquear es correrla hacia atrás para dejar espacio libre. En el POT, esos espacios se cuentan como parque recreativo." },
  { p: "¿Cuánto espacio público debería tener un barrio?", r: "La norma nacional (Decreto 1077 de 2015, artículo 2.2.3.2.7) fija 15 m² de espacio público efectivo por habitante como mínimo. Nuestro dato sale de la capa oficial de espacio público, así que sirve como referencia y no como comparación exacta." },
  { p: "¿Por qué no aparece cuánto cuesta cada obra?", r: "Porque no se encontró una fuente pública confiable de precios para estas obras en Medellín, y no se van a inventar. Por eso la prioridad habla de necesidad, no de presupuesto." },
  { p: "¿Cómo se cuentan las personas cercanas?", r: "Con los residentes de la Comuna 2 del Censo 2018, obra por obra. Nunca se usa toda la población de la comuna. En espacios públicos es a 10 minutos caminando por la red de calles; en andenes, a 100 m en línea recta." },
  { p: "Mi barrio casi no sale, ¿es que no hace falta nada?", r: "No necesariamente. Solo se evalúan las obras que los datos permiten identificar. Si sabe de una necesidad que no está, cuéntela por Participación." },
  { p: "¿Qué hago si quiero pedir una obra?", r: (<>Lo más directo es un derecho de petición. En el <Link to="/lideres" className="text-cable underline">Kit para líderes</Link> hay una carta lista, los plazos que tiene la entidad para responder y a quién acudir.</>) },
];

const SABER = [
  { t: "Qué es el POT", d: "El Plan de Ordenamiento Territorial (Acuerdo 48 de 2014) es la norma de Medellín que define cómo se usa el suelo y qué espacios públicos se prevén en cada zona. Las obras de espacio público de esta lista salen de ahí." },
  { t: "Qué quiere decir «proyectado»", d: "En la base oficial de Planeación estos espacios tienen estado «proyectado»: están previstos en el plan, pero todavía no existen. Estar en el POT no es lo mismo que tener presupuesto o fecha." },
  { t: "Y los andenes", d: "Los andenes no son del POT. El modelo revisó el inventario oficial de andenes y propone ensanchar los tramos que miden menos de 1,2 m." },
  { t: "Cuánto espacio público es poco", d: `La norma nacional fija ${META_EP} m² de espacio público efectivo por habitante como mínimo. Elija su barrio abajo para ver cómo está frente a esa meta.` },
];

const NIVEL: Record<Nivel, { texto: string; clase: string }> = {
  alta: { texto: "Alta", clase: "bg-marca text-white" },
  media: { texto: "Media", clase: "bg-marca/15 text-tinta" },
  baja: { texto: "Baja", clase: "border border-nivel text-tinta-suave" },
};

function Insignia({ nivel }: { nivel: Nivel }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${NIVEL[nivel].clase}`}>{NIVEL[nivel].texto}</span>;
}

function Filas({ filas }: { filas: Calculo["filas"] }) {
  return (
    <ul className="mt-2 space-y-3">
      {filas.map((f) => {
        const arriba = f.puesto != null && f.puesto <= Math.ceil(f.de / 3);
        return (
          <li key={f.nombre} className="grid gap-x-4 gap-y-1 sm:grid-cols-[16rem_1fr]">
            <div>
              <p className="text-sm font-semibold">{f.nombre}</p>
              <p className="text-sm tabular-nums">{f.texto}</p>
            </div>
            <div>
              <p className="text-sm">
                {f.puesto == null ? "Sin dato para comparar" : <>Puesto <strong>{f.puesto}</strong> de {f.de}{arriba && <span className="ml-2 rounded bg-marca/15 px-1.5 py-0.5 text-xs font-semibold">tercio de arriba</span>}</>}
              </p>
              {f.puesto != null && (
                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-nivel" aria-hidden>
                  <span className="block h-full rounded-full bg-marca" style={{ width: `${f.de > 1 ? Math.round(((f.de - f.puesto) / (f.de - 1)) * 100) : 100}%` }} />
                </span>
              )}
              <p className="mt-1 text-xs text-tinta-suave">{f.que}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Detalle({ c, oficial }: { c: Calculo; oficial?: Oficial }) {
  const e = c.e;
  const codigo = e.id.startsWith("anden-") ? e.id.slice(6) : oficial?.codigo_barrio;
  const capa = e.tipo === "andenes" ? "andenes" : "espacio_publico_proyectado";
  const tipo = e.tipo === "andenes" ? "andenes" : "espacio público";
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <dt className="font-semibold">Qué es</dt>
          <dd className="space-y-1">{queEs(e, oficial).map((t) => <p key={t}>{t}</p>)}</dd>
        </div>
        <div><dt className="font-semibold">Qué haría</dt><dd>{queHaria(e)}</dd></div>
        <div><dt className="font-semibold">Por qué aparece</dt><dd>{e.problema}. Origen: {e.origen.charAt(0).toLowerCase() + e.origen.slice(1)}.</dd></div>
      </dl>
      <div>
        <p className="font-semibold">Por qué su prioridad es <Insignia nivel={c.nivel} /></p>
        <p className="mt-1 text-sm text-tinta-suave">
          Se compara con las otras {c.de - 1} obras de {tipo}, indicador por indicador. Esta obra está en el tercio de arriba en {c.arriba} de {c.total}.
        </p>
        <Filas filas={c.filas} />
      </div>
      <p className="rounded-xl bg-ambar-claro p-3 text-sm">
        <strong>Lo que no sabemos:</strong> {e.confianza}. Los datos no dicen quién la construiría, cuándo ni con qué presupuesto. Eso se le pregunta a la entidad; en el Kit para líderes está a quién acudir.
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link to={`/mapa?capas=${capa}${codigo ? `&barrio=${codigo}` : ""}`} className="rounded-full border border-nivel bg-superficie px-3 py-1.5 font-semibold text-cable">Ver el barrio en el mapa</Link>
        <Link to="/lideres" className="rounded-full border border-nivel bg-superficie px-3 py-1.5 font-semibold text-cable">Pedir esta obra con una carta</Link>
      </div>
    </div>
  );
}

function ResumenBarrio({ barrio, lista }: { barrio: string; lista: Calculo[] }) {
  const ep = lista.find((c) => c.e.ep_barrio_m2_hab != null)?.e.ep_barrio_m2_hab ?? null;
  const atrop = lista.find((c) => c.e.atropellos_por_mil != null)?.e.atropellos_por_mil ?? null;
  const nEp = lista.filter((c) => c.e.tipo === "espacio_publico");
  const nAn = lista.filter((c) => c.e.tipo === "andenes");
  const m2 = nEp.reduce((a, c) => a + c.e.area_m2, 0);
  const pct = ep == null ? null : (ep / META_EP) * 100;
  const altas = lista.filter((c) => c.nivel === "alta").length;
  return (
    <div className="mt-3 rounded-2xl border border-nivel bg-superficie p-4">
      <h3 className="font-semibold">{barrio} en pocas palabras</h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {ep != null && pct != null && (
          <li>Hoy tiene <strong>{dec2(ep)} m²</strong> de espacio público por habitante. La meta nacional es {META_EP}, o sea que está en {pct < 1 ? "menos del 1 %" : `el ${Math.round(pct)} %`} de esa meta.</li>
        )}
        {atrop != null && <li>Se registraron <strong>{dec2(atrop)} atropellos</strong> por cada mil habitantes entre 2019 y 2025.</li>}
        <li>
          El modelo evaluó <strong>{lista.length} {lista.length === 1 ? "obra" : "obras"}</strong>
          {nEp.length > 0 && <>: {nEp.length} de espacio público que el POT prevé ({num(m2)} m² en total)</>}
          {nAn.length > 0 && <>{nEp.length > 0 ? " y " : ": "}{nAn.length} de ampliación de andenes</>}.
        </li>
        <li>{altas === 0 ? "Ninguna sale con prioridad alta frente a las demás de su tipo." : `${altas} ${altas === 1 ? "sale" : "salen"} con prioridad alta frente a las demás de su tipo.`}</li>
      </ul>
    </div>
  );
}

function Tabla({ titulo, lista, abierto, setAbierto, fichas }: { titulo: string; lista: Calculo[]; abierto: string | null; setAbierto: (id: string | null) => void; fichas: Map<string, Oficial> }) {
  return (
    <div className="mt-4">
      <h3 className="font-semibold">{titulo} <span className="text-sm font-normal text-tinta-suave">({lista[0]?.de ?? 0} en la comuna)</span></h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-nivel bg-superficie">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nivel text-left text-tinta-suave">
              <th className="px-3 py-2 font-semibold">Puesto</th>
              <th className="px-3 py-2 font-semibold">Obra</th>
              <th className="px-3 py-2 font-semibold">Prioridad</th>
              <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Personas cerca</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <Fragment key={c.e.id}>
                <tr className="border-b border-nivel/70 align-top">
                  <td className="px-3 py-2 text-lg font-semibold tabular-nums">{c.puesto}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setAbierto(abierto === c.e.id ? null : c.e.id)} aria-expanded={abierto === c.e.id} className="text-left font-semibold text-cable hover:underline">
                      {c.e.nombre}
                    </button>
                    <span className="block text-xs text-tinta-suave">{c.e.barrio ?? "Sin barrio"}. {num(c.e.cantidad)} {c.e.unidad_cantidad}</span>
                  </td>
                  <td className="px-3 py-2"><Insignia nivel={c.nivel} /></td>
                  <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{num(c.e.beneficiarios)}</td>
                </tr>
                {abierto === c.e.id && (
                  <tr className="border-b border-nivel/70 bg-papel">
                    <td colSpan={4} className="px-4 py-4"><Detalle c={c} oficial={fichas.get(c.e.id)} /></td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Contenido({ escenarios, oficiales }: { escenarios: Escenario[]; oficiales: Oficial[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Tipo>("todos");
  const [barrio, setBarrio] = useState("");
  const calculos = useMemo(() => calcular(escenarios), [escenarios]);
  const fichas = useMemo(() => emparejar(escenarios, oficiales), [escenarios, oficiales]);
  const barrios = useMemo(() => [...new Set(escenarios.map((e) => e.barrio).filter((b): b is string => !!b))].sort((a, b) => a.localeCompare(b, "es")), [escenarios]);
  const delBarrio = calculos.filter((c) => !barrio || c.e.barrio === barrio);
  const de = (t: Tipo) => delBarrio.filter((c) => c.e.tipo === t);
  const ep = de("espacio_publico"), an = de("andenes");
  const mostrarEp = filtro !== "andenes" && ep.length > 0, mostrarAn = filtro !== "espacio_publico" && an.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-5 lg:px-8">
      <Cabecera etiqueta="Prioridad de obras" icono="prioridades" titulo="Dónde intervenir primero"
        texto="Una lista para conversar con la comunidad: qué espacios públicos y andenes podrían hacerle más falta a cada barrio, y por qué. Son propuestas del modelo, no obras aprobadas ni contratadas." >
        <BotonCabecera to="/mapa?capas=espacio_publico_proyectado">Verlo en el mapa</BotonCabecera>
        <BotonCabecera to="/lideres" claro>Cómo pedir una obra</BotonCabecera>
      </Cabecera>

      <section aria-labelledby="t-saber">
        <h2 id="t-saber" className="text-lg font-semibold">Antes de mirar la lista</h2>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">Cuatro ideas que ayudan a leer todo lo demás.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {SABER.map((x) => (
            <div key={x.t} className="rounded-xl border border-nivel bg-superficie p-4">
              <h3 className="font-semibold">{x.t}</h3>
              <p className="mt-1 text-sm text-tinta-suave">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="t-como">
        <h2 id="t-como" className="text-lg font-semibold">Cómo se decide la prioridad</h2>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">
          No hay un puntaje mágico. Cada obra se compara solo con las de su mismo tipo en tres indicadores con su dato real. Si está en el
          tercio de arriba en 2 o más, la prioridad es <strong>alta</strong>; en 1, <strong>media</strong>; en ninguno, <strong>baja</strong>.
          Todos los indicadores valen lo mismo. Dentro de cada nivel se ordena por el promedio de puestos.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(["espacio_publico", "andenes"] as const).map((t) => (
            <div key={t} className="rounded-xl border border-nivel bg-superficie p-4">
              <h3 className="font-semibold">{t === "espacio_publico" ? "Espacio público" : "Andenes"} ({calculos.filter((c) => c.e.tipo === t).length} obras)</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {INDICADORES[t].map((i) => (
                  <li key={i.nombre}><strong>{i.nombre}.</strong> <span className="text-tinta-suave">{i.que}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 max-w-3xl text-sm text-tinta-suave">
          Por qué no se mezclan los dos tipos: la gente cercana a un parque se cuenta a 10 minutos caminando y la cercana a un andén a 100 m en línea
          recta, así que esos números no son comparables entre sí. Y ojo: los datos de barrio (espacio público y atropellos) son iguales para
          todas las obras del mismo barrio.
        </p>
      </section>

      <section aria-labelledby="t-lista">
        <h2 id="t-lista" className="text-lg font-semibold">Las obras, de más a menos prioritaria</h2>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">Elija su barrio para ver solo lo que le toca. Toque el nombre de una obra para saber qué es, qué haría y en qué se basa su prioridad.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Barrio
            <select value={barrio} onChange={(e) => { setBarrio(e.target.value); setAbierto(null); }} className="h-10 rounded-lg border border-nivel bg-superficie px-3 text-base font-normal">
              <option value="">Toda la comuna</option>
              {barrios.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <div role="group" aria-label="Filtrar por tipo" className="flex gap-2">
            {(["todos", "espacio_publico", "andenes"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className={`rounded-full border px-3 py-1.5 text-sm ${filtro === f ? "border-acento bg-acento text-white" : "border-nivel bg-superficie"}`}>
                {f === "todos" ? "Todos" : f === "espacio_publico" ? "Espacio público" : "Andenes"}
              </button>
            ))}
          </div>
        </div>
        {barrio && <ResumenBarrio barrio={barrio} lista={delBarrio} />}
        {mostrarEp && <Tabla titulo="Espacio público" lista={ep} abierto={abierto} setAbierto={setAbierto} fichas={fichas} />}
        {mostrarAn && <Tabla titulo="Andenes" lista={an} abierto={abierto} setAbierto={setAbierto} fichas={fichas} />}
        {!mostrarEp && !mostrarAn && <p className="mt-4 rounded-2xl border border-nivel bg-superficie px-3 py-6 text-center text-sm text-tinta-suave">No hay obras de este tipo en este barrio.</p>}
        <p className="mt-3 text-sm text-tinta-suave">
          La prioridad ordena opciones, no prueba que una obra mejore las cosas ni que sea técnicamente posible. Para ver la ruta real de
          caminata hacia cualquier lugar use <Link to="/mapa?ruta=1" className="text-cable underline">¿Cómo llego?</Link> en el mapa.
        </p>
      </section>

      <section aria-labelledby="t-dudas">
        <h2 id="t-dudas" className="text-lg font-semibold">Dudas frecuentes</h2>
        <div className="mt-3 divide-y divide-nivel rounded-2xl border border-nivel bg-superficie">
          {DUDAS.map((d) => (
            <details key={d.p} className="group px-4 py-3">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="mr-2 inline-block text-marca transition-transform group-open:rotate-90">›</span>
                {d.p}
              </summary>
              <p className="mt-2 pl-5 text-sm text-tinta-suave">{d.r}</p>
            </details>
          ))}
        </div>
        <p className="mt-3 text-sm text-tinta-suave">
          ¿Ve algo que falta en su barrio? Cuéntelo en <Link to="/participacion" className="text-cable underline">Participación</Link>.
        </p>
      </section>
      <Relacionados ids={["problematicas", "accesibilidad", "corredor"]} />
    </div>
  );
}

export default function Prioridades() {
  const estado = useDatos<Escenario[]>("escenarios.json");
  // Si la ficha oficial no carga, la página igual funciona: solo pierde la categoría del POT.
  const oficiales = useDatos<{ features: { properties: Oficial }[] }>("espacio_publico_proyectado.geojson");
  const lista = oficiales.estado === "listo" ? oficiales.datos.features.map((f) => f.properties) : [];
  return <ConDatos estado={estado}>{(e) => <Contenido escenarios={e} oficiales={lista} />}</ConDatos>;
}
