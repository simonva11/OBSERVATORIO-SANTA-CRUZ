import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConDatos } from "../components/Estado";
import { useDatos } from "../lib/datos";
import { dec2, num } from "../lib/formato";
import { Aviso, BotonCabecera, Cabecera, Fuente, Relacionados, Seccion } from "../components/Pagina";
import { celda, descargar } from "../lib/csv";

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
  { t: "Cuánto espacio público es poco", d: `La norma nacional fija ${META_EP} m² de espacio público efectivo por habitante como mínimo. Al elegir un barrio en la lista se ve cómo está frente a esa meta.` },
];

const NIVEL: Record<Nivel, { texto: string; clase: string }> = {
  alta: { texto: "Alta", clase: "bg-tinta text-papel" },
  media: { texto: "Media", clase: "bg-papel-hondo text-tinta" },
  baja: { texto: "Baja", clase: "border border-nivel text-tinta-suave" },
};

/** En qué punto está cada obra. Ninguna de esta lista está aprobada ni ejecutada: se dice siempre. */
function EstadoObra({ e }: { e: Escenario }) {
  return e.tipo === "andenes"
    ? <span className="clase clase-derivado" title="La propone el modelo de OTEA a partir del inventario de andenes">Propuesta del modelo</span>
    : <span className="clase clase-oficial" title="Está prevista en el POT, pero no tiene obra, presupuesto ni fecha conocidos">Prevista en el POT</span>;
}

function csvObras(lista: Calculo[]) {
  const cols = ["puesto_en_su_tipo", "tipo", "obra", "barrio", "prioridad", "estado", "cantidad", "unidad", "personas_cerca", "indicador_1", "indicador_2", "indicador_3", "aviso"];
  const filas = lista.map((c) => [
    c.puesto, c.e.tipo_nombre, c.e.nombre, c.e.barrio ?? "", c.nivel, c.e.tipo === "andenes" ? "Propuesta del modelo" : "Prevista en el POT (sin obra)",
    c.e.cantidad, c.e.unidad_cantidad, c.e.beneficiarios, ...c.filas.map((f) => `${f.nombre}: ${f.texto} (puesto ${f.puesto ?? "-"} de ${f.de})`),
    "Prioridad relativa calculada por OTEA; no es una obra aprobada ni contratada",
  ]);
  return [cols, ...filas].map((f) => f.map(celda).join(",")).join("\r\n");
}

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
                {f.puesto == null ? "Sin dato para comparar" : <>Puesto <strong>{f.puesto}</strong> de {f.de}{arriba && <span className="mono ml-2 rounded border border-tinta/40 px-1.5 py-0.5 text-[0.66rem] uppercase">tercio de arriba</span>}</>}
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
      <Aviso tono="ojo" titulo="Lo que no sabemos">{e.confianza}. Los datos no dicen quién la construiría, cuándo ni con qué presupuesto. Eso se le pregunta a la entidad; en el Kit para líderes está a quién acudir.</Aviso>
      <div className="flex flex-wrap gap-2">
        <Link to={`/mapa?capas=${capa}${codigo ? `&barrio=${codigo}` : ""}`} className="boton boton-1 !py-2 !text-sm">Ver dónde queda en el mapa</Link>
        {codigo && <Link to={`/barrios/${codigo}`} className="boton boton-2 !py-2 !text-sm">Ficha del barrio</Link>}
        <Link to="/lideres" className="boton boton-2 !py-2 !text-sm">Pedir esta obra con una carta</Link>
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
    <div className="mt-4 border-t-2 border-tinta pt-3">
      <h3 className="fuente-titulo text-xl font-bold">{barrio} en pocas palabras</h3>
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
      <h3 className="fuente-titulo text-xl font-bold">{titulo} <span className="mono text-[0.75rem] font-normal text-tinta-tenue">{lista[0]?.de ?? 0} en la comuna</span></h3>
      <div className="mt-2 overflow-x-auto">
        <table className="tabla">
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Obra</th>
              <th>Prioridad</th>
              <th className="hidden md:table-cell">En qué punto está</th>
              <th className="hidden text-right sm:table-cell">Personas cerca</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <Fragment key={c.e.id}>
                <tr>
                  <td className="fuente-titulo text-lg font-bold tabular-nums">{c.puesto}</td>
                  <td>
                    <button type="button" onClick={() => setAbierto(abierto === c.e.id ? null : c.e.id)} aria-expanded={abierto === c.e.id} className="text-left font-semibold text-marca hover:underline">
                      {c.e.nombre} <span aria-hidden="true" className="text-tinta-tenue">{abierto === c.e.id ? "−" : "+"}</span>
                    </button>
                    <span className="block text-xs text-tinta-suave">{c.e.barrio ?? "Sin barrio"} · {num(c.e.cantidad)} {c.e.unidad_cantidad}</span>
                  </td>
                  <td><Insignia nivel={c.nivel} /></td>
                  <td className="hidden md:table-cell"><EstadoObra e={c.e} /></td>
                  <td className="hidden text-right tabular-nums sm:table-cell">{num(c.e.beneficiarios)}</td>
                </tr>
                {abierto === c.e.id && (
                  <tr>
                    <td colSpan={5} className="!bg-papel-hondo !px-4 !py-5"><Detalle c={c} oficial={fichas.get(c.e.id)} /></td>
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

/** Resumen ejecutivo: cuántas obras hay, cuántas salen primero y a cuánta gente tocan. */
function Resumen({ calculos }: { calculos: Calculo[] }) {
  const ep = calculos.filter((c) => c.e.tipo === "espacio_publico");
  const an = calculos.filter((c) => c.e.tipo === "andenes");
  const altas = calculos.filter((c) => c.nivel === "alta");
  const top = (l: Calculo[]) => l[0];
  return (
    <section aria-label="Resumen" className="grid gap-6 md:grid-cols-4">
      <div className="border-t-2 border-tinta pt-3"><p className="text-sm text-tinta-suave">Obras evaluadas</p><p className="fuente-titulo mt-1 text-4xl font-extrabold tabular-nums">{calculos.length}</p><p className="mt-1 text-sm text-tinta-tenue">{ep.length} de espacio público previsto en el POT y {an.length} de andenes</p></div>
      <div className="border-t-2 border-tinta pt-3"><p className="text-sm text-tinta-suave">Con prioridad alta</p><p className="fuente-titulo mt-1 text-4xl font-extrabold tabular-nums">{altas.length}</p><p className="mt-1 text-sm text-tinta-tenue">Frente a las demás de su mismo tipo</p></div>
      {top(ep) && <div className="border-t-2 border-tinta pt-3"><p className="text-sm text-tinta-suave">Primera en espacio público</p><p className="mt-1 text-lg font-semibold leading-snug">{top(ep).e.nombre}</p><p className="mt-1 text-sm text-tinta-tenue">{top(ep).e.barrio} · {num(top(ep).e.mejora)} personas ganarían un parque cerca</p></div>}
      {top(an) && <div className="border-t-2 border-tinta pt-3"><p className="text-sm text-tinta-suave">Primera en andenes</p><p className="mt-1 text-lg font-semibold leading-snug">{top(an).e.nombre}</p><p className="mt-1 text-sm text-tinta-tenue">{num(top(an).e.mejora)} m de andén angosto · {num(top(an).e.beneficiarios)} personas cerca</p></div>}
    </section>
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
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Prioridad de obras" icono="prioridades" titulo="Dónde intervenir primero"
        texto="Una lista para conversar con la comunidad y con la Alcaldía: qué espacios públicos y andenes podrían hacerle más falta a cada barrio, y por qué. Son propuestas para discutir, no obras aprobadas, contratadas ni ejecutadas."
        pregunta="¿Dónde sería más útil intervenir primero, con qué evidencia y con qué límites?">
        <BotonCabecera to="/mapa?capas=espacio_publico_proyectado">Verlo en el mapa</BotonCabecera>
        <BotonCabecera to="/lideres" claro>Cómo pedir una obra</BotonCabecera>
      </Cabecera>

      <Resumen calculos={calculos} />

      <Seccion
        id="t-lista"
        pregunta="¿Qué obra ayudaría a más gente primero?"
        titulo="Las obras, de más a menos prioritaria"
        texto="Elige tu barrio para ver solo lo que le toca. Toca el nombre de una obra para saber qué es, qué haría, en qué se basa su prioridad y qué falta saber."
        derecha={<button type="button" onClick={() => descargar(`otea-prioridad-obras${barrio ? "-" + barrio.toLowerCase().replace(/\s+/g, "-") : ""}.csv`, csvObras(delBarrio))} className="boton boton-2 !py-2 !text-sm">Descargar esta lista (CSV)</button>}
        fuente={<Fuente ids={["espacio_publico_proyectado", "andenes", "manzanas_censo", "siniestros_viales"]} calculo="prioridad relativa calculada por OTEA" />}
        siguiente={[{ to: "/lideres", texto: "Pedir una obra con un derecho de petición" }, { to: "/participacion", texto: "Contar una necesidad que no aparece" }]}
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold">
            Barrio
            <select value={barrio} onChange={(e) => { setBarrio(e.target.value); setAbierto(null); }} className="campo mt-1 !w-auto min-w-[14rem]">
              <option value="">Toda la comuna</option>
              {barrios.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <div role="group" aria-label="Filtrar por tipo de obra" className="flex flex-wrap gap-2">
            {(["todos", "espacio_publico", "andenes"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className="chip">
                {f === "todos" ? "Todas" : f === "espacio_publico" ? "Espacio público" : "Andenes"}
              </button>
            ))}
          </div>
        </div>
        {barrio && <ResumenBarrio barrio={barrio} lista={delBarrio} />}
        {mostrarEp && <Tabla titulo="Espacio público" lista={ep} abierto={abierto} setAbierto={setAbierto} fichas={fichas} />}
        {mostrarAn && <Tabla titulo="Andenes" lista={an} abierto={abierto} setAbierto={setAbierto} fichas={fichas} />}
        {!mostrarEp && !mostrarAn && <p className="vacio mt-4 text-sm">No hay obras de este tipo en este barrio. Prueba con «Todas» o con otro barrio.</p>}
      </Seccion>

      <Seccion mitad id="t-como" pregunta="¿Cómo se ordenó la lista?" titulo="Cómo se decide la prioridad" texto="No hay un puntaje mágico. Cada obra se compara solo con las de su mismo tipo, en tres indicadores con su dato real.">
        <ol className="grid gap-3 text-[0.95rem]">
          <li className="border-t border-nivel pt-2"><strong>Alta</strong>: está en el tercio de arriba en 2 o 3 indicadores.</li>
          <li className="border-t border-nivel pt-2"><strong>Media</strong>: en el tercio de arriba en 1 indicador.</li>
          <li className="border-t border-nivel pt-2"><strong>Baja</strong>: en ninguno. Dentro de cada nivel se ordena por el promedio de puestos; todos los indicadores pesan igual.</li>
        </ol>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {(["espacio_publico", "andenes"] as const).map((t) => (
            <div key={t}>
              <h3 className="font-semibold">{t === "espacio_publico" ? "Espacio público" : "Andenes"} <span className="mono text-[0.72rem] font-normal text-tinta-tenue">{calculos.filter((c) => c.e.tipo === t).length} obras</span></h3>
              <ul className="mt-2 space-y-2 text-sm">
                {INDICADORES[t].map((i) => (
                  <li key={i.nombre}><strong>{i.nombre}.</strong> <span className="text-tinta-suave">{i.que}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Aviso tono="info" titulo="Por qué no se mezclan los dos tipos">La gente cercana a un parque se cuenta a 10 minutos caminando y la cercana a un andén a 100 m en línea recta, así que esos números no son comparables. Los datos de barrio (espacio público y atropellos) son iguales para todas las obras del mismo barrio.</Aviso>
      </Seccion>

      <Seccion mitad id="t-saber" pregunta="¿Qué hay que saber antes?" titulo="Palabras que se usan aquí">
        <dl className="grid gap-4">
          {SABER.map((x) => (
            <div key={x.t} className="border-t border-nivel pt-2">
              <dt className="font-semibold">{x.t}</dt>
              <dd className="mt-0.5 text-sm text-tinta-suave">{x.d}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      <Seccion id="t-dudas" pregunta="¿Te quedó alguna duda?" titulo="Dudas frecuentes">
        <div className="grid gap-x-8 md:grid-cols-2">
          {DUDAS.map((d) => (
            <details key={d.p} className="metodo !border-solid">
              <summary>{d.p}</summary>
              <div className="metodo-cuerpo"><p>{d.r}</p></div>
            </details>
          ))}
        </div>
      </Seccion>
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
