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
  return escenarios.map((e, i) => ({ e, prioridad: base[i], rango: rangos[i], posicion: posicion[i] }));
}

const DUDAS: { p: string; r: React.ReactNode }[] = [
  { p: "¿Esto significa que ya se va a construir algo?", r: "No. Son propuestas del modelo para conversar. No son obras aprobadas, contratadas ni prometidas por ninguna entidad." },
  { p: "¿De dónde salen los escenarios?", r: "De dos fuentes: los espacios públicos que ya propone el POT y los andenes angostos que aparecen en el inventario. Al abrir un escenario se ve su origen y el problema que atendería." },
  { p: "¿Por qué no aparece cuánto cuesta cada obra?", r: "Porque no se encontró una fuente pública confiable de precios para estas obras en Medellín, y no se van a inventar. Por eso el puesto habla de necesidad, no de presupuesto." },
  { p: "¿Cómo se cuentan las personas beneficiadas?", r: "Se estiman obra por obra con los residentes de la Comuna 2 del Censo 2018. Nunca se usa toda la población de la comuna. El método exacto está en cada escenario." },
  { p: "¿Qué quiere decir «entre 3 y 8» debajo del puesto?", r: "Que los pesos de arriba son una propuesta y podrían ser otros. Se movieron al azar 300 veces y ese es el rango de puestos en el que cayó el escenario. Si el rango es corto, el puesto es firme." },
  { p: "Mi barrio casi no sale, ¿es que no hace falta nada?", r: "No necesariamente. Solo se evalúan las obras que los datos permiten identificar. Si sabe de una necesidad que no está, cuéntela por Participación." },
  { p: "¿Qué hago si quiero pedir una obra?", r: (<>Lo más directo es un derecho de petición. En el <Link to="/lideres" className="text-cable underline">Kit para líderes</Link> hay una carta lista, los plazos que tiene la entidad para responder y a quién acudir.</>) },
];

function Contenido({ escenarios }: { escenarios: Escenario[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Escenario["tipo"]>("todos");
  const calculos = useMemo(() => calcular(escenarios), [escenarios]);
  const visibles = calculos.filter((c) => filtro === "todos" || c.e.tipo === filtro).sort((a, b) => a.posicion - b.posicion);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-5 lg:px-8">
      <Cabecera etiqueta="Prioridad de obras" icono="prioridades" titulo="Dónde intervenir primero"
        texto="Una lista para conversar con la comunidad: qué espacios públicos y andenes podrían hacerle más falta a cada barrio, y por qué. Son propuestas del modelo, no obras aprobadas ni contratadas." >
        <BotonCabecera to="/mapa">Verlo en el mapa</BotonCabecera>
        <BotonCabecera to="/lideres" claro>Cómo pedir una obra</BotonCabecera>
      </Cabecera>

      <section aria-labelledby="t-como">
        <h2 id="t-como" className="text-lg font-semibold">Cómo se ordena la lista</h2>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">
          Cada obra recibe un puntaje de 0 a 100 según cuatro cosas. Los pesos los propuso el equipo y no son oficiales.
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="t-lista" className="text-lg font-semibold">Las obras, de más a menos necesaria</h2>
            <p className="mt-1 max-w-3xl text-sm text-tinta-suave">Toque el nombre de una obra para ver el problema que atiende y cómo se hicieron las cuentas.</p>
          </div>
          <div role="group" aria-label="Filtrar por tipo" className="flex gap-2">
            {(["todos", "espacio_publico", "andenes"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className={`rounded-full border px-3 py-1.5 text-sm ${filtro === f ? "border-acento bg-acento text-white" : "border-nivel bg-superficie"}`}>
                {f === "todos" ? "Todos" : f === "espacio_publico" ? "Espacio público" : "Andenes"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-nivel bg-superficie">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-nivel text-left text-tinta-suave">
                <th className="px-3 py-2 font-semibold">Puesto</th>
                <th className="px-3 py-2 font-semibold">Obra</th>
                <th className="px-3 py-2 text-right font-semibold">Personas beneficiadas</th>
                <th className="px-3 py-2 text-right font-semibold">Puntaje</th>
              </tr>
            </thead>
            <tbody>
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
                    <td className="px-3 py-2 text-right tabular-nums">{num(c.e.beneficiarios)}</td>
                    <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">{Math.round(c.prioridad * 100)}</td>
                  </tr>
                  {abierto === c.e.id && (
                    <tr className="border-b border-nivel/70 bg-papel">
                      <td colSpan={4} className="px-3 py-3">
                        <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2">
                          <div><dt className="font-semibold">Problema identificado</dt><dd>{c.e.problema}</dd></div>
                          <div><dt className="font-semibold">Origen del escenario</dt><dd>{c.e.origen}</dd></div>
                          <div><dt className="font-semibold">Cómo se estiman los beneficiarios</dt><dd>{c.e.metodo_beneficiarios}</dd></div>
                          <div><dt className="font-semibold">Mejora potencial</dt><dd>{num(c.e.mejora)}: {c.e.metodo_mejora}</dd></div>
                          <div><dt className="font-semibold">Espacio público del barrio</dt><dd>{c.e.ep_barrio_m2_hab == null ? "Sin dato" : `${dec2(c.e.ep_barrio_m2_hab)} m² por persona`}</dd></div>
                          <div><dt className="font-semibold">Atropellos del barrio</dt><dd>{c.e.atropellos_por_mil == null ? "Sin dato" : `${dec2(c.e.atropellos_por_mil)} por cada mil habitantes (2019 a 2025)`}</dd></div>
                          <div className="md:col-span-2"><dt className="font-semibold">Nivel de confianza y supuestos</dt><dd>{c.e.confianza}. Los beneficiarios solo cuentan residentes de la Comuna 2 (Censo 2018).</dd></div>
                        </dl>
                      </td>
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
  return <ConDatos estado={estado}>{(e) => <Contenido escenarios={e} />}</ConDatos>;
}
