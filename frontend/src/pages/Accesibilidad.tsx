import { useState } from "react";
import { useDatos } from "../lib/datos";
import { dec, dec2, num, pct } from "../lib/formato";
import type { Indicadores } from "../lib/tipos";
import { ConDatos } from "../components/Estado";
import { BotonCabecera, Cabecera, Kpi, Relacionados, Seccion } from "../components/Pagina";
import { Revelar } from "../components/Animacion";

/** Función de Tobler: velocidad de caminata (km/h) según la pendiente (en fracción, positiva = subida). */
function velocidadTobler(pendiente: number) {
  return 6 * Math.exp(-3.5 * Math.abs(pendiente + 0.05));
}

function Calculadora() {
  const [distancia, setDistancia] = useState(400);
  const [pendiente, setPendiente] = useState(12);
  const v = velocidadTobler(pendiente / 100);
  const vPlano = velocidadTobler(0);
  const minutos = distancia / ((v * 1000) / 60);
  const minutosPlano = distancia / ((vPlano * 1000) / 60);

  return (
    <div className="rounded-2xl border border-nivel bg-superficie p-4 shadow-sm">
      <h3 className="font-semibold text-marca">Prueba la fórmula</h3>
      <p className="mt-0.5 text-sm text-tinta-suave">
        Mueve los controles para ver cómo cambia el tiempo de caminata con la pendiente. Es la misma fórmula del cálculo por
        la red de calles.
      </p>
      <div className="mt-4 grid gap-4">
        <label className="text-sm">
          <span className="flex justify-between font-medium">
            Distancia del recorrido <span className="tabular-nums">{num(distancia)} m</span>
          </span>
          <input type="range" min={50} max={2000} step={50} value={distancia} onChange={(e) => setDistancia(+e.target.value)} className="mt-2 w-full accent-[#3b82f6]" />
        </label>
        <label className="text-sm">
          <span className="flex justify-between font-medium">
            Pendiente <span className="tabular-nums">{pendiente > 0 ? "subiendo" : pendiente < 0 ? "bajando" : "plano"} {Math.abs(pendiente)} %</span>
          </span>
          <input type="range" min={-30} max={30} step={1} value={pendiente} onChange={(e) => setPendiente(+e.target.value)} className="mt-2 w-full accent-[#3b82f6]" />
        </label>
      </div>
      <p className="mt-4 rounded-xl bg-menta px-3 py-2 text-base" aria-live="polite">
        <strong className="tabular-nums">{dec(minutos)} minutos</strong> a {dec(v)} km/h.{" "}
        <span className="text-tinta-suave">En plano serían {dec(minutosPlano)} minutos.</span>
      </p>
      <p className="mt-2 text-xs text-tinta-tenue">velocidad = 6 × e^(−3,5 × |pendiente + 0,05|) km/h (Tobler, 1993).</p>
    </div>
  );
}

type Fila = Record<string, number | string | null>;

const DESTINOS: { id: string; nombre: string; umbral: number }[] = [
  { id: "transporte_masivo", nombre: "Metro, Metrocable o Metroplús", umbral: 10 },
  { id: "parada_bus", nombre: "Parada de bus", umbral: 5 },
  { id: "colegio", nombre: "Colegio", umbral: 10 },
  { id: "salud", nombre: "Centro de salud", umbral: 15 },
  { id: "parque", nombre: "Parque o espacio público", umbral: 5 },
  { id: "deporte", nombre: "Cancha o escenario deportivo", umbral: 10 },
  { id: "biblioteca", nombre: "Biblioteca", umbral: 15 },
];

const NOMBRE_TIPO: Record<string, string> = {
  calle: "Calles (malla vial oficial)", sendero: "Senderos y andenes (OSM)", escalera: "Escaleras (OSM)", peatonal: "Vías peatonales (OSM)",
  puente: "Puentes peatonales", ciclovia: "Ciclorrutas (OSM)", conector: "Conexiones cortas agregadas",
};

/** Color según qué tanta gente queda dentro del umbral: más rojo = peor. */
const tono = (v: number | null) =>
  v == null ? "#e8f0fc" : v >= 80 ? "#e2edfd" : v >= 60 ? "#eef0d9" : v >= 40 ? "#f6e7c8" : v >= 20 ? "#f0cdb8" : "#e3a08d";

const COLOR_BARRA = (v: number | null) => (v == null ? "#cfd0e6" : v >= 60 ? "#3b82f6" : v >= 40 ? "#4a7be0" : v >= 20 ? "#e0a526" : "#c0583a");

function Contenido({ d }: { d: Indicadores }) {
  const a = d.accesibilidad;
  const infra = d.infraestructura;
  const [destino, setDestino] = useState("transporte_masivo");
  const [umbral, setUmbral] = useState(10);
  if (!a) return <p className="p-6">Falta correr data-pipeline/red.py para calcular la accesibilidad.</p>;
  const c = a.comuna as Fila;
  const filas = a.barrios as Fila[];
  const dsel = DESTINOS.find((x) => x.id === destino)!;
  const clave = `${destino}_${umbral}min_pct`;
  const orden = [...filas].sort((x, y) => ((y[clave] as number) ?? -1) - ((x[clave] as number) ?? -1));
  const cv = c[clave] as number | null;

  return (
    <div className="mx-auto max-w-[112rem] space-y-10 px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera
        etiqueta="Accesibilidad caminando"
        icono="accesibilidad"
        titulo="¿Cuánto se camina hasta lo básico?"
        texto={<>Minutos estimados desde cada manzana hasta el lugar más cercano de cada tipo, siguiendo calles, andenes, escaleras y puentes (no la línea recta) y con la pendiente de la ladera. Son estimaciones con velocidades teóricas, no mediciones.</>}
      >
        <BotonCabecera to="/mapa?ruta=1">Probar una ruta en el mapa</BotonCabecera>
        <BotonCabecera to="/corredor-49" claro>Ver la Carrera 49</BotonCabecera>
      </Cabecera>

      <Seccion id="t-res" titulo="Población dentro de cada umbral" texto="Porcentaje de las personas de la comuna (Censo 2018) que llegan en ese tiempo o menos.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {DESTINOS.map((x, i) => {
            const v = c[`${x.id}_${x.umbral}min_pct`] as number;
            return (
              <Revelar key={x.id} retraso={i * 40} className="h-full">
                <Kpi valor={pct(v)} texto={<>a {x.umbral} min de <strong>{x.nombre.toLowerCase()}</strong></>} nota={`Promedio: ${dec(c[`${x.id}_promedio_min`] as number)} min`} tono={v >= 60 ? "verde" : v >= 35 ? "ambar" : "rojo"} />
              </Revelar>
            );
          })}
          <Revelar retraso={280} className="h-full">
            <Kpi valor={`${dec2(c.rodeo_mediano_transporte as number)}×`} texto="más larga es la ruta real a la estación que la línea recta" nota="La ladera alarga el camino (mediana)" tono="ambar" />
          </Revelar>
        </div>
      </Seccion>

      <Seccion
        id="t-barrios"
        titulo="Diferencias entre barrios"
        texto={<>Personas del barrio a {umbral} min o menos de {dsel.nombre.toLowerCase()}. Más oscuro = más gente con acceso.</>}
      >
        <div className="rounded-2xl border border-nivel bg-superficie p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Destino">
            {DESTINOS.map((x) => (
              <button key={x.id} type="button" onClick={() => setDestino(x.id)} aria-pressed={destino === x.id}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${destino === x.id ? "bg-[#1e40af] text-white shadow" : "bg-menta-2 text-tinta hover:bg-menta"}`}>
                {x.nombre.split(",")[0].replace("Metro", "Metro / Metrocable")}
              </button>
            ))}
          </div>
          <div className="mt-3 inline-flex rounded-full bg-menta-2 p-1" role="group" aria-label="Tiempo">
            {a.umbrales_min.map((u: number) => (
              <button key={u} type="button" onClick={() => setUmbral(u)} aria-pressed={umbral === u}
                className={`rounded-full px-3.5 py-1 text-sm font-semibold transition ${umbral === u ? "bg-superficie text-marca shadow" : "text-tinta-suave"}`}>
                {u} min
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-2">
            <li className="grid grid-cols-[7.5rem_1fr_3.2rem] items-center gap-3 text-sm font-semibold sm:grid-cols-[10rem_1fr_3.6rem]">
              <span>Comuna 2</span>
              <span className="relative h-3 rounded-full bg-papel-hondo"><span className="absolute inset-y-0 left-0 rounded-full bg-[#0c1d3a]" style={{ width: `${cv ?? 0}%`, transition: "width 600ms ease" }} /></span>
              <span className="text-right tabular-nums">{pct(cv)}</span>
            </li>
            {orden.map((f) => {
              const v = f[clave] as number | null;
              return (
                <li key={String(f.barrio)} className="grid grid-cols-[7.5rem_1fr_3.2rem] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_3.6rem]">
                  <span className="truncate" title={String(f.barrio)}>{String(f.barrio)}</span>
                  <span className="relative h-3 rounded-full bg-papel-hondo">
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${v ?? 0}%`, background: COLOR_BARRA(v), transition: "width 600ms ease" }} />
                  </span>
                  <span className="text-right tabular-nums">{pct(v)}</span>
                </li>
              );
            })}
          </ul>

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-marca">Ver la tabla completa (todos los umbrales)</summary>
            <div className="mt-2 overflow-x-auto rounded-xl border border-nivel">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-nivel bg-papel text-left text-tinta-suave">
                    <th className="px-3 py-1.5 font-semibold">Barrio</th>
                    {a.umbrales_min.map((u: number) => <th key={u} className="px-3 py-1.5 text-right font-semibold">{u} min</th>)}
                    <th className="px-3 py-1.5 text-right font-semibold">Promedio</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Mal conectadas</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filas, c].map((f) => (
                    <tr key={String(f.barrio)} className={`border-b border-nivel/70 ${f.barrio === "Comuna 2" ? "font-semibold" : ""}`}>
                      <td className="px-3 py-1.5">{String(f.barrio)}</td>
                      {a.umbrales_min.map((u: number) => {
                        const v = f[`${destino}_${u}min_pct`] as number | null;
                        return <td key={u} className="px-3 py-1.5 text-right tabular-nums" style={{ background: tono(v) }}>{pct(v)}</td>;
                      })}
                      <td className="px-3 py-1.5 text-right tabular-nums">{dec(f[`${destino}_promedio_min`] as number)} min</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{num(f.manzanas_mal_conectadas as number)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-tinta-suave">"Mal conectada" = el centro de la manzana queda a más de 60 m del camino registrado más cercano.</p>
          </details>
        </div>
      </Seccion>

      {infra && (
        <Seccion id="t-andenes" titulo="Andenes, paradas y ciclorrutas" texto="Inventario oficial dentro de la comuna.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi valor={`${dec(infra.andenes.km)} km`} texto="de andén inventariado" />
            <Kpi valor={`${dec2(infra.andenes.ancho_mediano_m)} m`} texto="de ancho mediano" />
            <Kpi valor={pct(infra.andenes.angostos_pct)} texto={<>del largo es más angosto que {dec(infra.andenes.umbral_angosto_m)} m</>} tono="rojo" />
            <Kpi valor={num(infra.paradas_en_comuna)} texto="paradas de bus" nota={`${dec2(infra.ciclorrutas_km_en_comuna)} km de ciclorruta`} />
          </div>
          <details className="mt-3 rounded-2xl border border-nivel bg-superficie p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-marca">Andenes por barrio</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-nivel text-left text-tinta-suave">
                  <th className="py-1.5 pr-3 font-semibold">Barrio</th><th className="px-3 py-1.5 text-right font-semibold">Andén</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Ancho mediano</th><th className="px-3 py-1.5 text-right font-semibold">&lt; 1,2 m</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Con obstáculo</th></tr></thead>
                <tbody>
                  {infra.andenes.barrios.map((f: Fila) => (
                    <tr key={String(f.barrio)} className="border-b border-nivel/70">
                      <td className="py-1.5 pr-3">{String(f.barrio)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{dec2(f.andenes_km as number)} km</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{dec2(f.ancho_mediano_m as number)} m</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{pct(f.andenes_angostos_pct as number)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{num(f.tramos_con_obstaculo as number)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-tinta-suave">1,2 m es un umbral de referencia para circulación cómoda; hay que confirmarlo con la norma técnica. El inventario trae códigos de estado y material sin su significado publicado, por eso no se usan.</p>
          </details>
        </Seccion>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Calculadora />
        <div className="rounded-2xl border border-nivel bg-superficie p-4 shadow-sm">
          <h3 className="font-semibold text-marca">La red usada</h3>
          <ul className="mt-2 divide-y divide-nivel/70 text-sm">
            {Object.entries(a.red.km_por_tipo as Record<string, number>).sort((x, y) => y[1] - x[1]).map(([t, km]) => (
              <li key={t} className="flex justify-between py-1.5"><span>{NOMBRE_TIPO[t] ?? t}</span><span className="tabular-nums">{dec(km)} km</span></li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-tinta-suave">
            {num(a.red.nodos)} cruces y {num(a.red.tramos)} tramos en la comuna y 1,3 km alrededor. {num(a.red.nodos_fuera_componente_principal)} puntos quedaron sueltos y no se usan para rutas.
          </p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-marca">Supuestos del cálculo</summary>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-tinta-suave">
              {Object.values(a.supuestos as Record<string, string>).map((t) => <li key={t}>{t}</li>)}
              {infra?.validacion_pendiente && (
                <li>
                  Validación: la pendiente del modelo de elevación difiere en promedio (mediana) {dec(infra.validacion_pendiente.diferencia_mediana_puntos_pct)} puntos
                  de la oficial en {num(infra.validacion_pendiente.tramos_comparados)} calzadas; donde hay dato oficial se usa el oficial.
                </li>
              )}
            </ul>
          </details>
        </div>
      </div>

      <Relacionados ids={["corredor", "prioridades", "problematicas"]} />
    </div>
  );
}

export default function Accesibilidad() {
  const estado = useDatos<Indicadores>("indicadores.json");
  return <ConDatos estado={estado}>{(d) => <Contenido d={d} />}</ConDatos>;
}
