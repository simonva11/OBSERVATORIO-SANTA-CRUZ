import { Cabecera } from "../components/Pagina";
import Votacion from "../components/Votacion";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { useDatos } from "../lib/datos";
import { distanciaM, puntoEn } from "../lib/geo";
import { fecha } from "../lib/formato";
import type { Coleccion } from "../lib/tipos";
import { fotoValida, limpiarTexto, procesarFoto, revisarDescripcion } from "../lib/reporte";

const CLAVE = "observatorio-santa-cruz:reportes:v1";

const CATEGORIAS: Record<string, string> = {
  anden_danado: "Andén dañado o inexistente",
  punto_peligroso: "Punto peligroso para cruzar o caminar",
  barrera_discapacidad: "Barrera para personas con discapacidad",
  movilidad: "Problema de movilidad o transporte",
  parque_deteriorado: "Parque o equipamiento deteriorado",
  nueva_conexion: "Propuesta de nueva conexión peatonal",
};

const URGENCIAS: Record<string, string> = {
  ahora: "Hay riesgo ahora (puede lastimar a alguien)",
  diario: "Molesta o afecta todos los días",
  mejora: "Es una mejora que haría falta",
};

const ESTADOS = ["Recibido", "En revisión", "Validado", "Atendido"] as const;

interface Reporte {
  id: string;
  categoria: string;
  descripcion: string;
  lat: number;
  lon: number;
  barrio: string | null;
  fecha: string;
  estado: (typeof ESTADOS)[number];
  urgencia?: string;
  foto?: string;
}

function leerReportes(): Reporte[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const lista = crudo ? (JSON.parse(crudo) as Reporte[]) : [];
    // Lo guardado es texto del propio navegador, pero igual solo se acepta lo que tiene la forma esperada.
    return lista.filter((r) => r && typeof r.id === "string" && typeof r.descripcion === "string").map((r) => ({ ...r, foto: fotoValida(r.foto) ? r.foto : undefined }));
  } catch {
    return [];
  }
}

function guardarReportes(r: Reporte[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(r));
    return true;
  } catch {
    return false;
  }
}

const nuevoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function Selector({ onPunto }: { onPunto: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPunto(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Centra el mapa en el punto que se marca, para que quien reporta vea dónde quedó. */
function Vuelo({ punto }: { punto: { lat: number; lon: number } | null }) {
  const mapa = useMap();
  useEffect(() => {
    if (punto) mapa.flyTo([punto.lat, punto.lon], Math.max(mapa.getZoom(), 17), { duration: 0.6 });
  }, [punto, mapa]);
  return null;
}

const CAJA: LatLngBoundsExpression = [
  [6.2889, -75.5633],
  [6.3102, -75.5442],
];

export default function Participacion() {
  const comuna = useDatos<Coleccion>("comuna.geojson");
  const barrios = useDatos<Coleccion>("barrios.geojson");
  const [reportes, setReportes] = useState<Reporte[]>(() => leerReportes());
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [punto, setPunto] = useState<{ lat: number; lon: number } | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [confirmarDuplicado, setConfirmarDuplicado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [almacenamiento, setAlmacenamiento] = useState(true);
  const [urgencia, setUrgencia] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [trampa, setTrampa] = useState(""); // campo oculto: una persona no lo llena, un robot sí
  const abierto = useRef(Date.now());
  const [ubicando, setUbicando] = useState(false);

  useEffect(() => {
    setAlmacenamiento(guardarReportes(reportes));
  }, [reportes]);

  const barrioDe = (lat: number, lon: number) => {
    if (barrios.estado !== "listo") return null;
    const f = barrios.datos.features.find((b) => puntoEn(lon, lat, b.geometry));
    return f ? String(f.properties?.nombre) : null;
  };

  const elegirPunto = (lat: number, lon: number) => {
    if (comuna.estado === "listo" && !comuna.datos.features.some((f) => puntoEn(lon, lat, f.geometry))) {
      setErrores((e) => ({ ...e, punto: "El punto queda fuera de la Comuna 2. Marque un lugar dentro del límite punteado." }));
      return;
    }
    setPunto({ lat, lon });
    setErrores((e) => {
      const n = { ...e };
      delete n.punto;
      return n;
    });
    setConfirmarDuplicado(false);
  };

  // Posible duplicado: misma categoría, a menos de 30 m, en las últimas 72 horas.
  const duplicado = useMemo(() => {
    if (!punto || !categoria) return null;
    const limite = Date.now() - 72 * 3600 * 1000;
    return (
      reportes.find(
        (r) =>
          r.categoria === categoria &&
          new Date(r.fecha).getTime() > limite &&
          distanciaM(r.lat, r.lon, punto.lat, punto.lon) < 30,
      ) ?? null
    );
  }, [punto, categoria, reportes]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!categoria) err.categoria = "Elija qué tipo de problema quiere reportar.";
    const rev = revisarDescripcion(descripcion);
    if (!rev.ok) err.descripcion = rev.motivo;
    if (!urgencia) err.urgencia = "Diga qué tan urgente es.";
    if (!punto) err.punto = "Marque en el mapa dónde está el problema.";
    if (duplicado && !confirmarDuplicado) err.duplicado = "Confirme que es un problema distinto al que ya está reportado.";
    // Filtros contra robots y abuso: campo trampa, tiempo mínimo en el formulario y tope por hora.
    const hace1h = Date.now() - 3600 * 1000;
    if (trampa) return;
    if (Date.now() - abierto.current < 8000) err.general = "Tómese un momento para revisar el reporte y vuelva a enviarlo.";
    else if (reportes.filter((x) => new Date(x.fecha).getTime() > hace1h).length >= 5) err.general = "Ya hizo 5 reportes en la última hora. Intente más tarde.";
    setErrores(err);
    if (Object.keys(err).length || !punto || !rev.ok) return;

    const r: Reporte = {
      id: nuevoId(),
      categoria,
      descripcion: rev.texto,
      urgencia,
      foto: foto ?? undefined,
      lat: +punto.lat.toFixed(6),
      lon: +punto.lon.toFixed(6),
      barrio: barrioDe(punto.lat, punto.lon),
      fecha: new Date().toISOString(),
      estado: "Recibido",
    };
    setReportes((rs) => [r, ...rs]);
    setCategoria("");
    setDescripcion("");
    setUrgencia("");
    setFoto(null);
    abierto.current = Date.now();
    setPunto(null);
    setConfirmarDuplicado(false);
    setMensaje(`Reporte guardado${r.barrio ? ` en ${r.barrio}` : ""}. Quedó en estado Recibido.`);
  };

  const ponerFoto = async (f?: File) => {
    if (!f) return;
    try {
      setFoto(await procesarFoto(f));
      setErrores((e) => ({ ...e, foto: "" }));
    } catch (x) {
      setFoto(null);
      setErrores((e) => ({ ...e, foto: (x as Error).message }));
    }
  };

  const miUbicacion = () => {
    if (!navigator.geolocation) return setErrores((e) => ({ ...e, punto: "Este navegador no puede dar su ubicación. Marque el punto en el mapa." }));
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (g) => { setUbicando(false); elegirPunto(g.coords.latitude, g.coords.longitude); },
      () => { setUbicando(false); setErrores((e) => ({ ...e, punto: "No se pudo obtener su ubicación. Marque el punto en el mapa." })); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const borrar = (id: string) => setReportes((rs) => rs.filter((r) => r.id !== id));

  return (
    <div className="mx-auto max-w-[112rem] space-y-10 px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Participación" icono="participacion" titulo="Reportar un problema"
        texto="Andenes dañados, puntos peligrosos, barreras de acceso, parques deteriorados o conexiones que hacen falta. Los reportes servirán como insumo para el Presupuesto Participativo y las entidades, no como decisiones automáticas.">
        <p className="w-full rounded-lg bg-ambar-claro px-3 py-2 text-sm text-tinta">
          Por ahora esto es una prueba: los reportes todavía no llegan a ninguna entidad.
        </p>
        {!almacenamiento && (
          <p role="alert" className="w-full text-sm text-ladrillo">
            Este navegador no permite guardar datos (modo privado o almacenamiento bloqueado). Los reportes se perderán al cerrar la página.
          </p>
        )}
      </Cabecera>

      <Votacion />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <form onSubmit={enviar} noValidate className="relative space-y-4 vidrio vidrio--quieto rounded-xl p-4">
          <fieldset>
            <legend className="font-semibold">1. ¿Qué pasa?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(CATEGORIAS).map(([id, n]) => (
                <label key={id} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm transition ${categoria === id ? "border-marca bg-marca/10 font-semibold" : "border-nivel bg-superficie hover:bg-menta"}`}>
                  <input type="radio" name="categoria" value={id} checked={categoria === id} className="sr-only"
                    onChange={() => { setCategoria(id); setConfirmarDuplicado(false); }} />
                  {n}
                </label>
              ))}
            </div>
            {errores.categoria && <p id="e-categoria" className="mt-1 text-sm text-ladrillo">{errores.categoria}</p>}
          </fieldset>

          <div>
            <label htmlFor="descripcion" className="block font-semibold">
              2. Cuéntelo
            </label>
            <textarea
              id="descripcion"
              rows={4}
              maxLength={1000}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              aria-invalid={!!errores.descripcion}
              aria-describedby="ayuda-desc"
              placeholder="Ejemplo: el andén de la calle 107 frente a la cancha está roto y la gente camina por la vía."
              className="mt-1 w-full rounded-md border border-nivel px-2 py-2"
            />
            <p id="ayuda-desc" className={`mt-1 text-sm ${errores.descripcion ? "text-ladrillo" : "text-tinta-tenue"}`}>
              {errores.descripcion ?? `${descripcion.trim().length} de 1.000 caracteres (mínimo 20). Sin nombres, teléfonos, correos ni enlaces.`}
            </p>
            <label htmlFor="urgencia" className="mt-3 block text-sm font-semibold">¿Qué tan urgente es?</label>
            <select id="urgencia" value={urgencia} onChange={(e) => setUrgencia(e.target.value)} className="mt-1 w-full rounded-md border border-nivel bg-superficie px-2 py-2 text-sm">
              <option value="">Elija una opción</option>
              {Object.entries(URGENCIAS).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
            {errores.urgencia && <p className="mt-1 text-sm text-ladrillo">{errores.urgencia}</p>}
          </div>

          <div>
            <label htmlFor="foto" className="block font-semibold">3. Una foto (opcional)</label>
            <div className="mt-1 flex items-center gap-3">
              <input id="foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { ponerFoto(e.target.files?.[0]); e.target.value = ""; }} className="peer sr-only" />
              <label htmlFor="foto" className="cursor-pointer rounded-full bg-marca px-4 py-1.5 text-sm font-medium text-white transition hover:brightness-110 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-marca">{foto ? "Cambiar foto" : "Elegir foto"}</label>
              <span className="text-sm text-tinta-suave">{foto ? "Foto lista" : "Ninguna foto elegida"}</span>
            </div>
            <p className={`mt-1 text-xs ${errores.foto ? "text-ladrillo" : "text-tinta-tenue"}`}>{errores.foto || "JPG, PNG o WebP. Se reduce y se le borra la ubicación y los datos del celular. Evite que salgan caras o placas."}</p>
            {foto && (
              <div className="mt-2 flex items-center gap-3">
                <img src={foto} alt="Vista previa de la foto del reporte" className="h-20 w-28 rounded-lg object-cover ring-1 ring-nivel" />
                <button type="button" onClick={() => setFoto(null)} className="text-sm text-ladrillo hover:underline">Quitar foto</button>
              </div>
            )}
          </div>

          <div>
            <p className="font-semibold">4. ¿Dónde queda?</p>
            <p className={`text-sm ${errores.punto ? "text-ladrillo" : "text-tinta-suave"}`}>
              {errores.punto ??
                (punto
                  ? `Punto marcado${barrioDe(punto.lat, punto.lon) ? ` en ${barrioDe(punto.lat, punto.lon)}` : ""}. Puede hacer clic en otro lugar para cambiarlo.`
                  : "Haga clic en el mapa (los nombres son los barrios) o use su ubicación.")}
            </p>
            <button type="button" onClick={miUbicacion} disabled={ubicando} className="mt-2 rounded-full bg-superficie px-3 py-1.5 text-sm font-medium ring-1 ring-nivel transition hover:bg-menta disabled:opacity-50">
              {ubicando ? "Buscando…" : "Usar mi ubicación"}
            </button>
          </div>

          {/* Campo trampa para robots: fuera de pantalla y sin foco. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>Sitio web<input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} /></label>
          </div>

          {duplicado && (
            <div className="rounded-md border border-ambar/40 bg-ambar-claro p-3 text-sm">
              <p>
                Ya hay un reporte de este tipo a menos de 30 m, hecho el {fecha(duplicado.fecha)}: “{duplicado.descripcion.slice(0, 80)}
                {duplicado.descripcion.length > 80 ? "…" : ""}”.
              </p>
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={confirmarDuplicado} onChange={(e) => setConfirmarDuplicado(e.target.checked)} className="accent-[#3b82f6]" />
                Es un problema distinto
              </label>
              {errores.duplicado && <p className="mt-1 text-ladrillo">{errores.duplicado}</p>}
            </div>
          )}

          {errores.general && <p role="alert" className="text-sm text-ladrillo">{errores.general}</p>}
          <button type="submit" className="w-full rounded-md bg-acento px-4 py-2.5 font-semibold text-white hover:bg-acento-hondo">
            Guardar reporte
          </button>
          {/* shortcut: sin servidor, así que el reporte "sale" por el WhatsApp de quien lo hace; con backend se cambia por un POST. */}
          {categoria && revisarDescripcion(descripcion).ok && (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Reporte OTEA Santa Cruz\n${CATEGORIAS[categoria] ?? categoria}: ${revisarDescripcion(descripcion).ok ? limpiarTexto(descripcion) : ""}${punto ? `\nUbicación: https://maps.google.com/?q=${punto.lat.toFixed(5)},${punto.lon.toFixed(5)}` : ""}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-md border border-nivel px-4 py-2.5 text-center font-semibold hover:bg-menta"
            >
              Compartir por WhatsApp
            </a>
          )}
          {mensaje && (
            <p role="status" className="text-sm text-marca">
              {mensaje}
            </p>
          )}
        </form>

        <div className="h-[420px] overflow-hidden rounded-lg border border-nivel lg:h-auto lg:min-h-[460px]">
          <MapContainer bounds={CAJA} className="h-full w-full" zoomSnap={0.25}>
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              maxZoom={19}
              className="base-clara"
            />
            {barrios.estado === "listo" && (
              <GeoJSON data={barrios.datos} style={{ color: "#1e40af", weight: 1, fillOpacity: 0.03 }} onEachFeature={(f, l) => l.bindTooltip(String(f.properties?.nombre ?? ""), { permanent: true, direction: "center", className: "rotulo-barrio" })} />
            )}
            {comuna.estado === "listo" && (
              <GeoJSON data={comuna.datos} interactive={false} style={{ color: "#0c1d3a", weight: 2.5, dashArray: "8 5", fillOpacity: 0 }} />
            )}
            {reportes.map((r) => (
              <CircleMarker key={r.id} center={[r.lat, r.lon]} radius={6} pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#1d4fa0", fillOpacity: 1 }} />
            ))}
            {punto && (
              <CircleMarker center={[punto.lat, punto.lon]} radius={9} pathOptions={{ color: "#fff", weight: 2.5, fillColor: "#a8452b", fillOpacity: 1 }} />
            )}
            <Selector onPunto={elegirPunto} />
            <Vuelo punto={punto} />
          </MapContainer>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Sus reportes</h2>
        {reportes.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-nivel p-4 text-sm text-tinta-suave">
            Todavía no hay reportes. Use el formulario para crear el primero.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-nivel border-y border-nivel">
            {reportes.map((r) => (
              <li key={r.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4">
                <div>
                  <p className="font-medium">{CATEGORIAS[r.categoria] ?? r.categoria}</p>
                  <p className="text-sm">{r.descripcion}</p>
                  {r.urgencia && URGENCIAS[r.urgencia] && <p className="text-xs text-tinta-suave">{URGENCIAS[r.urgencia]}</p>}
                  {fotoValida(r.foto) && <img src={r.foto} alt="Foto del reporte" className="mt-1 h-16 w-24 rounded-md object-cover ring-1 ring-nivel" />}
                  <p className="mt-0.5 text-xs text-tinta-tenue">
                    {r.barrio ?? "Barrio sin identificar"}, {fecha(r.fecha)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded bg-cable-claro px-1.5 py-0.5 text-xs font-medium text-cable">{r.estado}</span>
                  <button type="button" onClick={() => borrar(r.id)} className="text-sm text-ladrillo underline-offset-2 hover:underline">
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
