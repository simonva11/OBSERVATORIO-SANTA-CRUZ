import { useMemo, useState } from "react";
import { useDatos } from "../lib/datos";
import { fecha } from "../lib/formato";
import { ConDatos } from "../components/Estado";
import { BotonCabecera, Cabecera, Kpi, Relacionados, Seccion } from "../components/Pagina";
import { Revelar } from "../components/Animacion";

type Noticia = { titulo: string; medio: string; fecha: string | null; enlace: string; barrios: string[]; temas: string[] };
type Radar = {
  generado: string; fuente: string; aviso: string; total: number;
  por_tema: Record<string, number>; por_barrio: Record<string, number>;
  no_listadas_por_respeto: { total: number; nota: string };
  noticias: Noticia[];
};

const COLOR_TEMA: Record<string, string> = {
  "Basuras y aseo": "#6a7ae0", "Vías y huecos": "#b05ab0", "Andenes y escaleras": "#6a8ff5", "Movilidad y transporte": "#2d6ae0",
  "Seguridad": "#2e9ad8", "Riesgo y clima": "#c0583a", "Servicios públicos": "#2a8ac8", "Espacio público y comunidad": "#3b82f6", Otros: "#7d83a8",
};

function Contenido({ r }: { r: Radar }) {
  const [tema, setTema] = useState("");
  const [barrio, setBarrio] = useState("");
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
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 lg:px-10">
      <Cabecera etiqueta="Radar de la comuna" icono="alerta" titulo="Lo que dicen las noticias de Santa Cruz"
        texto={<>Titulares sobre la comuna y sus barrios, recogidos solos desde Google Noticias. Sirven para ver qué problemas aparecen una y otra vez y cuándo. No son datos oficiales: complementan, no reemplazan, los datos de la Alcaldía.</>}>
        <BotonCabecera to="/participacion">Reportar un problema</BotonCabecera>
        <BotonCabecera to="/propuesta" claro>Cómo funciona el observatorio</BotonCabecera>
      </Cabecera>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Revelar className="h-full"><Kpi valor={r.total} texto="noticias relevantes encontradas" nota={`Actualizado: ${fecha(r.generado)}`} /></Revelar>
        <Revelar retraso={50} className="h-full"><Kpi valor={ultimoAnio} texto="de ellas, en los últimos 12 meses" tono="ambar" /></Revelar>
        <Revelar retraso={100} className="h-full"><Kpi valor={temaTop?.[1] ?? 0} texto={<>sobre <strong>{(temaTop?.[0] ?? "").toLowerCase()}</strong>, el tema más repetido</>} tono="rojo" /></Revelar>
        <Revelar retraso={150} className="h-full"><Kpi valor={r.no_listadas_por_respeto.total} texto="noticias de crímenes o víctimas que no se listan" nota="Por respeto a las familias" /></Revelar>
      </div>

      <Seccion id="t-r-tiempo" titulo="Cuándo aparece la comuna en las noticias" texto="Noticias relevantes por mes. Un pico casi siempre es una emergencia.">
        <div className="rounded-2xl border border-nivel bg-superficie p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-[1.5rem_1fr] gap-2">
            <div className="flex h-40 flex-col justify-between pb-0.5 text-right text-xs tabular-nums text-tinta-tenue" aria-hidden="true"><span>{maxMes}</span><span>{Math.round(maxMes / 2)}</span><span>0</span></div>
            <div>
              <div className="relative flex h-40 items-end gap-[3px] border-b border-nivel" role="img" aria-label={`Noticias por mes, de ${meses[0]?.[0]} a ${meses[meses.length - 1]?.[0]}. El mes con más tuvo ${maxMes}.`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-nivel" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-nivel" />
                {meses.map(([k, n]) => (
                  <div key={k} className="group relative z-10 flex h-full flex-1 flex-col items-center justify-end" title={`${nombreMes(k)}: ${n} ${n === 1 ? "noticia" : "noticias"}`}>
                    {n > 0 && meses.length <= 26 && <span className="mb-0.5 text-[0.65rem] font-semibold leading-none tabular-nums text-tinta-suave">{n}</span>}
                    <span className="w-full rounded-t bg-[#3b82f6] transition group-hover:bg-[#c0583a]" style={{ height: `${(n / maxMes) * 82}%`, minHeight: n ? 3 : 0 }} />
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

      <Seccion id="t-r-temas" titulo="Temas y barrios" texto="Toca un tema o un barrio para filtrar la lista de abajo.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-nivel bg-superficie p-4 shadow-sm">
            <ul className="space-y-2">
              {Object.entries(r.por_tema).map(([t, n]) => (
                <li key={t}>
                  <button type="button" onClick={() => setTema(tema === t ? "" : t)} aria-pressed={tema === t}
                    className={`grid w-full grid-cols-[9.5rem_1fr_1.8rem] items-center gap-2 rounded-lg px-1 py-0.5 text-left text-sm transition hover:bg-menta-2 ${tema === t ? "bg-menta font-semibold" : ""}`}>
                    <span className="truncate">{t}</span>
                    <span className="h-2.5 rounded-full bg-papel-hondo"><span className="block h-full rounded-full" style={{ width: `${(n / maxTema) * 100}%`, background: COLOR_TEMA[t] ?? "#7d83a8" }} /></span>
                    <span className="text-right tabular-nums">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-nivel bg-superficie p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {Object.entries(r.por_barrio).map(([b, n]) => (
                <button key={b} type="button" onClick={() => setBarrio(barrio === b ? "" : b)} aria-pressed={barrio === b}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${barrio === b ? "bg-[#1e40af] text-white" : "bg-menta-2 hover:bg-menta"}`}>
                  {b === "Santa Cruz" ? "Santa Cruz (barrio o comuna)" : b} <span className="opacity-70">{n}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-tinta-suave">Muchos titulares dicen solo "Santa Cruz" sin precisar el barrio, por eso ese grupo es el más grande.</p>
          </div>
        </div>
      </Seccion>

      <Seccion id="t-r-lista" titulo={`Titulares${tema || barrio ? " filtrados" : ""} (${lista.length})`}
        derecha={(tema || barrio) ? <button type="button" className="text-sm font-semibold text-marca underline" onClick={() => { setTema(""); setBarrio(""); }}>Quitar filtros</button> : undefined}>
        <ul className="space-y-2">
          {lista.map((n) => (
            <li key={n.enlace}>
              <a href={n.enlace} target="_blank" rel="noopener noreferrer" className="fila-modulo block rounded-2xl border border-nivel bg-superficie p-4">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-suave">
                  <span className="font-semibold">{n.medio || "Medio sin nombre"}</span><span>·</span><span>{fecha(n.fecha)}</span>
                  {n.temas.map((t) => <span key={t} className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: COLOR_TEMA[t] ?? "#7d83a8" }}>{t}</span>)}
                  {n.barrios.map((b) => <span key={b} className="rounded-full bg-menta-2 px-2 py-0.5 font-medium text-tinta">{b}</span>)}
                </span>
                <span className="mt-1.5 block text-base font-semibold leading-snug">{n.titulo} <span aria-hidden="true" className="text-marca">↗</span></span>
              </a>
            </li>
          ))}
          {lista.length === 0 && <li className="rounded-2xl border border-dashed border-nivel p-6 text-center text-tinta-suave">No hay titulares con ese filtro.</li>}
        </ul>
      </Seccion>

      <section className="rounded-2xl border border-aviso-borde bg-aviso-fondo p-5 text-sm">
        <h2 className="text-base font-semibold">Qué hay que saber antes de usar esto</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-tinta-suave">
          <li>{r.aviso}</li>
          <li>Que un tema salga mucho en noticias no quiere decir que sea el problema más grande: los medios cubren más lo que es llamativo.</li>
          <li>Se guarda solo el titular, el medio, la fecha y el enlace. El texto de la noticia es de cada medio y se lee en su sitio.</li>
          <li>No se recolecta nada de TikTok, Facebook ni otras redes sociales, ni datos de personas. Por qué, en <a className="font-semibold text-marca underline" href="#/propuesta">la propuesta</a>.</li>
          <li>Se actualiza corriendo <code>python data-pipeline/radar.py</code>; después hay que volver a subir el archivo generado.</li>
        </ul>
      </section>

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
