import { Cabecera } from "../components/Pagina";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { useDatos } from "../lib/datos";
import { distanciaM, puntoEn } from "../lib/geo";
import { fecha } from "../lib/formato";
import type { Coleccion } from "../lib/tipos";

const CLAVE = "observatorio-santa-cruz:reportes:v1";

const CATEGORIAS: Record<string, string> = {
  anden_danado: "Andén dañado o inexistente",
  punto_peligroso: "Punto peligroso para cruzar o caminar",
  barrera_discapacidad: "Barrera para personas con discapacidad",
  movilidad: "Problema de movilidad o transporte",
  parque_deteriorado: "Parque o equipamiento deteriorado",
  nueva_conexion: "Propuesta de nueva conexión peatonal",
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
}

function leerReportes(): Reporte[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Reporte[]) : [];
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
    const texto = descripcion.trim();
    if (texto.length < 10) err.descripcion = "Describa el problema con al menos 10 caracteres.";
    if (texto.length > 1000) err.descripcion = "La descripción puede tener máximo 1.000 caracteres.";
    if (/\b\d{7,10}\b/.test(texto) || /@\w/.test(texto))
      err.descripcion = "No escriba teléfonos ni correos. El reporte no necesita datos personales.";
    if (!punto) err.punto = "Marque en el mapa dónde está el problema.";
    if (duplicado && !confirmarDuplicado) err.duplicado = "Confirme que es un problema distinto al que ya está reportado.";
    setErrores(err);
    if (Object.keys(err).length || !punto) return;

    const r: Reporte = {
      id: nuevoId(),
      categoria,
      descripcion: texto,
      lat: +punto.lat.toFixed(6),
      lon: +punto.lon.toFixed(6),
      barrio: barrioDe(punto.lat, punto.lon),
      fecha: new Date().toISOString(),
      estado: "Recibido",
    };
    setReportes((rs) => [r, ...rs]);
    setCategoria("");
    setDescripcion("");
    setPunto(null);
    setConfirmarDuplicado(false);
    setMensaje(`Reporte guardado${r.barrio ? ` en ${r.barrio}` : ""}. Quedó en estado Recibido.`);
  };

  const borrar = (id: string) => setReportes((rs) => rs.filter((r) => r.id !== id));

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-5 lg:px-8">
      <Cabecera etiqueta="Participación" icono="participacion" titulo="Reportar un problema"
        texto="Andenes dañados, puntos peligrosos, barreras de acceso, parques deteriorados o conexiones que hacen falta. Los reportes servirán como insumo para el Presupuesto Participativo y las entidades, no como decisiones automáticas.">
        <p className="w-full rounded-lg bg-ambar-claro px-3 py-2 text-sm text-tinta">
          Prueba local, la versión con servidor llega en la Fase 4. Los reportes se guardan solo en este navegador: no se envían a ninguna entidad ni los ven otras personas.
        </p>
        {!almacenamiento && (
          <p role="alert" className="w-full text-sm text-ladrillo">
            Este navegador no permite guardar datos (modo privado o almacenamiento bloqueado). Los reportes se perderán al cerrar la página.
          </p>
        )}
      </Cabecera>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <form onSubmit={enviar} noValidate className="space-y-4 vidrio vidrio--quieto rounded-xl p-4">
          <div>
            <label htmlFor="categoria" className="block font-semibold">
              Tipo de problema
            </label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setConfirmarDuplicado(false);
              }}
              aria-invalid={!!errores.categoria}
              aria-describedby={errores.categoria ? "e-categoria" : undefined}
              className="mt-1 w-full rounded-md border border-nivel bg-superficie px-2 py-2"
            >
              <option value="">Elija una opción</option>
              {Object.entries(CATEGORIAS).map(([id, n]) => (
                <option key={id} value={id}>
                  {n}
                </option>
              ))}
            </select>
            {errores.categoria && <p id="e-categoria" className="mt-1 text-sm text-ladrillo">{errores.categoria}</p>}
          </div>

          <div>
            <label htmlFor="descripcion" className="block font-semibold">
              Descripción
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
              {errores.descripcion ?? `${descripcion.trim().length} de 1.000 caracteres. No incluya nombres, teléfonos ni correos.`}
            </p>
          </div>

          <div>
            <p className="font-semibold">Ubicación</p>
            <p className={`text-sm ${errores.punto ? "text-ladrillo" : "text-tinta-suave"}`}>
              {errores.punto ??
                (punto
                  ? `Punto marcado${barrioDe(punto.lat, punto.lon) ? ` en ${barrioDe(punto.lat, punto.lon)}` : ""}. Puede hacer clic en otro lugar para cambiarlo.`
                  : "Haga clic en el mapa para marcar el lugar.")}
            </p>
          </div>

          {duplicado && (
            <div className="rounded-md border border-ambar/40 bg-ambar-claro p-3 text-sm">
              <p>
                Ya hay un reporte de este tipo a menos de 30 m, hecho el {fecha(duplicado.fecha)}: “{duplicado.descripcion.slice(0, 80)}
                {duplicado.descripcion.length > 80 ? "…" : ""}”.
              </p>
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={confirmarDuplicado} onChange={(e) => setConfirmarDuplicado(e.target.checked)} className="accent-[#6a4fe0]" />
                Es un problema distinto
              </label>
              {errores.duplicado && <p className="mt-1 text-ladrillo">{errores.duplicado}</p>}
            </div>
          )}

          <button type="submit" className="w-full rounded-md bg-acento px-4 py-2.5 font-semibold text-white hover:bg-acento-hondo">
            Guardar reporte
          </button>
          {/* shortcut: sin servidor, así que el reporte "sale" por el WhatsApp de quien lo hace; con backend se cambia por un POST. */}
          {categoria && descripcion.trim().length >= 10 && (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Reporte OTEA Santa Cruz\n${CATEGORIAS[categoria] ?? categoria}: ${descripcion.trim()}${punto ? `\nUbicación: https://maps.google.com/?q=${punto.lat.toFixed(5)},${punto.lon.toFixed(5)}` : ""}`)}`}
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
              <GeoJSON data={barrios.datos} interactive={false} style={{ color: "#3a2d8f", weight: 1, fillOpacity: 0.03 }} />
            )}
            {comuna.estado === "listo" && (
              <GeoJSON data={comuna.datos} interactive={false} style={{ color: "#1b1d3a", weight: 2.5, dashArray: "8 5", fillOpacity: 0 }} />
            )}
            {reportes.map((r) => (
              <CircleMarker key={r.id} center={[r.lat, r.lon]} radius={6} pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#1d4fa0", fillOpacity: 1 }} />
            ))}
            {punto && (
              <CircleMarker center={[punto.lat, punto.lon]} radius={9} pathOptions={{ color: "#fff", weight: 2.5, fillColor: "#a8452b", fillOpacity: 1 }} />
            )}
            <Selector onPunto={elegirPunto} />
          </MapContainer>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Reportes guardados en este navegador</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          Estados de seguimiento previstos: {ESTADOS.join(", ").toLowerCase()}. En la Fase 4 un equipo moderador revisará y validará cada reporte.
        </p>
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
