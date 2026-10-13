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

const TIPOS = ["espacio_publico", "andenes"] as const;

// Pesos propuestos por el equipo (no oficiales). Sin precios públicos confiables no hay criterio de costo.
const CRITERIOS = [
  { id: "beneficiarios", nombre: "Cuánta gente la usaría", peso: 30, explicacion: "Personas estimadas que usarían la obra. En cada escenario se explica cómo se contó." },
  { id: "deficit_ep", nombre: "Qué tan escaso es el espacio público del barrio", peso: 20, explicacion: "Menos metros cuadrados de espacio público por habitante significa más necesidad." },
  { id: "mejora", nombre: "Cuánto mejoraría la situación", peso: 25, explicacion: "Personas que ganarían un parque a 5 minutos caminando, o metros de andén que llegarían a 1,2 m de ancho. Solo se compara entre obras del mismo tipo." },
  { id: "siniestralidad", nombre: "Atropellos en el barrio", peso: 10, explicacion: "Atropellos de 2019 a 2025 por cada mil habitantes del barrio." },
] as const;
type IdCriterio = (typeof CRITERIOS)[number]["id"];
const SUMA_PESOS = CRITERIOS.reduce((a, c) => a + c.peso, 0);

/** Normaliza de 0 a 1 (mín–máx). Si todos son iguales, devuelve 0,5. */
function normalizar(valores: (number | null)[], invertir = false) {
  const v = valores.filter((x): x is number => x != null);
  const min = Math.min(...v), max = Math.max(...v);
  return valores.map((x) => {
    if (x == null) return null;
    const n = max === min ? 0.5 : (x - min) / (max - min);
    return invertir ? 1 - n : n;
  });
}

interface Calculo {
  e: Escenario;
  partes: { nombre: string; valor: number | null }[];
  prioridad: number;
  rango: [number, number];
  posicion: number;
}

function calcular(escenarios: Escenario[]): Calculo[] {
  const pesos = Object.fromEntries(CRITERIOS.map((c) => [c.id, c.peso])) as Record<IdCriterio, number>;
  // Mejora: se normaliza dentro de cada tipo de obra porque sus unidades son distintas
  const mejoraN = new Array<number | null>(escenarios.length).fill(null);
  for (const t of TIPOS) {
    const idx = escenarios.map((e, i) => (e.tipo === t ? i : -1)).filter((i) => i >= 0);
    normalizar(idx.map((i) => escenarios[i].mejora)).forEach((v, j) => (mejoraN[idx[j]] = v));
  }
  const norm: Record<IdCriterio, (number | null)[]> = {
    beneficiarios: normalizar(escenarios.map((e) => e.beneficiarios)),
    deficit_ep: normalizar(escenarios.map((e) => e.ep_barrio_m2_hab), true),
    mejora: mejoraN,
    siniestralidad: normalizar(escenarios.map((e) => e.atropellos_por_mil)),
  };

  const puntaje = (i: number, w: Record<IdCriterio, number>) => {
    let suma = 0, total = 0;
    for (const c of CRITERIOS) {
      const v = norm[c.id][i];
      if (v == null) continue;
      suma += w[c.id] * v;
      total += w[c.id];
    }
    return total ? suma / total : 0;
  };

  const base = escenarios.map((_, i) => puntaje(i, pesos));
  const posicion = new Array<number>(escenarios.length);
  base.map((b, i) => [b, i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i], k) => (posicion[i] = k + 1));

  // Sensibilidad: 300 repeticiones moviendo cada peso al azar entre 50 % y 150 %, para ver cuánto se mueve el puesto
  const rangos = escenarios.map(() => [Infinity, -Infinity] as [number, number]);
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  for (let r = 0; r < 300; r++) {
    const w = Object.fromEntries(CRITERIOS.map((c) => [c.id, pesos[c.id] * (0.5 + azar())])) as Record<IdCriterio, number>;
    escenarios.map((_, i) => [puntaje(i, w), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i], k) => {
      rangos[i][0] = Math.min(rangos[i][0], k + 1);
      rangos[i][1] = Math.max(rangos[i][1], k + 1);
    });
  }
  return escenarios.map((e, i) => ({ e, partes: CRITERIOS.map((c) => ({ nombre: c.nombre, valor: norm[c.id][i] })), prioridad: base[i], rango: rangos[i], posicion: posicion[i] }));
}

const DUDAS: { p: string; r: React.ReactNode }[] = [
  { p: "¿Esto significa que ya se va a construir algo?", r: "No. Son propuestas del modelo para conversar. No son obras aprobadas, contratadas ni prometidas por ninguna entidad." },
  { p: "¿De dónde salen los escenarios?", r: "De dos fuentes: los espacios públicos que ya propone el POT y los andenes angostos que aparecen en el inventario. Al abrir un escenario se ve su origen y el problema que atendería." },
  { p: "¿Qué es un «retranqueo del paramento»?", r: "El paramento es la línea donde empiezan las fachadas sobre la calle. Retranquear es correrla hacia atrás para dejar espacio libre. En el POT, esos espacios se cuentan como parque recreativo." },
  { p: "¿Cuánto espacio público debería tener un barrio?", r: "La norma nacional (Decreto 1077 de 2015, artículo 2.2.3.2.7) fija 15 m² de espacio público efectivo por habitante como mínimo. Nuestro dato sale de la capa oficial de espacio público, así que sirve como referencia y no como comparación exacta." },
  { p: "¿Por qué no aparece cuánto cuesta cada obra?", r: "Porque no se encontró una fuente pública confiable de precios para estas obras en Medellín, y no se van a inventar. Por eso el puesto habla de necesidad, no de presupuesto." },
  { p: "¿Cómo se cuentan las personas beneficiadas?", r: "Se estiman obra por obra con los residentes de la Comuna 2 del Censo 2018. Nunca se usa toda la población de la comuna. El método exacto está en cada escenario." },
  { p: "¿Qué quiere decir «entre 3 y 8» debajo del puesto?", r: "Que los pesos de arriba son una propuesta y podrían ser otros. Se movieron al azar 300 veces y ese es el rango de puestos en el que cayó el escenario. Si el rango es corto, el puesto es firme." },
  { p: "Mi barrio casi no sale, ¿es que no hace falta nada?", r: "No necesariamente. Solo se evalúan las obras que los datos permiten identificar. Si sabe de una necesidad que no está, cuéntela por Participación." },
  { p: "¿Qué hago si quiero pedir una obra?", r: (<>Lo más directo es un derecho de petición. En el <Link to="/lideres" className="text-cable underline">Kit para líderes</Link> hay una carta lista, los plazos que tiene la entidad para responder y a quién acudir.</>) },
];

const META_EP = 15; // m² por habitante, Decreto 1077 de 2015 art. 2.2.3.2.7

const SABER = [
  { t: "Qué es el POT", d: "El Plan de Ordenamiento Territorial (Acuerdo 48 de 2014) es la norma de Medellín que define cómo se usa el suelo y qué espacios públicos se prevén en cada zona. Las obras de espacio público de esta lista salen de ahí." },
  { t: "Qué quiere decir «proyectado»", d: "En la base oficial de Planeación estos espacios tienen estado «proyectado»: están previstos en el plan, pero todavía no existen. Estar en el POT no es lo mismo que tener presupuesto o fecha." },
  { t: "Y los andenes", d: "Los andenes no son del POT. El modelo revisó el inventario oficial de andenes y propone ensanchar los tramos que miden menos de 1,2 m." },
  { t: "Cuánto espacio público es poco", d: `La norma nacional fija ${META_EP} m² de espacio público efectivo por habitante como mínimo. Elija su barrio abajo para ver cómo está frente a esa meta.` },
];

function Barritas({ partes }: { partes: Calculo["partes"] }) {
  return (
    <ul className="mt-2 space-y-2">
      {partes.map((p) => (
        <li key={p.nombre} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[16rem_1fr_2.5rem]">
          <span className="text-sm">{p.nombre}</span>
          <span className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-nivel sm:order-none sm:col-span-1" aria-hidden>
            <span className="block h-full rounded-full bg-marca" style={{ width: `${Math.round((p.valor ?? 0) * 100)}%` }} />
          </span>
          <span className="text-right text-sm font-semibold tabular-nums">{p.valor == null ? "Sin dato" : Math.round(p.valor * 100)}</span>
        </li>
      ))}
    </ul>
  );
}

function Detalle({ c, oficial }: { c: Calculo; oficial?: Oficial }) {
  const e = c.e;
  const codigo = e.id.startsWith("anden-") ? e.id.slice(6) : oficial?.codigo_barrio;
  const capa = e.tipo === "andenes" ? "andenes" : "espacio_publico_proyectado";
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <dt className="font-semibold">Qué es</dt>
          <dd className="space-y-1">{queEs(e, oficial).map((t) => <p key={t}>{t}</p>)}</dd>
        </div>
        <div><dt className="font-semibold">Qué haría</dt><dd>{queHaria(e)}</dd></div>
        <div><dt className="font-semibold">Por qué aparece</dt><dd>{e.problema}. Origen: {e.origen.charAt(0).toLowerCase() + e.origen.slice(1)}.</dd></div>
        <div><dt className="font-semibold">A cuánta gente llega</dt><dd>{num(e.beneficiarios)} personas. {e.metodo_beneficiarios}.</dd></div>
        <div><dt className="font-semibold">Qué mejoraría</dt><dd>{num(e.mejora)}: {e.metodo_mejora.charAt(0).toLowerCase() + e.metodo_mejora.slice(1)}.</dd></div>
        <div><dt className="font-semibold">Espacio público del barrio hoy</dt><dd>{e.ep_barrio_m2_hab == null ? "Sin dato" : `${dec2(e.ep_barrio_m2_hab)} m² por persona (la meta nacional es ${META_EP})`}</dd></div>
        <div><dt className="font-semibold">Atropellos del barrio</dt><dd>{e.atropellos_por_mil == null ? "Sin dato" : `${dec2(e.atropellos_por_mil)} por cada mil habitantes (2019 a 2025)`}</dd></div>
      </dl>
      <div>
        <p className="font-semibold">Por qué quedó en el puesto {c.posicion}</p>
        <p className="text-sm text-tinta-suave">Cada barra va de 0 (la peor de la lista en ese punto) a 100 (la mejor). El puntaje final es su promedio con los pesos de arriba.</p>
        <Barritas partes={c.partes} />
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
  const mejor = [...lista].sort((a, b) => a.posicion - b.posicion)[0];
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
        {mejor && <li>La mejor ubicada en la lista de la comuna es «{mejor.e.nombre}», en el puesto {mejor.posicion}.</li>}
      </ul>
    </div>
  );
}

function Contenido({ escenarios, oficiales }: { escenarios: Escenario[]; oficiales: Oficial[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Escenario["tipo"]>("todos");
  const [barrio, setBarrio] = useState("");
  const calculos = useMemo(() => calcular(escenarios), [escenarios]);
  const fichas = useMemo(() => emparejar(escenarios, oficiales), [escenarios, oficiales]);
  const barrios = useMemo(() => [...new Set(escenarios.map((e) => e.barrio).filter((b): b is string => !!b))].sort((a, b) => a.localeCompare(b, "es")), [escenarios]);
  const delBarrio = calculos.filter((c) => !barrio || c.e.barrio === barrio);
  const visibles = delBarrio.filter((c) => filtro === "todos" || c.e.tipo === filtro).sort((a, b) => a.posicion - b.posicion);

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
        <h2 id="t-como" className="text-lg font-semibold">Cómo se ordena la lista</h2>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">
          Cada obra recibe un puntaje de 0 a 100 según cuatro cosas. El porcentaje de cada tarjeta es cuántos de esos 100 puntos aporta ese
          criterio. Los pesos los propuso el equipo y no son oficiales.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {CRITERIOS.map((c) => (
            <div key={c.id} className="rounded-xl border border-nivel bg-superficie p-4">
              <p className="flex justify-between gap-3 font-semibold">
                <span>{c.nombre}</span>
                <span className="tabular-nums text-marca">{Math.round((c.peso / SUMA_PESOS) * 100)} %</span>
              </p>
              <p className="mt-1 text-sm text-tinta-suave">{c.explicacion}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="t-lista">
        <h2 id="t-lista" className="text-lg font-semibold">Las obras, de más a menos necesaria</h2>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">Elija su barrio para ver solo lo que le toca. Toque el nombre de una obra para saber qué es, qué haría y por qué quedó en ese puesto.</p>
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
        <div className="mt-3 overflow-x-auto rounded-2xl border border-nivel bg-superficie">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nivel text-left text-tinta-suave">
                <th className="px-3 py-2 font-semibold">Puesto en la comuna</th>
                <th className="px-3 py-2 font-semibold">Obra</th>
                <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Personas beneficiadas</th>
                <th className="px-3 py-2 text-right font-semibold">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-tinta-suave">No hay obras de este tipo en este barrio.</td></tr>
              )}
              {visibles.map((c) => (
                <Fragment key={c.e.id}>
                  <tr className="border-b border-nivel/70 align-top">
                    <td className="px-3 py-2">
                      <span className="text-lg font-semibold tabular-nums">{c.posicion}</span>
                      <span className="block text-xs text-tinta-tenue">entre {c.rango[0]} y {c.rango[1]}</span>
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => setAbierto(abierto === c.e.id ? null : c.e.id)} aria-expanded={abierto === c.e.id} className="text-left font-semibold text-cable hover:underline">
                        {c.e.nombre}
                      </button>
                      <span className="block text-xs text-tinta-suave">
                        {c.e.tipo_nombre}, {c.e.barrio ?? "sin barrio"}. {num(c.e.cantidad)} {c.e.unidad_cantidad}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{num(c.e.beneficiarios)}</td>
                    <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">{Math.round(c.prioridad * 100)}</td>
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
        <p className="mt-3 text-sm text-tinta-suave">
          El puntaje ordena opciones, no prueba que una obra mejore las cosas ni que sea técnicamente posible. Para ver la ruta real de
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
