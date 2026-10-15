import { useMemo, useState } from "react";
import { useDatos } from "../lib/datos";
import { fecha } from "../lib/formato";
import { ConDatos } from "../components/Estado";
import { Aviso, BotonCabecera, Cabecera, EtiquetaClase, Kpi, Relacionados, Seccion } from "../components/Pagina";
import { Revelar } from "../components/Animacion";

type Noticia = { titulo: string; medio: string; fecha: string | null; enlace: string; barrios: string[]; temas: string[] };
type Radar = {
  generado: string; fuente: string; aviso: string; total: number;
  por_tema: Record<string, number>; por_barrio: Record<string, number>;
  no_listadas_por_respeto: { total: number; nota: string };
  noticias: Noticia[];
};

/** Color de cada tema, tomado del color de su módulo en OTEA. */
const COLOR_TEMA: Record<string, string> = {
  "Basuras y aseo": "#156a73", "Vías y huecos": "#86560a", "Andenes y escaleras": "#1d5aa8", "Movilidad y transporte": "#1d5aa8",
  "Seguridad": "#3f4a63", "Riesgo y clima": "#a2472a", "Servicios públicos": "#156a73", "Espacio público y comunidad": "#2b6446", Otros: "#6b7894",
};

function Contenido({ r }: { r: Radar }) {
  const [tema, setTema] = useState("");
  const [barrio, setBarrio] = useState("");
  const [cuantos, setCuantos] = useState(12);
  const lista = useMemo(() => r.noticias.filter((n) => (!tema || n.temas.includes(tema)) && (!barrio || n.barrios.includes(barrio))), [r, tema, barrio]);
  const desde = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const ultimoAnio = r.noticias.filter((n) => (n.fecha ?? "") >= desde).length;
  const meses = useMemo(() => {
    const m: Record<string, number> = {};
    r.noticias.forEach((n) => n.fecha && (m[n.fecha.slice(0, 7)] = (m[n.fecha.slice(0, 7)] ?? 0) + 1));
    const claves = Object.keys(m).sort();
    if (!claves.length) return [];
    const salida: [string, number][] = [];
    let [a, b] = claves[0].split("-").map(Number);
    const [fa, fb] = claves[claves.length - 1].split("-").map(Number);
    while (a < fa || (a === fa && b <= fb)) {
      const k = `${a}-${String(b).padStart(2, "0")}`;
      salida.push([k, m[k] ?? 0]);
      b++; if (b > 12) { b = 1; a++; }
    }
    return salida;
  }, [r]);
  const maxMes = Math.max(...meses.map((x) => x[1]), 1);
  const maxTema = Math.max(...Object.values(r.por_tema), 1);
  const temaTop = Object.entries(r.por_tema).filter(([t]) => t !== "Otros")[0];

  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Radar de la comuna" icono="alerta" titulo="Lo que dicen las noticias de Santa Cruz"
        texto={<>Titulares sobre la comuna y sus barrios, recogidos automáticamente desde Google Noticias. Sirven para ver qué problemas aparecen una y otra vez y cuándo. Son noticias, no datos oficiales ni conclusiones de OTEA: complementan los datos de la Alcaldía, no los reemplazan.</>}
        pregunta="¿Qué temas y barrios aparecen en las noticias, y cuándo?">
        <BotonCabecera to="/participacion">Reportar un problema</BotonCabecera>
        <BotonCabecera to="/propuesta" claro>Cómo funciona el observatorio</BotonCabecera>
      </Cabecera>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Revelar className="h-full"><Kpi valor={r.total} texto="noticias relevantes encontradas" nota={`Actualizado: ${fecha(r.generado)}`} /></Revelar>
        <Revelar retraso={50} className="h-full"><Kpi valor={ultimoAnio} texto="de ellas, en los últimos 12 meses" /></Revelar>
        <Revelar retraso={100} className="h-full"><Kpi valor={temaTop?.[1] ?? 0} texto={<>sobre <strong>{(temaTop?.[0] ?? "").toLowerCase()}</strong>, el tema más repetido</>} /></Revelar>
        <Revelar retraso={150} className="h-full"><Kpi valor={r.no_listadas_por_respeto.total} texto="noticias de crímenes o víctimas que no se listan" nota="Por respeto a las familias" /></Revelar>
      </div>

      <Seccion mitad id="t-r-tiempo" pregunta="¿Cuándo?" titulo="Cuándo aparece la comuna en las noticias" texto="Noticias relevantes por mes. Un pico casi siempre es una emergencia.">
        <div>
          <div className="grid grid-cols-[1.5rem_1fr] gap-2">
            <div className="flex h-40 flex-col justify-between pb-0.5 text-right text-xs tabular-nums text-tinta-tenue" aria-hidden="true"><span>{maxMes}</span><span>{Math.round(maxMes / 2)}</span><span>0</span></div>
            <div>
              <div className="relative flex h-40 items-end gap-[3px] border-b border-nivel" role="img" aria-label={`Noticias por mes, de ${meses[0]?.[0]} a ${meses[meses.length - 1]?.[0]}. El mes con más tuvo ${maxMes}.`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-nivel" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-nivel" />
                {meses.map(([k, n]) => (
                  <div key={k} className="group relative z-10 flex h-full flex-1 flex-col items-center justify-end" title={`${nombreMes(k)}: ${n} ${n === 1 ? "noticia" : "noticias"}`}>
                    {n > 0 && meses.length <= 26 && <span className="mb-0.5 text-[0.65rem] font-semibold leading-none tabular-nums text-tinta-suave">{n}</span>}
                    <span className="w-full rounded-t bg-tinta transition group-hover:bg-marca" style={{ height: `${(n / maxMes) * 82}%`, minHeight: n ? 3 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-[3px] text-[0.65rem] text-tinta-tenue" aria-hidden="true">
                {meses.map(([k], i) => (
                  <span key={k} className="flex-1 overflow-visible whitespace-nowrap text-center">{i % 3 === 0 || i === meses.length - 1 ? nombreMes(k, true) : ""}</span>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-tinta-suave">Cada barra es un mes. Los meses sin barra no tuvieron noticias relevantes.</p>
        </div>
      </Seccion>

      <Seccion mitad id="t-r-temas" pregunta="¿Sobre qué y dónde?" titulo="Temas y barrios" texto="Toca un tema o un barrio para filtrar la lista de abajo.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-t-2 border-tinta pt-3">
            <ul className="space-y-2">
              {Object.entries(r.por_tema).map(([t, n]) => (
                <li key={t}>
                  <button type="button" onClick={() => { setTema(tema === t ? "" : t); setCuantos(12); }} aria-pressed={tema === t}
                    className={`grid w-full grid-cols-[9.5rem_1fr_1.8rem] items-center gap-2 rounded-lg px-1 py-0.5 text-left text-sm transition hover:bg-papel-hondo ${tema === t ? "bg-papel-hondo font-semibold" : ""}`}>
                    <span className="truncate">{t}</span>
                    <span className="h-2.5 rounded-full bg-papel-hondo"><span className="block h-full rounded-full" style={{ width: `${(n / maxTema) * 100}%`, background: COLOR_TEMA[t] ?? "#7d83a8" }} /></span>
                    <span className="text-right tabular-nums">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t-2 border-tinta pt-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(r.por_barrio).map(([b, n]) => (
                <button key={b} type="button" onClick={() => { setBarrio(barrio === b ? "" : b); setCuantos(12); }} aria-pressed={barrio === b}
                  className="chip !py-1 !text-sm">
                  {b === "Santa Cruz" ? "Santa Cruz (barrio o comuna)" : b} <span className="opacity-70">{n}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-tinta-suave">Muchos titulares dicen solo "Santa Cruz" sin precisar el barrio, por eso ese grupo es el más grande.</p>
          </div>
        </div>
      </Seccion>

      <Seccion id="t-r-lista" pregunta="¿Qué dijeron?" titulo={`Titulares${tema || barrio ? " filtrados" : ""} (${lista.length})`} texto={<span className="inline-flex flex-wrap items-center gap-2"><EtiquetaClase clase="prensa" /> Cada titular enlaza a la noticia original en el sitio del medio.</span>}
        derecha={(tema || barrio) ? <button type="button" className="text-sm font-semibold text-marca underline" onClick={() => { setTema(""); setBarrio(""); }}>Quitar filtros</button> : undefined}>
        <ul className="space-y-2">
          {lista.slice(0, cuantos).map((n) => (
            <li key={n.enlace}>
              <a href={n.enlace} target="_blank" rel="noopener noreferrer" className="block border-b border-nivel py-3.5 transition hover:bg-papel-hondo/60">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-suave">
                  <span className="font-semibold">{n.medio || "Medio sin nombre"}</span><span>·</span><span>{fecha(n.fecha)}</span>
                  {n.temas.map((t) => <span key={t} className="mono rounded border px-1.5 py-0.5 text-[0.66rem] uppercase" style={{ color: COLOR_TEMA[t] ?? "#6b7894", borderColor: "currentColor" }}>{t}</span>)}
                  {n.barrios.map((b) => <span key={b} className="rounded bg-papel-hondo px-1.5 py-0.5 font-medium text-tinta">{b}</span>)}
                </span>
                <span className="mt-1.5 block text-base font-semibold leading-snug">{n.titulo} <span aria-hidden="true" className="text-marca">↗</span></span>
              </a>
            </li>
          ))}
          {lista.length === 0 && <li className="vacio text-sm">No hay titulares con ese filtro. Quita el tema o el barrio para ver más.</li>}
        </ul>
        {lista.length > cuantos && (
          <button type="button" onClick={() => setCuantos((c) => c + 24)} className="boton boton-2 mt-4">Ver {Math.min(24, lista.length - cuantos)} titulares más ({lista.length - cuantos} restantes)</button>
        )}
      </Seccion>

      <Aviso tono="ojo" titulo="Qué hay que saber antes de usar esto">
        <ul className="mt-1 list-disc space-y-1.5 pl-5">
          <li>{r.aviso}</li>
          <li>Que un tema salga mucho en noticias no quiere decir que sea el problema más grande: los medios cubren más lo que es llamativo.</li>
          <li>Se guarda solo el titular, el medio, la fecha y el enlace. El texto de la noticia es de cada medio y se lee en su sitio.</li>
          <li>No se recolecta nada de TikTok, Facebook ni otras redes sociales, ni datos de personas. Por qué, en <a className="font-semibold text-marca underline" href="#/propuesta">la propuesta</a>.</li>
          <li>Se actualiza corriendo <code>python data-pipeline/radar.py</code>; después hay que volver a subir el archivo generado. Última actualización: {fecha(r.generado)}.</li>
        </ul>
      </Aviso>

      <Relacionados ids={["problematicas", "propuesta", "mapa"]} />
    </div>
  );
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "2024-11" a "nov 2024" (o "nov 24" si es corto). */
function nombreMes(k: string, corto = false) {
  const [a, m] = k.split("-");
  return `${MESES[Number(m) - 1] ?? k} ${corto ? a.slice(2) : a}`;
}

export default function RadarPagina() {
  const estado = useDatos<Radar>("radar.json");
  return <ConDatos estado={estado}>{(d) => <Contenido r={d} />}</ConDatos>;
}
