import { useCallback, useEffect, useState } from "react";
import { useDatos } from "../lib/datos";
import { API } from "../lib/resumen";
import type { Indicadores } from "../lib/tipos";

const TEMAS: Record<string, string> = {
  andenes: "Andenes y caminos",
  espacio_publico: "Parques y espacio público",
  movilidad: "Acceso al Metro y buses",
  seguridad_vial: "Seguridad vial",
  riesgo: "Riesgo de ladera",
};
const CLAVE_CODIGO = "observatorio-santa-cruz:codigo-voto";
const CLAVE_MIS = "observatorio-santa-cruz:mis-votos";

type Totales = Record<string, Record<string, number>>;

/** Código al azar de este navegador: es lo único que identifica un voto (sin nombre, correo ni IP). */
function codigo(): string {
  try {
    let c = localStorage.getItem(CLAVE_CODIGO);
    if (!c) {
      c = crypto.randomUUID();
      localStorage.setItem(CLAVE_CODIGO, c);
    }
    return c;
  } catch {
    return crypto.randomUUID();
  }
}

const leerMis = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_MIS) ?? "{}") ?? {};
  } catch {
    return {};
  }
};

export default function Votacion() {
  const ind = useDatos<Indicadores>("indicadores.json");
  const [totales, setTotales] = useState<Totales | null>(null);
  const [estado, setEstado] = useState<"cargando" | "sin_servidor" | "listo">("cargando");
  const [barrio, setBarrio] = useState("0201");
  const [mis, setMis] = useState(leerMis);
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(() => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    fetch(`${API}/api/votos`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("API"))))
      .then((d: { votos: Totales }) => { setTotales(d.votos); setEstado("listo"); })
      .catch(() => setEstado("sin_servidor"))
      .finally(() => clearTimeout(t));
  }, []);
  useEffect(cargar, [cargar]);

  const votar = async (tema: string) => {
    setMensaje("");
    try {
      const r = await fetch(`${API}/api/votos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barrio, tema, codigo: codigo() }) });
      if (r.status === 429) return setMensaje("Demasiados votos desde esta conexión. Intente más tarde.");
      if (!r.ok) return setMensaje("No se pudo registrar el voto.");
      const nuevos = { ...mis, [barrio]: tema };
      setMis(nuevos);
      try { localStorage.setItem(CLAVE_MIS, JSON.stringify(nuevos)); } catch { /* sin almacenamiento */ }
      cargar();
      setMensaje("Voto registrado. Puede cambiarlo cuando quiera.");
    } catch {
      setEstado("sin_servidor");
    }
  };

  const barrios = ind.estado === "listo" ? ind.datos.barrios : [];
  const t = totales?.[barrio];
  const total = t ? Object.values(t).reduce((a, b) => a + b, 0) : 0;

  return (
    <section aria-labelledby="t-votacion" className="space-y-3">
      <h2 id="t-votacion" className="text-lg font-semibold">¿Qué debería arreglarse primero en su barrio?</h2>
      <p className="text-sm text-tinta-suave">Un voto por barrio, que se puede cambiar. Es una consulta de prueba y no reemplaza el Presupuesto Participativo.</p>
      {estado === "sin_servidor" && (
        <p role="status" className="rounded-lg bg-ambar-claro px-3 py-2 text-sm text-tinta">La votación no está disponible por ahora.</p>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Barrio de la votación">
        {barrios.map((b) => (
          <button key={b.codigo} type="button" aria-pressed={b.codigo === barrio} onClick={() => setBarrio(b.codigo)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${b.codigo === barrio ? "bg-[#1e40af] text-white" : "bg-superficie ring-1 ring-nivel hover:bg-menta"}`}>{b.nombre}</button>
        ))}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {Object.entries(TEMAS).map(([id, nombre]) => {
          const n = t?.[id] ?? 0;
          const mio = mis[barrio] === id;
          return (
            <li key={id}>
              <button type="button" disabled={estado !== "listo"} onClick={() => votar(id)} aria-pressed={mio}
                className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition disabled:opacity-50 ${mio ? "border-marca font-semibold" : "border-nivel hover:bg-menta"}`}>
                <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-marca/15" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
                <span className="relative flex justify-between gap-2"><span>{nombre}{mio ? " (su voto)" : ""}</span><span className="tabular-nums">{estado === "listo" ? n : "–"}</span></span>
              </button>
            </li>
          );
        })}
      </ul>
      {mensaje && <p role="status" className="text-sm text-marca">{mensaje}</p>}
    </section>
  );
}
