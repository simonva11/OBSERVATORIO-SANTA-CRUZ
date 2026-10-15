import { useMemo, useState } from "react";
import { useDatos } from "../lib/datos";
import { ConDatos } from "../components/Estado";
import { useProyeccion } from "../lib/proyeccion";
import { dec, num } from "../lib/formato";
import type { Indicadores } from "../lib/tipos";
import { Cabecera, Fuente, Kpi, Relacionados, Seccion } from "../components/Pagina";

type Residuos = {
  generado: string;
  periodo: { desde: string; hasta: string; meses: number };
  t_mes_comuna: number;
  barrios: { nombre: string; t_mes: number }[];
};

const ANCHO = 560;
const ALTO = 600;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Mezcla de azul claro a azul oscuro según qué tan alto es el valor dentro del rango. */
function colorEscala(v: number, min: number, max: number) {
  const t = max > min ? (v - min) / (max - min) : 0.5;
  const a = [214, 236, 235];
  const b = [12, 58, 64];
  return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(",")})`;
}

type Fila = { nombre: string; t: number; pct: number; personas: number | null; kg: number | null };

function MapaBarrios({ filas, sel, onSel }: { filas: Fila[]; sel: string | null; onSel: (n: string | null) => void }) {
  const proy = useProyeccion(ANCHO, ALTO, 24);
  if (!proy) return <div className="aspect-[56/60] w-full animate-pulse rounded-2xl bg-papel-hondo" aria-label="Cargando mapa" />;
  const por = new Map(filas.map((f) => [norm(f.nombre), f]));
  const min = Math.min(...filas.map((f) => f.t));
  const max = Math.max(...filas.map((f) => f.t));
  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="group" aria-label="Mapa de los barrios pintados según las toneladas de residuos al mes">
      {proy.items.map((b) => {
        const f = por.get(norm(b.nombre));
        const activo = f && sel === f.nombre;
        return (
          <g key={b.codigo}>
            <path
              d={b.d}
              fill={f ? colorEscala(f.t, min, max) : "rgb(var(--nivel))"}
              stroke={activo ? "rgb(var(--tinta))" : "rgb(var(--superficie))"}
              strokeWidth={activo ? 3 : 1.5}
              strokeLinejoin="round"
              className="cursor-pointer transition-opacity hover:opacity-80"
              tabIndex={0}
              role="button"
              aria-label={f ? `${f.nombre}: ${num(Math.round(f.t))} toneladas al mes` : b.nombre}
              onClick={() => onSel(f ? (activo ? null : f.nombre) : null)}
              onKeyDown={(e) => e.key === "Enter" && f && onSel(activo ? null : f.nombre)}
            />
          </g>
        );
      })}
      {/* Las etiquetas van después de todos los polígonos para que ningún barrio tape el nombre de otro. */}
      {proy.items.map((b) => {
        const f = por.get(norm(b.nombre));
        return (
          <g key={`t-${b.codigo}`}>
            <text x={b.centro[0]} y={b.centro[1]} textAnchor="middle" fontSize="13" fontWeight="700" className="pointer-events-none" fill={f && (f.t - min) / (max - min || 1) > 0.45 ? "#fff" : "#101729"}>
              {b.nombre.replace("Playón de Los Comuneros", "Playón")}
            </text>
            {f && (
              <text x={b.centro[0]} y={b.centro[1] + 16} textAnchor="middle" fontSize="12" className="pointer-events-none" fill={(f.t - min) / (max - min || 1) > 0.45 ? "#e3f1f2" : "#3e465a"}>
                {num(Math.round(f.t))} t
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Contenido({ r, pob }: { r: Residuos; pob: Record<string, number> }) {
  const [sel, setSel] = useState<string | null>(null);
  const [orden, setOrden] = useState<"t" | "kg" | "nombre">("t");
  const filas: Fila[] = useMemo(() => {
    const total = r.barrios.reduce((a, b) => a + b.t_mes, 0);
    return r.barrios.map((b) => {
      const personas = pob[norm(b.nombre)] ?? null;
      return { nombre: b.nombre, t: b.t_mes, pct: (100 * b.t_mes) / total, personas, kg: personas ? (b.t_mes * 1000) / personas : null };
    });
  }, [r, pob]);
  const ordenadas = [...filas].sort((a, b) => (orden === "nombre" ? a.nombre.localeCompare(b.nombre) : orden === "kg" ? (b.kg ?? 0) - (a.kg ?? 0) : b.t - a.t));
  const mayor = [...filas].sort((a, b) => b.t - a.t)[0];
  const menor = [...filas].sort((a, b) => a.t - b.t)[0];
  const maxKg = [...filas].filter((f) => f.kg != null).sort((a, b) => (b.kg ?? 0) - (a.kg ?? 0))[0];
  const tMax = mayor.t;
  const kgs = filas.map((x) => x.kg).filter((v): v is number => v != null);
  const minKg = Math.min(...kgs);
  const maxKgNum = Math.max(...kgs);
  const f = filas.find((x) => x.nombre === sel) ?? null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi valor={num(Math.round(r.t_mes_comuna))} texto="Toneladas de residuos al mes en la comuna" nota="Suma de los 11 barrios (estimación)" grande />
        <Kpi valor={mayor.nombre} texto="Barrio con más toneladas" nota={`${num(Math.round(mayor.t))} t al mes`} />
        <Kpi valor={menor.nombre} texto="Barrio con menos toneladas" nota={`${num(Math.round(menor.t))} t al mes`} />
        {maxKg && <Kpi valor={`${num(Math.round(maxKg.kg ?? 0))} kg`} texto="Más residuos por persona al mes" nota={maxKg.nombre} />}
      </div>

      <Seccion id="r-mapa" pregunta="¿Cuánto genera cada barrio?" titulo="Toneladas por barrio" texto="Cuanto más oscuro el color, más toneladas al mes. Toca un barrio para ver su detalle. Son estimaciones mensuales, no pesajes por barrio." fuente={<Fuente ids={["residuos_toneladas_barrio"]} calculo="toneladas por barrio estimadas por OTEA" />}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="rounded-xl bg-papel-hondo p-4">
            <MapaBarrios filas={filas} sel={sel} onSel={setSel} />
            <div className="mt-3 flex items-center gap-3 text-sm text-tinta-suave">
              <span>Menos</span>
              <span className="h-3 flex-1 rounded-full" style={{ background: "linear-gradient(90deg, #d6eceb, #0c3a40)" }} />
              <span>Más</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="border-t-2 border-tinta pt-3">
              {f ? (
                <>
                  <p className="text-sm font-bold uppercase tracking-wider text-marca">Barrio elegido</p>
                  <p className="fuente-titulo mt-1 text-3xl font-extrabold tracking-tight">{f.nombre}</p>
                  <p className="mt-3 text-5xl font-extrabold tabular-nums text-[#156a73] fuente-titulo">{num(Math.round(f.t))} <span className="text-xl">t al mes</span></p>
                  <p className="mt-3 text-tinta-suave">
                    Es el {dec(f.pct)} % de lo que se estima para toda la comuna
                    {f.kg != null && <> y equivale a unos {num(Math.round(f.kg))} kg por persona al mes ({num(f.personas ?? 0)} personas, Censo 2018)</>}.
                  </p>
                </>
              ) : (
                <>
                  <p className="fuente-titulo text-2xl font-bold">Toca un barrio del mapa</p>
                  <p className="mt-2 text-tinta-suave">Aquí aparece cuántas toneladas se estiman al mes y cuánto pesa eso por persona.</p>
                </>
              )}
            </div>
            <div className="border-t-2 border-tinta pt-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">Ranking de barrios</p>
                <div className="flex gap-1.5 text-sm" role="group" aria-label="Ordenar por">
                  {([["t", "Toneladas"], ["kg", "Por persona"], ["nombre", "A–Z"]] as const).map(([k, t]) => (
                    <button key={k} type="button" aria-pressed={orden === k} onClick={() => setOrden(k)} className="chip !py-1 !text-sm">{t}</button>
                  ))}
                </div>
              </div>
              <ul className="space-y-2">
                {ordenadas.map((x) => (
                  <li key={x.nombre}>
                    <button type="button" onClick={() => setSel(sel === x.nombre ? null : x.nombre)} className={`grid w-full grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 rounded-xl px-2 py-1.5 text-left ${sel === x.nombre ? "bg-papel-hondo" : "hover:bg-papel-hondo/60"}`}>
                      <span className="truncate text-sm font-medium">{x.nombre}</span>
                      <span className="h-3 overflow-hidden rounded-full bg-papel-hondo">
                        <span className="block h-full rounded-full bg-[#156a73]" style={{ width: `${(orden === "kg" && x.kg != null ? (x.kg / (maxKg?.kg ?? 1)) : x.t / tMax) * 100}%` }} />
                      </span>
                      <span className="text-right text-sm font-bold tabular-nums">{orden === "kg" && x.kg != null ? `${num(Math.round(x.kg))} kg` : `${num(Math.round(x.t))} t`}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion id="r-tabla" pregunta="¿Las cifras exactas?" titulo="Los números, barrio por barrio" fuente={<Fuente ids={["residuos_toneladas_barrio", "manzanas_censo"]} calculo="kg por persona calculados por OTEA" />}>
        <div className="overflow-x-auto">
          <table className="tabla min-w-[34rem]">
            <thead>
              <tr>
                <th className="p-3 font-semibold">Barrio</th>
                <th className="p-3 text-right font-semibold">Toneladas al mes</th>
                <th className="p-3 text-right font-semibold">% de la comuna</th>
                <th className="p-3 text-right font-semibold">Personas (Censo 2018)</th>
                <th className="p-3 text-right font-semibold">Kg por persona al mes</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((x) => (
                <tr key={x.nombre}>
                  <td className="p-3 font-medium">{x.nombre}</td>
                  <td className="p-3 text-right tabular-nums">{dec(x.t)}</td>
                  <td className="p-3 text-right tabular-nums">{dec(x.pct)} %</td>
                  <td className="p-3 text-right tabular-nums">{x.personas != null ? num(x.personas) : "—"}</td>
                  <td className="p-3 text-right tabular-nums">{x.kg != null ? dec(x.kg) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion id="r-por-que" pregunta="¿Qué significa la diferencia?" titulo="¿Por qué cambian las toneladas de un barrio a otro?" texto="Antes de sacar conclusiones, esto es lo que dicen y lo que no dicen estos datos.">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="border-t-2 border-tinta pt-3">
            <p className="fuente-titulo text-xl font-bold">Sobre todo, por el tamaño</p>
            <p className="mt-2 text-tinta-suave">
              La cifra de cada barrio sale de contar cuántas viviendas y locales atiende el servicio de aseo y multiplicar por lo que pesa en promedio cada uno en su ruta.
              Por eso los barrios con más gente (como {mayor.nombre}) salen con más toneladas.
              Por persona la diferencia se achica: va de {num(Math.round(minKg))} a {num(Math.round(maxKgNum))} kg al mes, una brecha pequeña que puede venir del método y no de que un barrio genere más de verdad.
            </p>
          </div>
          <div className="border-t-2 border-tinta pt-3">
            <p className="fuente-titulo text-xl font-bold">No sabemos de qué es la basura</p>
            <p className="mt-2 text-tinta-suave">
              Los pesajes solo registran el peso total. No dicen si es orgánico, reciclable, escombros o residuo de comercio, ni separan lo que sale de viviendas de lo que sale de locales.
            </p>
          </div>
          <div className="border-t-2 border-tinta pt-3">
            <p className="fuente-titulo text-xl font-bold">No podemos señalar zonas de sobreproducción</p>
            <p className="mt-2 text-tinta-suave">
              Para decir dónde hay que intervenir faltan tres datos: el peso medido por barrio (hoy es una estimación), la categoría del residuo y si es residencial o comercial.
              Lo que sí se ve en otra página es dónde la gente reporta basuras o escombros en las quebradas, ver <a href="#/riesgo" className="font-semibold text-marca underline">Riesgo</a>.
            </p>
          </div>
        </div>
      </Seccion>

      <Seccion id="r-pedimos" pregunta="¿Qué falta para decidir?" titulo="Lo que necesitamos de Emvarias" texto="Con estos datos dejaríamos de estimar y podríamos proponer mejoras reales en la recolección.">
        <div className="rounded-2xl bg-[rgb(var(--noche))] p-8 text-[#E9ECF4] lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="fuente-titulo text-3xl font-extrabold leading-tight tracking-tight lg:text-4xl">Menos tanteo, más datos reales.</p>
              <p className="mt-4 text-lg text-[#C2CBE0]">
                Hoy solo podemos mostrar toneladas estimadas por barrio. Para optimizar las rutas y decidir dónde intervenir primero, en vez de probar a ciegas, necesitamos que Emvarias comparta y autorice lo siguiente.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {[
                ["Autorización de uso", "Permiso por escrito para usar las rutas, recorridos, frecuencias y horarios, y qué se puede publicar."],
                ["Toneladas medidas por barrio", "El peso real, no una estimación a partir de promedios."],
                ["Tipo de residuo", "Orgánico, aprovechable, ordinario y escombros, por separado."],
                ["Vivienda o comercio", "Para saber quién genera cada tonelada."],
                ["Puntos de acumulación", "Sectores donde la basura se acumula de forma repetida y cada cuánto pasa el camión."],
                ["Kilómetros y tiempos por ruta", "Para encontrar recorridos en vacío y ajustar frecuencias."],
              ].map(([t, d], k) => (
                <li key={t} className="rounded-2xl bg-white/[0.06] p-5">
                  <p className="text-sm font-bold text-[#9FB0D8]">{String(k + 1).padStart(2, "0")}</p>
                  <p className="fuente-titulo mt-1 text-lg font-bold leading-snug">{t}</p>
                  <p className="mt-1 text-sm text-[#B4BFD8]">{d}</p>
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-8 border-t border-white/15 pt-5 text-[#B4BFD8]">
            Nos comprometemos a no publicar direcciones, placas ni datos personales, a citar a Emvarias como fuente y a mostrarles el análisis antes de publicarlo.
          </p>
        </div>
      </Seccion>

      <Seccion id="r-metodo" pregunta="¿Cómo se calculó?" titulo="Nota de método">
        <div className="max-w-3xl space-y-3 text-tinta-suave">
          <p>
            Las toneladas son una <strong className="text-tinta">estimación mensual por barrio</strong> a partir de datos de Emvarias y EPM entre {r.periodo.desde} y {r.periodo.hasta} (unos {num(Math.round(r.periodo.meses))} meses).
            Por la forma de calcularlo, la suma de barrios ({num(Math.round(r.t_mes_comuna))} t) puede diferir un poco de otros totales.
          </p>
          <p>
            Los datos fueron entregados al proyecto y no son datos abiertos, por eso aquí <strong className="text-tinta">solo se muestran toneladas agregadas por barrio</strong>: no se publican rutas, calles, horarios ni direcciones.
            Los kilos por persona usan la población del Censo 2018 y son una referencia, no una medición.
          </p>
        </div>
      </Seccion>
    </>
  );
}

export default function Residuos() {
  const res = useDatos<Residuos>("residuos/residuos.json");
  const ind = useDatos<Indicadores>("indicadores.json");
  const pob = useMemo(() => {
    const m: Record<string, number> = {};
    if (ind.estado === "listo") for (const b of ind.datos.barrios) if (b.poblacion_2018) m[norm(b.nombre)] = b.poblacion_2018;
    return m;
  }, [ind]);
  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera
        etiqueta="Servicios públicos · Aseo y residuos"
        titulo="Residuos por barrio"
        icono="residuos"
        texto="Cuántas toneladas de residuos se estima que genera cada barrio de la Comuna 2 al mes, y cuánto pesa eso por persona. Con los datos disponibles solo se publican toneladas agregadas por barrio."
        pregunta="¿Cuánto residuo genera cada barrio, qué explica la diferencia y qué falta saber?"
      />
      <ConDatos estado={res}>{(r) => <Contenido r={r} pob={pob} />}</ConDatos>
      <Relacionados ids={["hist-basuras", "indicadores", "fuentes"]} />
    </div>
  );
}
