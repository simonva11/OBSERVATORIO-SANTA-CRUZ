import { useEffect, useState } from "react";
import { celda, descargar } from "../lib/csv";
import { useDatos } from "../lib/datos";
import { fecha } from "../lib/formato";
import { puntoEn } from "../lib/geo";
import { fotoValida, limpiarTexto, procesarFoto } from "../lib/reporte";
import type { Coleccion } from "../lib/tipos";
import { Cabecera } from "../components/Pagina";

const CLAVE = "observatorio-santa-cruz:recorrido:v1";
const MAX = 25; // con fotos pequeñas (800 px) caben holgadas en el almacenamiento del navegador
const TIPOS: Record<string, string> = {
  anden: "Andén dañado o angosto",
  cruce: "Cruce peligroso",
  barrera: "Barrera para sillas de ruedas o coches",
  parque: "Parque o cancha deteriorada",
  alumbrado: "Falta de alumbrado",
  basuras: "Basuras o escombros",
  otro: "Otro",
};

interface Obs {
  id: string;
  fecha: string;
  tipo: string;
  nota: string;
  lat?: number;
  lon?: number;
  barrio?: string;
  foto?: string;
}

function leer(): Obs[] {
  try {
    const l = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(l) ? l.filter((o) => o && typeof o.id === "string" && typeof o.nota === "string" && o.tipo in TIPOS).map((o) => ({ ...o, foto: fotoValida(o.foto) ? o.foto : undefined })) : [];
  } catch {
    return [];
  }
}

export default function Visita() {
  const barrios = useDatos<Coleccion>("barrios.geojson");
  const [obs, setObs] = useState<Obs[]>(leer);
  const [tipo, setTipo] = useState("anden");
  const [nota, setNota] = useState("");
  const [punto, setPunto] = useState<{ lat: number; lon: number; barrio?: string } | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [guardadoOk, setGuardadoOk] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(obs));
      setGuardadoOk(true);
    } catch {
      setGuardadoOk(false);
    }
  }, [obs]);

  const ubicar = () => {
    if (!navigator.geolocation) return setError("Este navegador no puede dar la ubicación.");
    navigator.geolocation.getCurrentPosition(
      (g) => {
        const { latitude: lat, longitude: lon } = g.coords;
        const f = barrios.estado === "listo" ? barrios.datos.features.find((b) => puntoEn(lon, lat, b.geometry)) : undefined;
        setPunto({ lat: +lat.toFixed(6), lon: +lon.toFixed(6), barrio: f ? String(f.properties?.nombre) : undefined });
        setError("");
      },
      () => setError("No se pudo obtener la ubicación. Puede guardar la observación sin ella."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const ponerFoto = async (f?: File) => {
    if (!f) return;
    try {
      setFoto(await procesarFoto(f, 800, 0.6));
      setError("");
    } catch (x) {
      setFoto(null);
      setError((x as Error).message);
    }
  };

  const agregar = () => {
    const n = limpiarTexto(nota).slice(0, 300);
    if (n.length < 5) return setError("Escriba al menos 5 caracteres sobre lo que vio.");
    if (obs.length >= MAX) return setError(`Ya hay ${MAX} observaciones. Descargue o imprima el acta y quite algunas.`);
    setError("");
    setObs((o) => [...o, { id: crypto.randomUUID?.() ?? String(Date.now()), fecha: new Date().toISOString(), tipo, nota: n, ...(punto ?? {}), foto: foto ?? undefined }]);
    setNota("");
    setPunto(null);
    setFoto(null);
  };

  const csv = () => {
    const cols = ["fecha", "tipo", "nota", "barrio", "lat", "lon"];
    const filas = obs.map((o) => [o.fecha, TIPOS[o.tipo], o.nota, o.barrio ?? "", o.lat ?? "", o.lon ?? ""]);
    descargar("recorrido-otea.csv", [cols, ...filas].map((f) => f.map(celda).join(",")).join("\r\n"));
  };

  const campo = "mt-1 w-full rounded-md border border-nivel bg-superficie px-2 py-2 text-sm";
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-5 lg:px-8">
      <Cabecera etiqueta="Comunidad" icono="prioridades" titulo="Acta de recorrido"
        texto="Camine el barrio con el celular y anote lo que ve: tipo de problema, una nota, la ubicación y una foto. Al final descargue la lista en CSV o imprima el acta para la reunión. Todo queda en este navegador; no se envía a nadie." />

      <section aria-labelledby="t-v-nueva" className="no-imprimir space-y-3 rounded-2xl border border-nivel bg-superficie p-4 shadow-sm">
        <h2 id="t-v-nueva" className="font-semibold">Nueva observación</h2>
        <label className="block text-sm font-semibold">Qué vio
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>{Object.entries(TIPOS).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
        </label>
        <label className="block text-sm font-semibold">Nota
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} rows={2} className={campo} placeholder="Ejemplo: andén roto frente a la cancha, la gente baja a la calle." />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={ubicar} className="rounded-full bg-superficie px-3 py-1.5 text-sm font-medium ring-1 ring-nivel transition hover:bg-menta">Tomar mi ubicación</button>
          <span className="text-xs text-tinta-suave">{punto ? `Ubicación tomada${punto.barrio ? ` en ${punto.barrio}` : ""}.` : "Sin ubicación todavía (opcional)."}</span>
        </div>
        <div>
          <label htmlFor="foto-v" className="block text-sm font-semibold">Foto (opcional)</label>
          <input id="foto-v" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { ponerFoto(e.target.files?.[0]); e.target.value = ""; }}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-marca file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white" />
          {foto && <img src={foto} alt="Vista previa" className="mt-2 h-20 w-28 rounded-lg object-cover ring-1 ring-nivel" />}
        </div>
        {error && <p role="alert" className="text-sm text-ladrillo">{error}</p>}
        <button type="button" onClick={agregar} className="rounded-full bg-marca px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">Guardar observación</button>
        {!guardadoOk && <p role="alert" className="text-sm text-ladrillo">El navegador no pudo guardar (almacenamiento lleno o bloqueado). Descargue el CSV ahora o quite fotos.</p>}
      </section>

      <section aria-labelledby="t-v-lista" className="space-y-3">
        <div className="no-imprimir flex flex-wrap items-center justify-between gap-2">
          <h2 id="t-v-lista" className="text-lg font-semibold">Observaciones ({obs.length} de {MAX})</h2>
          <div className="flex gap-2">
            <button type="button" disabled={!obs.length} onClick={csv} className="rounded-full bg-superficie px-3 py-1.5 text-sm font-medium ring-1 ring-nivel transition hover:bg-menta disabled:opacity-50">Descargar CSV</button>
            <button type="button" disabled={!obs.length} onClick={() => window.print()} className="rounded-full bg-superficie px-3 py-1.5 text-sm font-medium ring-1 ring-nivel transition hover:bg-menta disabled:opacity-50">Imprimir acta</button>
          </div>
        </div>
        <p className="hidden text-sm print:block">Acta de recorrido, Comuna 2 Santa Cruz. Impresa el {fecha(new Date().toISOString())}. Responsables: ______________________</p>
        {obs.length === 0 ? (
          <p className="text-sm text-tinta-suave">Todavía no hay observaciones.</p>
        ) : (
          <ul className="divide-y divide-nivel border-y border-nivel">
            {obs.map((o, i) => (
              <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i + 1}. {TIPOS[o.tipo]}</p>
                  <p>{o.nota}</p>
                  <p className="text-xs text-tinta-suave">{fecha(o.fecha)}{o.barrio ? ` · ${o.barrio}` : ""}{o.lat != null ? ` · ${o.lat}, ${o.lon}` : ""}</p>
                </div>
                {fotoValida(o.foto) && <img src={o.foto} alt={`Foto de la observación ${i + 1}`} className="h-16 w-24 rounded-md object-cover ring-1 ring-nivel" />}
                <button type="button" onClick={() => setObs((l) => l.filter((x) => x.id !== o.id))} className="no-imprimir text-xs text-ladrillo hover:underline">Quitar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
