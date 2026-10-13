import { useEffect, useMemo, useState } from "react";
import { useDatos } from "../lib/datos";
import { dec, dec2, fecha, num, pct } from "../lib/formato";
import { calcularIndice } from "../lib/indice";
import { limpiarTexto } from "../lib/reporte";
import { DIRECTORIO } from "../lib/acudir";
import { habilesHasta, TIPOS_PETICION, vence, type TipoPeticion } from "../lib/plazos";
import type { Coleccion, Indicadores } from "../lib/tipos";
import { ConDatos } from "../components/Estado";
import { Cabecera, Seccion } from "../components/Pagina";

type Fila = Record<string, number | string | null>;

const CLAVE = "observatorio-santa-cruz:lideres-peticiones:v1";

const TEMAS: Record<string, { nombre: string; entidad: string; pedir: string[] }> = {
  andenes: {
    nombre: "andenes y caminos peatonales",
    entidad: "Secretaría de Infraestructura Física de Medellín",
    pedir: ["Informar si hay obras o mantenimiento de andenes programados en el barrio y su cronograma.", "Programar una visita técnica a los tramos con andén angosto o dañado."],
  },
  espacio: {
    nombre: "espacio público y parques",
    entidad: "Departamento Administrativo de Planeación de Medellín",
    pedir: ["Informar qué proyectos de espacio público del POT están previstos para el barrio y en qué estado están.", "Indicar cómo puede la comunidad participar en su priorización."],
  },
  movilidad: {
    nombre: "acceso al Metro y a las paradas de bus",
    entidad: "Secretaría de Movilidad de Medellín",
    pedir: ["Informar si hay estudios o proyectos para mejorar el acceso peatonal a las estaciones.", "Evaluar rutas de bus o conexiones peatonales para los sectores más lejanos."],
  },
  vial: {
    nombre: "seguridad vial y atropellos",
    entidad: "Secretaría de Movilidad de Medellín",
    pedir: ["Informar qué medidas de seguridad vial hay previstas en los puntos con más atropellos.", "Realizar un estudio de los cruces y velocidades en el barrio."],
  },
  riesgo: {
    nombre: "zonas de amenaza por movimiento en masa",
    entidad: "Departamento Administrativo de Gestión del Riesgo de Desastres (DAGRD)",
    pedir: ["Informar el estado de las zonas de amenaza alta del barrio y las medidas de mitigación previstas.", "Programar una visita técnica a los sectores con mayor amenaza."],
  },
};

/** Hechos del barrio con su cifra, sacados de los indicadores del observatorio. Nada se escribe a mano. */
function hechos(ind: Indicadores, codigo: string, tema: string): string[] {
  const b = ind.barrios.find((x) => x.codigo === codigo)!;
  const c = ind.comuna;
  const acc = (ind.accesibilidad?.barrios as Fila[] | undefined)?.find((x) => x.barrio === b.nombre);
  const an = ind.infraestructura?.andenes.barrios.find((x: Fila) => x.barrio === b.nombre) as Fila | undefined;
  switch (tema) {
    case "andenes":
      return an ? [`Ancho mediano de andén: ${dec2(an.ancho_mediano_m as number)} m; ${pct(an.andenes_angostos_pct as number)} de los andenes miden menos de 1,2 m.`] : [];
    case "espacio":
      return [`Espacio público: ${dec2(b.espacio_publico_m2_hab)} m² por habitante (toda la comuna: ${dec2(c.espacio_publico_m2_hab)}; referencia nacional: 15).`];
    case "movilidad":
      return acc ? [`${pct(acc.transporte_masivo_10min_pct as number)} de las personas llegan caminando al Metro o Metrocable en 10 minutos o menos; el promedio es ${dec(acc.transporte_masivo_promedio_min as number)} minutos.`] : [];
    case "vial":
      return [`${num(b.atropellos)} atropellos registrados entre 2019 y 2025, de ${num(b.siniestros_viales)} siniestros viales en total.`];
    default:
      return [`${pct(b.amenaza_alta_pct)} de la superficie del barrio está en amenaza alta por movimiento en masa (toda la comuna: ${pct(c.amenaza_pct?.Alta ?? null)}). Es una estimación por área del POT, no un conteo.`];
  }
}

interface Peticion {
  id: string;
  asunto: string;
  entidad: string;
  radicado: string; // AAAA-MM-DD
  numero: string;
  respondida?: boolean;
  tipo?: TipoPeticion; // las guardadas antes no lo traen: cuentan como petición general
}

function leer(): Peticion[] {
  try {
    const l = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(l) ? l.filter((p) => p && typeof p.id === "string" && typeof p.radicado === "string") : [];
  } catch {
    return [];
  }
}

/** Quién hay en el barrio: sedes educativas, escenarios y equipamientos con nombre, del inventario oficial. */
function Actores({ codigo }: { codigo: string }) {
  const eq = useDatos<Coleccion>("equipamientos.geojson");
  const se = useDatos<Coleccion>("sedes_educativas.geojson");
  const es = useDatos<Coleccion>("escenarios_deportivos.geojson");
  if (eq.estado !== "listo" || se.estado !== "listo" || es.estado !== "listo") return <p className="text-sm text-tinta-suave">Cargando el inventario…</p>;
  const de = (c: Coleccion) => c.features.filter((f) => f.properties?.codigo_barrio === codigo);
  const grupos: Record<string, string[]> = {};
  const sumar = (g: string, n: unknown) => {
    const nombre = typeof n === "string" ? n.trim() : "";
    if (nombre) (grupos[g] ??= []).push(nombre);
  };
  de(se.datos).forEach((f) => sumar("Sedes educativas", f.properties?.nombre));
  de(es.datos).forEach((f) => sumar("Escenarios deportivos", f.properties?.nombre));
  de(eq.datos).forEach((f) => sumar(String(f.properties?.grupo ?? "Otros equipamientos"), f.properties?.nombre));
  const filas = Object.entries(grupos).sort((a, b) => b[1].length - a[1].length);
  if (!filas.length) return <p className="text-sm text-tinta-suave">El inventario oficial no registra sedes ni equipamientos en este barrio.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {filas.map(([g, nombres]) => (
        <div key={g} className="rounded-2xl border border-nivel bg-superficie p-3 text-sm shadow-sm">
          <p className="font-semibold">{g} <span className="font-normal text-tinta-suave">({nombres.length})</span></p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-tinta-suave">{nombres.slice(0, 8).map((n, i) => <li key={i}>{n}</li>)}{nombres.length > 8 && <li>y {nombres.length - 8} más</li>}</ul>
        </div>
      ))}
    </div>
  );
}

const limite = (p: Peticion) => vence(p.radicado, TIPOS_PETICION[p.tipo ?? "general"].dias);

function Contenido({ ind }: { ind: Indicadores }) {
  const [codigo, setCodigo] = useState(ind.barrios[0].codigo);
  const [tema, setTema] = useState("andenes");
  const [copiado, setCopiado] = useState(false);
  const [lista, setLista] = useState<Peticion[]>(leer);
  const [asunto, setAsunto] = useState("");
  const [numero, setNumero] = useState("");
  const [tipoNuevo, setTipoNuevo] = useState<TipoPeticion>("general");
  const [entidadNueva, setEntidadNueva] = useState("");
  const [rad, setRad] = useState(new Date().toISOString().slice(0, 10));
  const [errorLista, setErrorLista] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lista));
    } catch {
      /* sin almacenamiento: dura solo esta visita */
    }
  }, [lista]);

  const b = ind.barrios.find((x) => x.codigo === codigo)!;
  const sinRespuesta = lista.filter((p) => !p.respondida && habilesHasta(limite(p)) < 0).length;
  const ranking = useMemo(() => calcularIndice(ind), [ind]);
  const mio = ranking.find((x) => x.codigo === codigo)!;
  const peores = [...mio.componentes].sort((x, y) => x.puntos - y.puntos).slice(0, 2);
  const t = TEMAS[tema];
  const hs = hechos(ind, codigo, tema);

  const carta = [
    "[CIUDAD], [FECHA]",
    "",
    "Señores",
    t.entidad,
    "Ciudad",
    "",
    `Asunto: derecho de petición sobre ${t.nombre} en el barrio ${b.nombre}, Comuna 2 (Santa Cruz), Medellín.`,
    "",
    "Respetados señores:",
    "",
    "En ejercicio del derecho de petición (artículo 23 de la Constitución Política y Ley 1755 de 2015), les solicito de manera respetuosa:",
    "",
    ...t.pedir.map((p, i) => `${i + 1}. ${p}`),
    "",
    "Hechos que respaldan esta solicitud:",
    ...hs.map((h) => `- ${h}`),
    `Fuente: OTEA, Observatorio Santa Cruz, con datos de la Alcaldía de Medellín y el DANE (Censo 2018), calculados el ${fecha(ind.generado)}.`,
    "",
    `Les pido responder dentro de los ${TIPOS_PETICION.general.dias} días siguientes a la recepción de esta petición (artículo 14, Ley 1755 de 2015).`,
    "",
    "Notificaciones: [DIRECCIÓN O CORREO]",
    "",
    "Atentamente,",
    "[NOMBRE COMPLETO]",
    "C.C. [NÚMERO]",
  ].join("\n");

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(carta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const agregar = () => {
    const a = limpiarTexto(asunto).slice(0, 120);
    const n = limpiarTexto(numero).slice(0, 40);
    if (a.length < 5) return setErrorLista("Escriba un asunto de al menos 5 caracteres.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rad) || new Date(rad).getTime() > Date.now() + 86400000) return setErrorLista("La fecha de radicación no es válida.");
    setErrorLista("");
    setLista((l) => [{ id: crypto.randomUUID?.() ?? String(Date.now()), asunto: a, entidad: limpiarTexto(entidadNueva).slice(0, 100) || t.entidad, radicado: rad, numero: n, tipo: tipoNuevo }, ...l].slice(0, 50));
    setAsunto("");
    setNumero("");
    setEntidadNueva("");
  };

  const campo = "mt-1 h-10 w-full rounded-md border border-nivel bg-superficie px-2 text-sm";
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-5 lg:px-8">
      <Cabecera
        etiqueta="Comunidad"
        icono="estrella"
        titulo="Kit para líderes"
        texto="Para presidentes y miembros de JAC, ediles de la JAL y representantes al Consejo de Planeación: cifras del barrio para la reunión, cartas de petición, un contador de plazos y a quién acudir."
      />

      {sinRespuesta > 0 && (
        <p role="status" className="no-imprimir rounded-lg bg-ambar-claro px-3 py-2 text-sm text-tinta">
          Tiene {sinRespuesta} {sinRespuesta === 1 ? "petición" : "peticiones"} sin respuesta con el plazo de referencia vencido. Revise el contador de plazos más abajo.
        </p>
      )}

      <div className="no-imprimir flex flex-wrap gap-2" role="group" aria-label="Elegir barrio">
        {ind.barrios.map((x) => (
          <button key={x.codigo} type="button" aria-pressed={x.codigo === codigo} onClick={() => setCodigo(x.codigo)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${x.codigo === codigo ? "bg-[#3a2d8f] text-white shadow" : "bg-superficie ring-1 ring-nivel hover:bg-menta"}`}>{x.nombre}</button>
        ))}
      </div>

      <Seccion id="t-l-resumen" titulo={`Resumen para la reunión: ${b.nombre}`} texto="Tres frases con cifra, listas para leer en voz alta o imprimir.">
        <ul className="space-y-2 rounded-2xl border border-nivel bg-superficie p-4 text-sm shadow-sm">
          <li>{num(b.poblacion_2018)} personas y {num(b.viviendas_2018)} viviendas (Censo 2018). Índice de entorno: {mio.total} de 100, puesto {ranking.indexOf(mio) + 1} de {ranking.length} barrios.</li>
          {peores.map((c) => (
            <li key={c.clave}>Punto débil: {c.nombre.toLowerCase()} ({c.valor == null ? "sin dato" : `${c.valor.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${c.unidad}`.trim()}), {c.puntos} de 100 frente a los demás barrios.</li>
          ))}
        </ul>
        <button type="button" onClick={() => window.print()} className="no-imprimir mt-3 rounded-full bg-superficie px-3 py-1.5 text-sm font-medium ring-1 ring-nivel transition hover:bg-menta">Imprimir para la asamblea</button>
      </Seccion>

      <Seccion id="t-l-carta" titulo="Carta de derecho de petición" texto="Elija el tema: la carta se llena con las cifras del barrio. Complete los datos entre corchetes antes de radicarla.">
        <details className="group">
          <summary className="no-imprimir w-fit cursor-pointer list-none rounded-full bg-superficie px-4 py-2 text-sm font-semibold text-marca ring-1 ring-nivel hover:bg-menta">
            <span className="group-open:hidden">Ver la carta</span><span className="hidden group-open:inline">Ocultar la carta</span>
          </summary>
        <div className="no-imprimir mt-3 flex flex-wrap gap-2" role="group" aria-label="Tema de la petición">
          {Object.entries(TEMAS).map(([id, x]) => (
            <button key={id} type="button" aria-pressed={id === tema} onClick={() => setTema(id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${id === tema ? "bg-[#1d4f9a] text-white" : "bg-superficie ring-1 ring-nivel hover:bg-menta"}`}>{x.nombre}</button>
          ))}
        </div>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-nivel bg-superficie p-4 font-sans text-sm leading-relaxed shadow-sm">{carta}</pre>
        <div className="no-imprimir mt-2 flex flex-wrap items-center gap-3">
          <button type="button" onClick={copiar} className="rounded-full bg-marca px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">{copiado ? "Copiada" : "Copiar carta"}</button>
          <p className="text-xs text-tinta-suave">La entidad es una sugerencia: confirme qué dependencia atiende su tema antes de radicar.</p>
        </div>
        </details>
      </Seccion>

      <Seccion id="t-l-plazos" titulo="Contador de plazos" texto="Cuente los días hábiles que tiene la entidad para responder (Ley 1755 de 2015, art. 14): sin sábados, domingos ni festivos, y sin contar el día en que radicó. Si la entidad le avisa por escrito que necesita más tiempo, el plazo cambia.">
        <div className="no-imprimir grid gap-3 rounded-2xl border border-nivel bg-superficie p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="text-sm font-semibold sm:col-span-2">Asunto<input value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={120} className={campo} placeholder="Andén de la calle 107" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Entidad
            <input value={entidadNueva} onChange={(e) => setEntidadNueva(e.target.value)} maxLength={100} list="entidades-l" className={campo} placeholder={t.entidad} />
            <datalist id="entidades-l">{[...new Set(Object.values(TEMAS).map((x) => x.entidad))].map((e) => <option key={e} value={e} />)}</datalist>
          </label>
          <label className="text-sm font-semibold">Qué pidió
            <select value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value as TipoPeticion)} className={campo}>
              {Object.entries(TIPOS_PETICION).map(([id, x]) => <option key={id} value={id}>{x.nombre} ({x.dias} días)</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Radicada el<input type="date" value={rad} onChange={(e) => setRad(e.target.value)} className={campo} /></label>
          <label className="text-sm font-semibold">N.º de radicado<input value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={40} className={campo} placeholder="Opcional" /></label>
          <button type="button" onClick={agregar} className="rounded-full bg-marca px-4 py-2 text-sm font-semibold text-white">Agregar</button>
          {errorLista && <p role="alert" className="text-sm text-ladrillo sm:col-span-2 lg:col-span-4">{errorLista}</p>}
        </div>
        {lista.length === 0 ? (
          <p className="mt-3 text-sm text-tinta-suave">Todavía no hay peticiones en seguimiento.</p>
        ) : (
          <ul className="mt-3 divide-y divide-nivel border-y border-nivel">
            {[...lista].sort((x, y) => Number(!!x.respondida) - Number(!!y.respondida) || limite(x).localeCompare(limite(y))).map((p) => {
              const fin = limite(p);
              const h = habilesHasta(fin);
              const vencida = !p.respondida && h < 0;
              const tipo = TIPOS_PETICION[p.tipo ?? "general"];
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{p.asunto}</p>
                    <p className="text-xs text-tinta-suave">{p.entidad}{p.numero ? ` · radicado ${p.numero}` : ""} · {tipo.nombre.toLowerCase()} · radicada el {fecha(`${p.radicado}T12:00:00`)} · vence el {fecha(`${fin}T12:00:00`)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${vencida ? "bg-ladrillo/15 text-ladrillo" : "bg-menta text-tinta"}`}>
                      {p.respondida ? "Respondida" : vencida ? `Vencida hace ${-h} ${h === -1 ? "día hábil" : "días hábiles"}` : h === 0 ? "Vence hoy" : `Quedan ${h} ${h === 1 ? "día hábil" : "días hábiles"}`}
                    </span>
                    <button type="button" onClick={() => setLista((l) => l.map((x) => (x.id === p.id ? { ...x, respondida: !x.respondida } : x)))} className="no-imprimir text-xs text-marca hover:underline">{p.respondida ? "Reabrir" : "Marcar respondida"}</button>
                    <button type="button" onClick={() => setLista((l) => l.filter((x) => x.id !== p.id))} className="no-imprimir text-xs text-ladrillo hover:underline">Quitar</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {sinRespuesta > 0 && <p className="no-imprimir mt-2 text-sm text-tinta-suave">Una petición vencida sin respuesta se puede llevar a la Personería. Mire a quién acudir más abajo.</p>}
      </Seccion>

      <Seccion id="t-l-acudir" titulo="A quién acudir" texto="Quién es cada entidad, para qué sirve y cómo llegarle. Solo están los datos que se confirmaron en páginas oficiales.">
        <div className="space-y-6">
          {DIRECTORIO.map((g) => (
            <div key={g.titulo}>
              <h3 className="text-base font-semibold">{g.titulo}</h3>
              <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                {g.entradas.map((e) => (
                  <li key={e.quien} className="rounded-2xl border border-nivel bg-superficie p-4 text-sm shadow-sm">
                    <p className="font-semibold">{e.quien}</p>
                    <p className="mt-1 text-tinta-suave">{e.para}</p>
                    <p className="mt-2"><span className="font-semibold">Cómo: </span>{e.como}</p>
                    {e.donde && <p className="mt-1"><span className="font-semibold">Dónde: </span>{e.donde}</p>}
                    {e.url && <a className="mt-2 inline-block font-semibold text-marca underline underline-offset-2" href={e.url} target="_blank" rel="noopener noreferrer">Página oficial</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-base font-semibold">Lugares de {b.nombre} para reunirse</h3>
            <p className="mb-2 text-sm text-tinta-suave">Sedes educativas, escenarios y equipamientos del inventario oficial dentro del barrio. Sirven para escoger dónde hacer una reunión o a quién invitar.</p>
            <Actores codigo={codigo} />
          </div>
        </div>
      </Seccion>

      <Seccion id="t-l-ruta" titulo="Planeación Local y Presupuesto Participativo" texto="Las cuatro fases según la Subsecretaría de Planeación Local y Presupuesto Participativo de la Alcaldía. Las fechas de cada fase se consultan allá: cambian cada año.">
        <ol className="grid gap-3 sm:grid-cols-2">
          {[
            ["1. Planeación participativa", "Elegir o ser elegido representante al Consejo Comunal de Planeación y priorizar ideas para el Plan de Desarrollo Local."],
            ["2. Priorización participativa", "Conocer los proyectos del Plan de Desarrollo Local y elegir los que se harán el año siguiente."],
            ["3. Ejecución", "Hacer control social a los proyectos elegidos mientras la Administración los ejecuta."],
            ["4. Evaluación", "Hacer seguimiento con los informes de seguimiento y evaluación."],
          ].map(([a, d]) => (
            <li key={a} className="rounded-2xl border border-nivel bg-superficie p-4 text-sm shadow-sm"><p className="font-semibold">{a}</p><p className="mt-1 text-tinta-suave">{d}</p></li>
          ))}
        </ol>
        <p className="mt-3 text-sm">
          La página oficial nombra a los Consejos Comunales de Planeación como el espacio de representación y no menciona a las JAC ni a las JAL como actores propios del proceso: pregunte en la Secretaría de Participación Ciudadana cómo se articulan en su comuna.
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          <li><a className="font-semibold text-marca underline underline-offset-2" href="https://www.medellin.gov.co/es/secretaria-participacion-ciudadana/subsecretaria-de-planeacion-local-y-presupuesto-participativo/" target="_blank" rel="noopener noreferrer">Página oficial de la Subsecretaría</a></li>
          <li>Línea Única de Atención a la Ciudadanía: 604 44 44 144 · WhatsApp: 301 604 44 44 · atencion.ciudadana@medellin.gov.co</li>
        </ul>
      </Seccion>
    </div>
  );
}

export default function Lideres() {
  const ind = useDatos<Indicadores>("indicadores.json");
  return <ConDatos estado={ind}>{(d) => <Contenido ind={d} />}</ConDatos>;
}
