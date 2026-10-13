import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConDatos } from "../components/Estado";
import { useDatos } from "../lib/datos";
import { cop, dec2, num } from "../lib/formato";
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

/** Precio unitario registrado por quien usa la plataforma. Nunca viene precargado. */
interface Precio {
  valor: number | null; // COP por unidad de cantidad
  fuente: string;
  fecha: string;
  aiu: number | null; // % de administración, imprevistos y utilidad (o costos indirectos)
}

const CLAVE_PRECIOS = "observatorio-santa-cruz:precios-unitarios:v1";
const TIPOS = [
  { id: "espacio_publico", nombre: "Creación o recuperación de espacio público", unidad: "COP por m² de espacio" },
  { id: "andenes", nombre: "Construcción o mejoramiento de andenes", unidad: "COP por m² de andén" },
] as const;

const CRITERIOS = [
  { id: "beneficiarios", nombre: "Población beneficiada", grupo: "necesidad", peso: 30, explicacion: "Personas estimadas que usarían la obra (ver método de cada escenario)" },
  { id: "deficit_ep", nombre: "Déficit de espacio público del barrio", grupo: "necesidad", peso: 20, explicacion: "Menos m² de espacio público por habitante = más necesidad" },
  { id: "mejora", nombre: "Mejora potencial", grupo: "necesidad", peso: 25, explicacion: "Personas que ganan un parque a 5 minutos, o metros de andén que llegan a 1,2 m. Se compara solo dentro del mismo tipo de obra" },
  { id: "siniestralidad", nombre: "Atropellos en el barrio", grupo: "necesidad", peso: 10, explicacion: "Atropellos 2019 a 2025 por cada mil habitantes del barrio" },
  { id: "costo_beneficiario", nombre: "Costo por persona beneficiada", grupo: "viabilidad", peso: 15, explicacion: "Menos pesos por persona = más viable. Solo se calcula si hay un precio unitario registrado" },
] as const;
type IdCriterio = (typeof CRITERIOS)[number]["id"];

function leerPrecios(): Record<string, Precio> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PRECIOS) ?? "{}");
  } catch {
    return {};
  }
}

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
  costoTotal: number | null;
  costoM2: number | null;
  costoBenef: number | null;
  necesidad: number;
  viabilidad: number | null;
  prioridad: number;
  rango: [number, number];
  posicion: number;
}

function calcular(escenarios: Escenario[], precios: Record<string, Precio>, pesos: Record<IdCriterio, number>): Calculo[] {
  const costos = escenarios.map((e) => {
    const p = precios[e.tipo];
    if (!p || p.valor == null || !p.fuente.trim()) return { total: null, m2: null, benef: null };
    const total = e.cantidad * p.valor * (1 + (p.aiu ?? 0) / 100);
    return { total, m2: e.area_m2 > 0 ? total / e.area_m2 : null, benef: e.beneficiarios > 0 ? total / e.beneficiarios : null };
  });

  // Mejora: se normaliza dentro de cada tipo de obra porque sus unidades son distintas
  const mejoraN = new Array<number | null>(escenarios.length).fill(null);
  for (const t of TIPOS) {
    const idx = escenarios.map((e, i) => (e.tipo === t.id ? i : -1)).filter((i) => i >= 0);
    normalizar(idx.map((i) => escenarios[i].mejora)).forEach((v, j) => (mejoraN[idx[j]] = v));
  }
  const norm: Record<IdCriterio, (number | null)[]> = {
    beneficiarios: normalizar(escenarios.map((e) => e.beneficiarios)),
    deficit_ep: normalizar(escenarios.map((e) => e.ep_barrio_m2_hab), true),
    mejora: mejoraN,
    siniestralidad: normalizar(escenarios.map((e) => e.atropellos_por_mil)),
    costo_beneficiario: normalizar(costos.map((c) => c.benef), true),
  };

  const puntaje = (i: number, w: Record<IdCriterio, number>) => {
    let suma = 0, pesoNec = 0, sumaNec = 0, total = 0;
    for (const c of CRITERIOS) {
      const v = norm[c.id][i];
      if (v == null) continue;
      suma += w[c.id] * v;
      total += w[c.id];
      if (c.grupo === "necesidad") { sumaNec += w[c.id] * v; pesoNec += w[c.id]; }
    }
    return { prioridad: total ? suma / total : 0, necesidad: pesoNec ? sumaNec / pesoNec : 0 };
  };

  const base = escenarios.map((_, i) => puntaje(i, pesos));
  const orden = base.map((b, i) => [b.prioridad, i] as const).sort((a, b) => b[0] - a[0]);
  const posicion = new Array(escenarios.length);
  orden.forEach(([, i], k) => (posicion[i] = k + 1));

  // Análisis de sensibilidad: 300 repeticiones moviendo cada peso al azar entre 50 % y 150 %
  const rangos = escenarios.map(() => [Infinity, -Infinity] as [number, number]);
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  for (let r = 0; r < 300; r++) {
    const w = Object.fromEntries(CRITERIOS.map((c) => [c.id, pesos[c.id] * (0.5 + azar())])) as Record<IdCriterio, number>;
    const o = escenarios.map((_, i) => [puntaje(i, w).prioridad, i] as const).sort((a, b) => b[0] - a[0]);
    o.forEach(([, i], k) => {
      rangos[i][0] = Math.min(rangos[i][0], k + 1);
      rangos[i][1] = Math.max(rangos[i][1], k + 1);
    });
  }

  return escenarios.map((e, i) => ({
    e,
    costoTotal: costos[i].total,
    costoM2: costos[i].m2,
    costoBenef: costos[i].benef,
    necesidad: base[i].necesidad,
    viabilidad: norm.costo_beneficiario[i],
    prioridad: base[i].prioridad,
    rango: rangos[i],
    posicion: posicion[i],
  }));
}

function Formula({ letra, nombre, formula, unidad, nota }: { letra: string; nombre: string; formula: string; unidad: string; nota: string }) {
  return (
    <div className="rounded-xl border border-nivel bg-superficie p-4">
      <p className="text-sm font-semibold text-tinta-suave">{letra}</p>
      <h3 className="font-semibold">{nombre}</h3>
      <p className="mt-2 rounded bg-papel-hondo px-2 py-1.5 font-mono text-[0.8rem]">{formula}</p>
      <p className="mt-2 text-sm">
        Unidad: <strong>{unidad}</strong>
      </p>
      <p className="mt-1 text-sm text-tinta-suave">{nota}</p>
    </div>
  );
}

function Contenido({ escenarios }: { escenarios: Escenario[] }) {
  const [precios, setPrecios] = useState<Record<string, Precio>>(leerPrecios);
  const [pesos, setPesos] = useState<Record<IdCriterio, number>>(Object.fromEntries(CRITERIOS.map((c) => [c.id, c.peso])) as Record<IdCriterio, number>);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Escenario["tipo"]>("todos");

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_PRECIOS, JSON.stringify(precios));
    } catch {
      /* sin almacenamiento: los precios duran solo esta visita */
    }
  }, [precios]);

  const calculos = useMemo(() => calcular(escenarios, precios, pesos), [escenarios, precios, pesos]);
  const visibles = calculos.filter((c) => filtro === "todos" || c.e.tipo === filtro).sort((a, b) => a.posicion - b.posicion);
  const conPrecios = calculos.some((c) => c.costoTotal != null);
  const totalPesos = Object.values(pesos).reduce((a, b) => a + b, 0);
  const hayCostos = calculos.some((c) => c.costoTotal != null);

  const cambiarPrecio = (tipo: string, campo: keyof Precio, valor: string) =>
    setPrecios((p) => {
      const actual: Precio = p[tipo] ?? { valor: null, fuente: "", fecha: "", aiu: null };
      const v = campo === "valor" || campo === "aiu" ? (valor === "" ? null : Math.max(0, Number(valor))) : valor;
      return { ...p, [tipo]: { ...actual, [campo]: v } };
    });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-5 lg:px-8">
      <Cabecera etiqueta="Prioridad de obras" icono="prioridades" titulo="Dónde intervenir primero"
        texto="Escenarios de intervención evaluados con datos verificables: espacios públicos que ya propone el POT y ampliación de andenes angostos. Son propuestas del modelo para discutir, no obras aprobadas ni contratadas." >
        <BotonCabecera to="/mapa">Verlo en el mapa</BotonCabecera>
        <BotonCabecera to="/accesibilidad" claro>Ver la accesibilidad</BotonCabecera>
      </Cabecera>

      <section aria-labelledby="t-ind">
        <h2 id="t-ind" className="text-lg font-semibold">Cuatro indicadores distintos, cada uno con su unidad</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Formula letra="A" nombre="Espacio público por habitante" formula="Área de espacio público existente (m²) ÷ población residente" unidad="m²/persona" nota="Solo espacio existente de la capa oficial; lo proyectado por el POT no se suma. Población: Censo 2018." />
          <Formula letra="B" nombre="Costo por metro cuadrado" formula="Costo total estimado (COP) ÷ área de intervención (m²)" unidad="COP/m²" nota="Solo cuando hay un precio unitario registrado con su fuente." />
          <Formula letra="C" nombre="Costo por persona beneficiada" formula="Costo total estimado (COP) ÷ personas beneficiadas estimadas" unidad="COP/persona" nota="Los beneficiarios se estiman por obra, nunca con toda la población de la comuna." />
          <Formula letra="D" nombre="Presupuesto total" formula="Cantidad de obra × precio unitario × (1 + % costos indirectos)" unidad="COP" nota="La cantidad sale de los datos (m² del POT o del inventario de andenes)." />
        </div>
      </section>

      <section aria-labelledby="t-precios" className="vidrio vidrio--quieto rounded-xl p-4">
        <h2 id="t-precios" className="text-lg font-semibold">Precios unitarios</h2>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">
          La plataforma no trae precios porque no se encontró una fuente pública confiable para estas obras en Medellín. Si el equipo
          consigue uno (por ejemplo, de una licitación o de la base de precios de la Alcaldía), regístrelo con su fuente. Se guarda solo
          en este navegador y se marca como dato registrado por el usuario.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {TIPOS.map((t) => {
            const p = precios[t.id] ?? { valor: null, fuente: "", fecha: "", aiu: null };
            const sinFuente = p.valor != null && !p.fuente.trim();
            return (
              <fieldset key={t.id} className="space-y-2 rounded-xl bg-papel p-4">
                <legend className="float-left mb-2 w-full font-semibold">{t.nombre}</legend>
                <label className="clear-both block text-sm">
                  Precio unitario ({t.unidad})
                  <input type="number" min={0} inputMode="numeric" value={p.valor ?? ""} onChange={(e) => cambiarPrecio(t.id, "valor", e.target.value)} className="mt-1 w-full rounded-lg border border-nivel bg-superficie px-3 py-2 text-base" placeholder="Pendiente de datos" />
                </label>
                <label className="block text-sm">
                  Fuente del precio (obligatoria)
                  <input type="text" value={p.fuente} onChange={(e) => cambiarPrecio(t.id, "fuente", e.target.value)} className={`mt-1 w-full rounded-lg border bg-superficie px-3 py-2 text-base ${sinFuente ? "border-ladrillo" : "border-nivel"}`} placeholder="Ej.: licitación SIF 2025, ítem 3.2" />
                </label>
                {sinFuente && <p className="text-sm text-ladrillo">Sin fuente no se calcula el costo.</p>}
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-sm">
                    Fecha del precio
                    <input type="month" value={p.fecha} onChange={(e) => cambiarPrecio(t.id, "fecha", e.target.value)} className="mt-1 w-full rounded-lg border border-nivel bg-superficie px-3 py-2" />
                  </label>
                  <label className="block text-sm">
                    Costos indirectos (%)
                    <input type="number" min={0} max={100} value={p.aiu ?? ""} onChange={(e) => cambiarPrecio(t.id, "aiu", e.target.value)} className="mt-1 w-full rounded-lg border border-nivel bg-superficie px-3 py-2" placeholder="Opcional" />
                  </label>
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="t-pesos" className="vidrio vidrio--quieto rounded-xl p-4">
        <h2 id="t-pesos" className="text-lg font-semibold">Pesos del modelo</h2>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">
          Son pesos propuestos por el equipo, no oficiales. Cámbielos y la lista se reordena. Cada criterio se normaliza de 0 a 1 antes
          de sumar, para no mezclar unidades.
        </p>
        <div className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
          {CRITERIOS.map((c) => (
            <label key={c.id} className="block">
              <span className="flex justify-between gap-2 font-semibold">
                <span>
                  {c.nombre} <span className="text-xs font-normal text-tinta-tenue">({c.grupo === "necesidad" ? "necesidad" : "viabilidad"})</span>
                </span>
                <span className="tabular-nums">{totalPesos ? Math.round((pesos[c.id] / totalPesos) * 100) : 0} %</span>
              </span>
              <input type="range" min={0} max={50} value={pesos[c.id]} onChange={(e) => setPesos((p) => ({ ...p, [c.id]: +e.target.value }))} className="mt-1 w-full accent-[#6a4fe0]" />
              <span className="block text-sm text-tinta-suave">{c.explicacion}</span>
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="t-lista">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="t-lista" className="text-lg font-semibold">Escenarios ordenados</h2>
            <p className="mt-1 max-w-3xl text-sm text-tinta-suave">
              Tres resultados por separado: <strong>necesidad territorial</strong>, <strong>viabilidad económica preliminar</strong> (solo con
              precio) y <strong>prioridad del modelo</strong>. La columna "Puesto" muestra entre qué posiciones se mueve cada escenario
              cuando los pesos cambian al azar ±50 % (300 repeticiones).
              {!hayCostos && " Sin precios registrados, la prioridad se calcula solo con la necesidad."}
            </p>
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
          <table className={`w-full text-sm ${conPrecios ? "min-w-[980px]" : "min-w-[620px]"}`}>
            <thead>
              <tr className="border-b border-nivel text-left text-tinta-suave">
                <th className="px-3 py-2 font-semibold">Puesto</th>
                <th className="px-3 py-2 font-semibold">Escenario</th>
                <th className="px-3 py-2 text-right font-semibold">Beneficiarios</th>
                <th className="px-3 py-2 text-right font-semibold">Necesidad</th>
                {conPrecios && <th className="px-3 py-2 text-right font-semibold">Costo total</th>}
                {conPrecios && <th className="px-3 py-2 text-right font-semibold">COP/m²</th>}
                {conPrecios && <th className="px-3 py-2 text-right font-semibold">COP/persona</th>}
                {conPrecios && <th className="px-3 py-2 text-right font-semibold">Viabilidad</th>}
                <th className="px-3 py-2 text-right font-semibold">Prioridad</th>
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
                    <td className="px-3 py-2 text-right tabular-nums">{Math.round(c.necesidad * 100)}</td>
                    {conPrecios && <td className="px-3 py-2 text-right tabular-nums">{c.costoTotal == null ? <span className="text-tinta-tenue">Pendiente de datos</span> : cop(c.costoTotal)}</td>}
                    {conPrecios && <td className="px-3 py-2 text-right tabular-nums">{c.costoM2 == null ? <span className="text-tinta-tenue">Pendiente</span> : cop(c.costoM2)}</td>}
                    {conPrecios && <td className="px-3 py-2 text-right tabular-nums">{c.costoBenef == null ? <span className="text-tinta-tenue">Pendiente</span> : cop(c.costoBenef)}</td>}
                    {conPrecios && <td className="px-3 py-2 text-right tabular-nums">{c.viabilidad == null ? <span className="text-tinta-tenue">Pendiente</span> : Math.round(c.viabilidad * 100)}</td>}
                    <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">{Math.round(c.prioridad * 100)}</td>
                  </tr>
                  {abierto === c.e.id && (
                    <tr className="border-b border-nivel/70 bg-papel">
                      <td colSpan={conPrecios ? 9 : 5} className="px-3 py-3">
                        <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2">
                          <div><dt className="font-semibold">Problema identificado</dt><dd>{c.e.problema}</dd></div>
                          <div><dt className="font-semibold">Origen del escenario</dt><dd>{c.e.origen}</dd></div>
                          <div><dt className="font-semibold">Cómo se estiman los beneficiarios</dt><dd>{c.e.metodo_beneficiarios}</dd></div>
                          <div><dt className="font-semibold">Mejora potencial</dt><dd>{num(c.e.mejora)}: {c.e.metodo_mejora}</dd></div>
                          <div><dt className="font-semibold">Espacio público del barrio</dt><dd>{c.e.ep_barrio_m2_hab == null ? "Sin dato" : `${dec2(c.e.ep_barrio_m2_hab)} m²/persona`}</dd></div>
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
          El puntaje ordena opciones según los criterios elegidos; no prueba que una obra cause una mejora ni que sea técnicamente viable.
          Para ver la ruta real de caminata hacia cualquier lugar use <Link to="/mapa?ruta=1" className="text-cable underline">¿Cómo llego?</Link> en el mapa.
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
