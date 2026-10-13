import { useEffect, useMemo, useState } from "react";
import type { Feature } from "geojson";
import { DESTINOS_RUTEO, NOMBRE_TRAMO, cargarRed, destinosCercanos, dijkstra, nodoCercano, rutaHasta, type Red, type ResultadoDestino, type Ruta } from "../../lib/ruteo";
import { metros, num } from "../../lib/formato";
import type { Coleccion, Elemento } from "../../lib/tipos";

const FUERA_DE_AREA_M = 250;

interface Props {
  clic: { lon: number; lat: number; n: number } | null;
  onGeo: (rutas: Coleccion | null, puntos: Coleccion | null) => void;
  onEncuadrar: (e: Elemento) => void;
  onCerrar: () => void;
}

const minutos = (s: number) => {
  const m = Math.round(s / 60);
  return m < 1 ? "menos de 1 min" : `${m} min`;
};

function Detalle({ r, titulo }: { r: Ruta; titulo: string }) {
  const tipos = Object.entries(r.porTipo).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-2xl bg-superficie p-4 shadow-sm">
      <p className="text-sm text-tinta-suave">{titulo}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums [font-stretch:110%]">{minutos(r.segundos)}</p>
      <p className="text-base">
        {metros(r.metros)} caminando. Sube {num(Math.round(r.subida))} m y baja {num(Math.round(r.bajada))} m.
      </p>
      {tipos.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {tipos.map(([t, m]) => (
            <li key={t} className="flex justify-between gap-2">
              <span>{NOMBRE_TRAMO[t] ?? t}</span>
              <span className="tabular-nums text-tinta-suave">{metros(m)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PanelRuteo({ clic, onGeo, onEncuadrar, onCerrar }: Props) {
  const [red, setRed] = useState<Red | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origen, setOrigen] = useState<{ lon: number; lat: number; nodo: number; enganche: number } | null>(null);
  const [destinoB, setDestinoB] = useState<{ lon: number; lat: number; nodo: number; enganche: number } | null>(null);
  const [elegirB, setElegirB] = useState(false);
  const [tipoActivo, setTipoActivo] = useState("transporte_masivo");
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    cargarRed().then(setRed).catch((e: Error) => setError(`No se pudo cargar la red de caminos: ${e.message}`));
  }, []);

  // Cada clic en el mapa: primero el origen; si se pidió, luego el destino
  useEffect(() => {
    if (!clic || !red) return;
    const c = nodoCercano(red, clic.lon, clic.lat);
    if (!c || c.metros > FUERA_DE_AREA_M) {
      setAviso("Ese punto queda fuera del área con red de caminos (la comuna y 1,3 km alrededor). Toque más cerca de Santa Cruz.");
      return;
    }
    setAviso(c.metros > 60 ? `El punto está a ${num(Math.round(c.metros))} m del camino más cercano registrado: el resultado es menos preciso.` : null);
    const punto = { lon: clic.lon, lat: clic.lat, nodo: c.nodo, enganche: c.metros };
    if (elegirB && origen) {
      setDestinoB(punto);
      setElegirB(false);
    } else {
      setOrigen(punto);
      setDestinoB(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clic?.n, red]);

  const calculo = useMemo(() => (red && origen ? dijkstra(red, origen.nodo) : null), [red, origen]);

  const cercanos: ResultadoDestino[] = useMemo(
    () => (red && origen && calculo ? destinosCercanos(red, calculo, [origen.lon, origen.lat], origen.enganche) : []),
    [red, origen, calculo],
  );

  const rutaB: Ruta | null = useMemo(() => {
    if (!red || !origen || !calculo || !destinoB) return null;
    return rutaHasta(red, calculo, destinoB.nodo, [origen.lon, origen.lat], [destinoB.lon, destinoB.lat], origen.enganche + destinoB.enganche);
  }, [red, origen, calculo, destinoB]);

  // Dibujar en el mapa
  useEffect(() => {
    if (!origen) {
      onGeo(null, null);
      return;
    }
    const lineas: Feature[] = [];
    const puntos: Feature[] = [
      { type: "Feature", properties: { rol: "origen", etiqueta: "Usted está aquí" }, geometry: { type: "Point", coordinates: [origen.lon, origen.lat] } },
    ];
    if (rutaB && destinoB) {
      lineas.push({ ...rutaB.geojson, properties: { color: "#0c1d3a", activa: true } });
      puntos.push({ type: "Feature", properties: { rol: "destino", etiqueta: "Destino", color: "#a8452b" }, geometry: { type: "Point", coordinates: [destinoB.lon, destinoB.lat] } });
    } else {
      for (const r of cercanos) {
        const d = DESTINOS_RUTEO.find((x) => x.tipo === r.tipo)!;
        const activa = r.tipo === tipoActivo;
        lineas.push({ ...r.ruta.geojson, properties: { color: d.color, activa } });
        if (activa)
          puntos.push({ type: "Feature", properties: { rol: "destino", etiqueta: r.nombre, color: d.color }, geometry: { type: "Point", coordinates: [r.lon, r.lat] } });
      }
      // la activa al final para que quede encima
      lineas.sort((a, b) => Number(a.properties?.activa) - Number(b.properties?.activa));
    }
    onGeo({ type: "FeatureCollection", features: lineas } as Coleccion, { type: "FeatureCollection", features: puntos } as Coleccion);
    const enfoque = rutaB ?? cercanos.find((r) => r.tipo === tipoActivo)?.ruta;
    if (enfoque) onEncuadrar(enfoque.geojson as Elemento);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen, destinoB, rutaB, cercanos, tipoActivo]);

  useEffect(() => () => onGeo(null, null), [onGeo]);

  const activo = cercanos.find((r) => r.tipo === tipoActivo);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold leading-tight [font-stretch:110%]">¿Cómo llego caminando?</h2>
          <p className="mt-1 text-base text-tinta-suave">
            {elegirB
              ? "Ahora toque en el mapa el lugar al que quiere ir."
              : origen
                ? "Toque otro punto del mapa para cambiar el punto de partida."
                : "Toque en el mapa el punto de partida, por ejemplo su casa."}
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="shrink-0 rounded-xl border border-nivel bg-superficie px-3 py-2 text-base font-medium">
          Salir
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl bg-ladrillo-claro p-3 text-ladrillo">{error}</p>}
      {!red && !error && <p className="text-tinta-suave">Cargando la red de calles, andenes y escaleras…</p>}
      {aviso && <p role="status" className="rounded-xl bg-ambar-claro p-3 text-sm">{aviso}</p>}

      {origen && !destinoB && cercanos.length > 0 && (
        <>
          <ul className="space-y-2" aria-label="Lugares más cercanos caminando">
            {cercanos.map((r) => {
              const d = DESTINOS_RUTEO.find((x) => x.tipo === r.tipo)!;
              const sel = r.tipo === tipoActivo;
              return (
                <li key={r.tipo}>
                  <button
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setTipoActivo(r.tipo)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left ${sel ? "border-tinta bg-superficie shadow" : "border-transparent bg-superficie/80 hover:bg-superficie"}`}
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{d.nombre}</span>
                      <span className="block truncate text-sm text-tinta-suave">{r.nombre}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-lg font-bold tabular-nums">{minutos(r.ruta.segundos)}</span>
                      <span className="block text-xs text-tinta-suave">{metros(r.ruta.metros)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {activo && <Detalle r={activo.ruta} titulo={`Hasta ${activo.nombre}`} />}
        </>
      )}

      {rutaB && <Detalle r={rutaB} titulo="Hasta el punto elegido" />}
      {destinoB && !rutaB && <p className="rounded-xl bg-ladrillo-claro p-3">No se encontró un camino registrado entre esos dos puntos.</p>}

      {origen && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setElegirB(true); setDestinoB(null); }}
            className={`rounded-xl px-4 py-2.5 text-base font-semibold ${elegirB ? "bg-ambar text-white" : "bg-tinta text-papel"}`}
          >
            {elegirB ? "Esperando el destino…" : "Elegir un destino en el mapa"}
          </button>
          {destinoB && (
            <button type="button" onClick={() => setDestinoB(null)} className="rounded-xl border border-nivel bg-superficie px-4 py-2.5 text-base font-medium">
              Ver lugares cercanos
            </button>
          )}
        </div>
      )}

      <details className="rounded-xl bg-papel-hondo p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Cómo se calcula (estimación, no medición)</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-tinta-suave">
          <li>La ruta va por la red de calles oficiales, andenes y senderos, escaleras y puentes peatonales de OpenStreetMap, no en línea recta.</li>
          <li>La velocidad cambia con la pendiente (función de Tobler): unos 5 km/h en plano y bastante menos subiendo.</li>
          <li>La pendiente sale del inventario oficial de calzadas cuando existe y, si no, de un modelo de elevación de unos 10 m.</li>
          <li>No se tienen en cuenta semáforos, rejas, inseguridad ni el estado del andén. Algunos caminos reales pueden faltar en la red.</li>
        </ul>
      </details>
    </div>
  );
}
