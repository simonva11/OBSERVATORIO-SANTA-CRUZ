import { type Ciudadano, type IdHistoria } from "../../lib/ciudadano";
import { dec, dec2, num } from "../../lib/formato";

/**
 * Una visualización distinta por historia, cada una pensada para que la cifra se entienda de un vistazo.
 * Todas dibujan los mismos números de ciudadano.json; ninguna agrega datos.
 */
export default function Viz({ id, c, color, barrio }: { id: IdHistoria; c: Ciudadano; color: string; barrio?: string }) {
  if (id === "movilidad-mayores") return <VizPersonas c={c} color={color} />;
  if (id === "basuras") return <VizToneladas c={c} color={color} barrio={barrio} />;
  if (id === "huecos") return <VizEstados c={c} color={color} />;
  return <VizCuadrados c={c} color={color} />;
}

function Persona({ lleno, color }: { lleno: boolean; color: string }) {
  return (
    <svg viewBox="0 0 24 40" className="h-10 w-auto sm:h-14" aria-hidden="true">
      <circle cx="12" cy="7" r="5.5" fill={lleno ? color : "none"} stroke={lleno ? color : "rgb(var(--tinta-tenue))"} strokeWidth="1.6" />
      <path d="M3 38V22a9 9 0 0 1 18 0v16" fill={lleno ? color : "none"} stroke={lleno ? color : "rgb(var(--tinta-tenue))"} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** De cada 10 personas mayores, cuántas viven lejos. Redondeado a la persona más cercana y dicho así. */
function VizPersonas({ c, color }: { c: Ciudadano; color: string }) {
  const k = c.comuna;
  const filas = [
    { umbral: 10, n: Math.round((k.mayores_lejos_10 / k.mayores_60) * 10), exacto: (k.mayores_lejos_10 / k.mayores_60) * 100 },
    { umbral: 15, n: Math.round((k.mayores_lejos_15 / k.mayores_60) * 10), exacto: (k.mayores_lejos_15 / k.mayores_60) * 100 },
  ];
  return (
    <figure className="viz">
      <figcaption className="viz-titulo">De cada 10 personas de 60 años o más de la comuna…</figcaption>
      <div className="mt-4 grid gap-5">
        {filas.map((f) => (
          <div key={f.umbral}>
            <div className="flex flex-wrap gap-1" role="img" aria-label={`${f.n} de cada 10 viven a más de ${f.umbral} minutos caminando de una estación`}>
              {Array.from({ length: 10 }, (_, i) => <Persona key={i} lleno={i < f.n} color={color} />)}
            </div>
            <p className="mt-1.5"><strong>unas {f.n}</strong> viven a más de {f.umbral} minutos caminando de una estación <span className="text-tinta-tenue">({dec(f.exacto)} %)</span>.</p>
          </div>
        ))}
      </div>
      <p className="viz-nota">Cada figura es una décima parte de las {num(k.mayores_60)} personas mayores (Censo 2018). Los minutos son un cálculo de OTEA sobre la red de calles, andenes y escaleras.</p>
    </figure>
  );
}

/** Toneladas al mes por barrio, de mayor a menor. Un barrio con más gente genera más: se muestra también por persona. */
function VizToneladas({ c, color, barrio }: { c: Ciudadano; color: string; barrio?: string }) {
  const filas = c.barrios.filter((b) => b.residuos_t_mes != null).sort((a, b) => (b.residuos_t_mes ?? 0) - (a.residuos_t_mes ?? 0));
  const max = Math.max(...filas.map((b) => b.residuos_t_mes ?? 0));
  return (
    <figure className="viz">
      <figcaption className="viz-titulo">Toneladas de residuos al mes, por barrio</figcaption>
      <ol className="mt-4 grid gap-1.5">
        {filas.map((b) => {
          const yo = b.codigo === barrio;
          return (
            <li key={b.codigo} className={`grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto] items-center gap-2 text-[0.92rem] sm:grid-cols-[11rem_minmax(0,1fr)_7.5rem] ${yo ? "font-bold" : ""}`}>
              <span className="truncate">{b.nombre}{yo && " (tu barrio)"}</span>
              <span className="h-3.5 rounded-sm" style={{ width: `${((b.residuos_t_mes ?? 0) / max) * 100}%`, background: color, opacity: yo ? 1 : 0.7 }} aria-hidden="true" />
              <span className="text-right tabular-nums">{num(Math.round(b.residuos_t_mes ?? 0))} t <span className="hidden text-tinta-tenue sm:inline">· {b.residuos_kg_persona_dia != null ? dec2(b.residuos_kg_persona_dia) : "—"} kg/p</span></span>
            </li>
          );
        })}
      </ol>
      <p className="viz-nota">Estimación mensual a partir de los datos que entregaron Emvarias y EPM. «kg/p»: kilos por persona al día. Solo toneladas por barrio: OTEA no publica rutas, horarios ni puntos de recolección.</p>
    </figure>
  );
}

/** Qué pasó con los reportes de huecos: una barra partida por estado. */
function VizEstados({ c, color }: { c: Ciudadano; color: string }) {
  const h = c.comuna.huecos;
  const partes = [
    { t: "Arreglados", n: h.arreglados, fondo: color, op: 1 },
    { t: "Pendientes", n: h.pendientes, fondo: "rgb(var(--peligro))", op: 1 },
    { t: "Descartados", n: h.descartados, fondo: "rgb(var(--tinta-tenue))", op: 0.55 },
    { t: "Repetidos", n: h.duplicados, fondo: "rgb(var(--tinta-tenue))", op: 0.3 },
  ];
  return (
    <figure className="viz">
      <figcaption className="viz-titulo">Qué pasó con los {num(h.total)} reportes</figcaption>
      <div className="mt-4 flex h-9 w-full overflow-hidden rounded-lg" role="img" aria-label={partes.map((p) => `${p.t}: ${num(p.n)}`).join(", ")}>
        {partes.map((p) => <span key={p.t} style={{ width: `${(p.n / h.total) * 100}%`, background: p.fondo, opacity: p.op }} />)}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
        {partes.map((p) => (
          <li key={p.t} className="flex items-center gap-2 text-[0.92rem]">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ background: p.fondo, opacity: p.op }} />
            <span>{p.t}: <strong className="tabular-nums">{num(p.n)}</strong></span>
          </li>
        ))}
      </ul>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <p className="rounded-xl bg-papel-hondo p-3"><strong className="block text-2xl">{num(h.dias_mediana)} días</strong>tardó la mitad de los arreglos, o menos.</p>
        <p className="rounded-xl bg-papel-hondo p-3"><strong className="block text-2xl">{num(h.dias_p90)} días o más</strong>tardó 1 de cada 10 arreglos.</p>
      </div>
      <p className="viz-nota">Estados tal como figuran en la base de la Alcaldía. «Pendiente» no confirma que el hueco siga ahí.</p>
    </figure>
  );
}

/** El espacio público por persona dibujado a escala contra la referencia de 15 m². */
function VizCuadrados({ c, color }: { c: Ciudadano; color: string }) {
  const e = c.comuna.espacio_m2_hab;
  const lado = 260;
  const chico = lado * Math.sqrt(e / 15);
  const vals = c.barrios.map((b) => b.espacio_m2_hab).filter((v): v is number => v != null);
  return (
    <figure className="viz">
      <figcaption className="viz-titulo">Dibujado a escala: lo que le toca a cada persona</figcaption>
      <div className="mt-4 grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <svg viewBox={`0 0 ${lado + 4} ${lado + 4}`} className="h-auto w-full max-w-[16rem]" role="img" aria-label={`Un cuadrado de ${dec2(e)} metros cuadrados dentro de uno de 15 metros cuadrados`}>
          <rect x="2" y="2" width={lado} height={lado} fill="none" stroke="rgb(var(--tinta))" strokeWidth="2" strokeDasharray="6 5" />
          <rect x="2" y={2 + lado - chico} width={chico} height={chico} fill={color} />
          <text x={lado / 2 + 2} y={lado / 2} textAnchor="middle" fontSize="15" className="fill-tinta-suave">15 m²</text>
          <text x={lado / 2 + 2} y={lado / 2 + 18} textAnchor="middle" fontSize="11" className="fill-tinta-tenue">referencia nacional</text>
        </svg>
        <div className="space-y-2">
          <p><span className="inline-block h-3 w-3 rounded-sm align-middle" style={{ background: color }} /> <strong>{dec2(e)} m²</strong> por persona en la comuna: un cuadrado de unos {Math.round(Math.sqrt(e) * 100)} cm de lado.</p>
          <p><span className="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-tinta align-middle" /> <strong>15 m²</strong>: un cuadrado de {dec(Math.sqrt(15))} m de lado.</p>
          {vals.length > 0 && <p className="text-tinta-suave">Entre barrios va de {dec2(Math.min(...vals))} a {dec2(Math.max(...vals))} m² por persona.</p>}
        </div>
      </div>
      <p className="viz-nota">Espacio público existente (Alcaldía, datos de 2014) dividido entre la población del Censo 2018. No es el indicador oficial de espacio público efectivo.</p>
    </figure>
  );
}
