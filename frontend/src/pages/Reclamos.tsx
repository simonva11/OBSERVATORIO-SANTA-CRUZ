import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConDatos } from "../components/Estado";
import { Foto } from "../components/FichaElemento";
import { BotonCabecera, Cabecera, Kpi, Relacionados, Seccion } from "../components/Pagina";
import { useDatos } from "../lib/datos";
import { fecha, num } from "../lib/formato";

interface BarrioHuecos { barrio: string; total: number; arreglados: number; pendientes: number; dias_mediana: number | null }
interface Reclamos {
  generado: string;
  huecos: {
    reportes_total: number; arreglados: number; pendientes: number; descartados: number; duplicados: number; con_foto: number;
    dias_mediana: number | null; dias_p90: number | null; dias_n: number; desde: string; hasta: string;
    por_anio: Record<string, number>; por_barrio: BarrioHuecos[];
  };
  obras: { total: number; por_dominio: Record<string, number>; por_tipo: Record<string, number>; por_estado: Record<string, number>; por_barrio: Record<string, number> };
  quebradas: { total: number; basuras: number; por_problema: Record<string, number>; por_quebrada: { quebrada: string; total: number; basuras: number }[]; por_barrio: Record<string, number> };
}
interface PuntoHueco { properties: { estado: string; barrio?: string; reportado?: string; espera?: number; prioridad?: string; origen?: string; foto?: string } }

const DOMINIO: Record<string, string> = { "Infraestructura migracion": "Registros antiguos (migrados)", "Obra pública Atípica": "Obra pública atípica" };

function Barra({ valor, max, color = "bg-marca" }: { valor: number; max: number; color?: string }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-nivel" aria-hidden>
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${max ? Math.max(2, Math.round((valor / max) * 100)) : 0}%` }} />
    </span>
  );
}

/** Lista de barras con su número al lado: cada fila es "nombre, barra, cifra". */
function Lista({ filas, color }: { filas: [string, number][]; color?: string }) {
  const max = Math.max(1, ...filas.map(([, v]) => v));
  return (
    <ul className="space-y-2.5">
      {filas.map(([n, v]) => (
        <li key={n} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 sm:grid-cols-[15rem_1fr_3rem]">
          <span className="text-sm">{DOMINIO[n] ?? n}</span>
          <span className="order-last col-span-2 sm:order-none sm:col-span-1"><Barra valor={v} max={max} color={color} /></span>
          <span className="text-right text-sm font-semibold tabular-nums">{num(v)}</span>
        </li>
      ))}
    </ul>
  );
}

function Contenido({ r, puntos }: { r: Reclamos; puntos: PuntoHueco[] }) {
  const [barrio, setBarrio] = useState("");
  const h = r.huecos;
  const filas = h.por_barrio.filter((b) => b.barrio !== "Sin barrio");
  const sel = filas.find((b) => b.barrio === barrio);
  const maxAnio = Math.max(...Object.values(h.por_anio));
  const anioActual = h.hasta.slice(0, 4);

  const viejos = useMemo(
    () => puntos.map((f) => f.properties).filter((p) => p.estado === "Pendiente" && (!barrio || p.barrio === barrio)).sort((a, b) => (b.espera ?? 0) - (a.espera ?? 0)).slice(0, 8),
    [puntos, barrio],
  );
  const pendAnio = puntos.filter((f) => f.properties.estado === "Pendiente" && (f.properties.espera ?? 0) > 365).length;
  const mapa = `/mapa?capas=huecos,solicitudes_obras,solicitudes_quebradas`;

  return (
    <div className="mx-auto max-w-[112rem] space-y-10 px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Huecos y reclamos" icono="alerta" titulo="Lo que la gente ya le reportó a la Alcaldía"
        texto="Huecos, obras pedidas y basuras en las quebradas de la Comuna 2, según los registros públicos de la Alcaldía. Son reportes, no un conteo de todo lo que está dañado: solo aparece lo que alguien se tomó el trabajo de reportar.">
        <BotonCabecera to={mapa}>Verlo en el mapa</BotonCabecera>
        <BotonCabecera to="/participacion" claro>Reportar un problema</BotonCabecera>
      </Cabecera>

      <section aria-label="Cifras principales" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi valor={num(h.reportes_total)} texto="reportes de huecos desde 2020" nota={`${num(h.descartados + h.duplicados)} son duplicados o descartados`} tono="ambar" />
        <Kpi valor={num(h.arreglados)} texto="ya aparecen como arreglados" nota={`${Math.round((h.arreglados / (h.arreglados + h.pendientes)) * 100)} % de los que siguen en el sistema`} tono="verde" />
        <Kpi valor={num(h.pendientes)} texto="siguen pendientes" nota={pendAnio ? `${num(pendAnio)} llevan más de un año esperando` : undefined} tono="rojo" />
        <Kpi valor={h.dias_mediana == null ? "Sin dato" : `${num(h.dias_mediana)} días`} texto="tarda la mitad de los arreglos" nota={h.dias_p90 == null ? undefined : `El 10 % más lento tarda ${num(h.dias_p90)} días o más`} tono="ambar" />
      </section>

      <Seccion id="t-barrio" titulo="Huecos por barrio" texto="Elija un barrio para ver sus números y los pendientes que llevan más tiempo esperando."
        derecha={
          <label className="flex items-center gap-2 text-sm font-semibold">
            Barrio
            <select value={barrio} onChange={(e) => setBarrio(e.target.value)} className="h-10 rounded-lg border border-nivel bg-superficie px-3 text-base font-normal">
              <option value="">Toda la comuna</option>
              {filas.map((b) => <option key={b.barrio} value={b.barrio}>{b.barrio}</option>)}
            </select>
          </label>
        }>
        {sel && (
          <p className="mb-3 rounded-xl border border-nivel bg-superficie p-3 text-sm">
            En <strong>{sel.barrio}</strong> hay {num(sel.total)} reportes: {num(sel.arreglados)} arreglados y {num(sel.pendientes)} pendientes.
            {sel.dias_mediana != null && <> La mitad de los arreglos tardó {num(sel.dias_mediana)} {sel.dias_mediana === 1 ? "día" : "días"} o menos.</>}
          </p>
        )}
        <div className="overflow-x-auto rounded-2xl border border-nivel bg-superficie">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-nivel text-left text-tinta-suave">
                <th className="px-3 py-2 font-semibold">Barrio</th>
                <th className="px-3 py-2 text-right font-semibold">Reportes</th>
                <th className="px-3 py-2 text-right font-semibold">Arreglados</th>
                <th className="px-3 py-2 text-right font-semibold">Pendientes</th>
                <th className="px-3 py-2 text-right font-semibold">Mitad se arregla en</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((b) => (
                <tr key={b.barrio} className={`border-b border-nivel/70 ${b.barrio === barrio ? "bg-marca/10" : ""}`}>
                  <td className="px-3 py-2 font-semibold">{b.barrio}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(b.total)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(b.arreglados)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{num(b.pendientes)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.dias_mediana == null ? "Sin dato" : `${num(b.dias_mediana)} ${b.dias_mediana === 1 ? "día" : "días"}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-tinta-tenue">La columna de reportes incluye los duplicados y descartados, por eso no suma exactamente arreglados más pendientes.</p>
      </Seccion>

      <Seccion id="t-viejos" titulo="Los pendientes que más llevan esperando" texto={barrio ? `En ${barrio}.` : "En toda la comuna."}>
        {viejos.length === 0 ? (
          <p className="rounded-xl border border-nivel bg-superficie p-4 text-sm">No hay huecos pendientes en este barrio.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {viejos.map((p, i) => (
              <li key={`${p.reportado}-${i}`} className="overflow-hidden rounded-xl border border-nivel bg-superficie">
                {p.foto && <Foto url={p.foto} alto="h-32" />}
                <div className="p-3 text-sm">
                  <p className="font-semibold">{p.barrio ?? "Sin barrio"}</p>
                  <p>Reportado el {fecha(p.reportado)}</p>
                  <p className="text-tinta-suave">Lleva {num(p.espera ?? 0)} días esperando{p.prioridad ? `. Prioridad ${p.prioridad.toLowerCase()}` : ""}.</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-tinta-suave">
          Un pendiente muy viejo puede ser un hueco que ya se arregló y nunca se cerró en el sistema, o uno que sigue ahí. Para saberlo hay que ir a verlo.
          Si es de su cuadra, el <Link to="/lideres" className="text-cable underline">Kit para líderes</Link> tiene la carta y a quién acudir.
        </p>
      </Seccion>

      <Seccion id="t-anio" titulo="Reportes de huecos por año" texto={`El ${anioActual} va hasta el ${fecha(h.hasta)}.`}>
        <div className="flex h-40 items-end gap-2 rounded-2xl border border-nivel bg-superficie p-4" role="img" aria-label="Reportes de huecos por año">
          {Object.entries(h.por_anio).map(([a, v]) => (
            <div key={a} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-xs font-semibold tabular-nums">{num(v)}</span>
              <span className="w-full rounded-t bg-marca" style={{ height: `${Math.max(3, Math.round((v / maxAnio) * 100))}px` }} />
              <span className="text-xs text-tinta-suave">{a}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-tinta-suave">Que suban o bajen los reportes no quiere decir que haya más o menos huecos: también depende de cuánta gente conoce y usa la aplicación.</p>
      </Seccion>

      <Seccion id="t-obras" titulo="Obras que se han pedido" texto={`${num(r.obras.total)} solicitudes a Infraestructura Física en la comuna, de todos los años.`}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-nivel bg-superficie p-4">
            <h3 className="mb-3 font-semibold">Qué tipo de obra</h3>
            <Lista filas={Object.entries(r.obras.por_dominio).filter(([, v]) => v > 1)} />
          </div>
          <div className="rounded-2xl border border-nivel bg-superficie p-4">
            <h3 className="mb-3 font-semibold">En qué van</h3>
            <Lista filas={Object.entries(r.obras.por_estado)} color="bg-cable" />
            <p className="mt-3 text-xs text-tinta-tenue">«En proceso» es solo un estado del trámite: no dice que la obra tenga presupuesto ni fecha.</p>
          </div>
        </div>
      </Seccion>

      <Seccion id="t-quebradas" titulo="Basuras y daños en las quebradas" texto={`${num(r.quebradas.total)} solicitudes sobre quebradas, ${num(r.quebradas.basuras)} de ellas por basuras o escombros.`}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-nivel bg-superficie p-4">
            <h3 className="mb-3 font-semibold">Qué problema se reporta</h3>
            <Lista filas={Object.entries(r.quebradas.por_problema).slice(0, 8)} color="bg-ambar" />
          </div>
          <div className="rounded-2xl border border-nivel bg-superficie p-4">
            <h3 className="mb-3 font-semibold">Quebradas con más solicitudes</h3>
            <Lista filas={r.quebradas.por_quebrada.slice(0, 8).map((q) => [q.quebrada, q.total])} color="bg-cable" />
            <p className="mt-3 text-xs text-tinta-tenue">Las basuras en quebradas se cruzan con el riesgo de ladera: <Link to="/riesgo" className="text-cable underline">ver Riesgo</Link>.</p>
          </div>
        </div>
      </Seccion>

      <Seccion id="t-leer" titulo="Cómo leer estos datos">
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm text-tinta-suave">
          <li>Cada punto es un reporte. Dos personas pueden reportar el mismo hueco; la Alcaldía marca los repetidos como duplicados y aquí no se dibujan.</li>
          <li>Los barrios donde más gente usa la aplicación aparecen con más reportes, aunque no sean los más dañados.</li>
          <li>«Arreglado» es lo que dice el registro de la Alcaldía. No sabemos si el arreglo duró.</li>
          <li>{num(h.con_foto)} de los huecos que aparecen en el mapa traen foto. Las fotos están en el sitio de la Alcaldía y se abren desde ahí.</li>
          <li>Los registros públicos traen nombres, teléfonos y correos de quienes reportaron. Aquí no se descargan ni se muestran.</li>
          <li>Datos descargados el {fecha(r.generado)}. Fuente: Sistema de Gestión Vial y SIRO (Secretaría de Infraestructura Física), publicados en GeoMedellín.</li>
        </ul>
      </Seccion>
      <Relacionados ids={["mapa", "riesgo", "prioridades"]} />
    </div>
  );
}

export default function Reclamos() {
  const r = useDatos<Reclamos>("reclamos.json");
  const huecos = useDatos<{ features: PuntoHueco[] }>("huecos.geojson");
  const puntos = huecos.estado === "listo" ? huecos.datos.features : [];
  return <ConDatos estado={r}>{(d) => <Contenido r={d} puntos={puntos} />}</ConDatos>;
}
