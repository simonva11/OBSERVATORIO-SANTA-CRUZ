import { useEffect, useState, type ReactNode } from "react";
import type { Map as MapaML } from "maplibre-gl";
import { textoHora } from "../../lib/sol";

// --------------------------------------------------------------------- íconos
const svg = (d: ReactNode, cls = "h-6 w-6") => (
  <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const ICONOS = {
  mas: svg(<path d="M12 5v14M5 12h14" />),
  menos: svg(<path d="M5 12h14" />),
  camara: svg(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  sol: svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  luna: svg(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />),
};

// Botones planos dentro de una sola barra: sin sombra propia ni saltos al pasar el mouse
const boton =
  "grid h-11 w-11 place-items-center text-tinta transition-[background-color,transform] duration-150 ease-out enabled:active:scale-[0.96] hover:bg-acento/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-acento disabled:opacity-50";

/** Sigue el giro y la inclinación del mapa para la brújula. */
function useCamara(mapa: MapaML | null) {
  const [cam, setCam] = useState({ giro: 0, inclinacion: 0 });
  useEffect(() => {
    if (!mapa) return;
    const leer = () => setCam({ giro: mapa.getBearing(), inclinacion: mapa.getPitch() });
    leer();
    mapa.on("move", leer);
    return () => {
      mapa.off("move", leer);
    };
  }, [mapa]);
  return cam;
}

// --------------------------------------------------------------------- foto HD
const fechaArchivo = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Foto del mapa sin botones ni paneles, de 2560 px de ancho (2K).
 * Sube la resolución del canvas, espera a que termine de dibujar y compone: degradado de fondo,
 * mapa, viñeta, nombres de barrio visibles y créditos de los datos.
 */
export async function capturarFoto(mapa: MapaML, noche: boolean): Promise<void> {
  const lienzo = mapa.getCanvas();
  const ancho = lienzo.clientWidth || 1;
  const original = mapa.getPixelRatio();
  mapa.setPixelRatio(Math.min(2560 / ancho, 4));
  try {
    await new Promise<void>((r) => mapa.once("idle", () => r()));
    // La letra de los nombres; si no llega en 1,5 s se sigue con la de respaldo
    await Promise.race([document.fonts?.load?.('600 32px "Inter"').catch(() => undefined), new Promise((r) => setTimeout(r, 1500))]);
    const salida = document.createElement("canvas");
    await new Promise<void>((r) => {
      mapa.once("render", () => {
        salida.width = lienzo.width;
        salida.height = lienzo.height;
        const g = salida.getContext("2d")!;
        const fondo = g.createLinearGradient(0, 0, salida.width, salida.height);
        fondo.addColorStop(0, noche ? "#0b1310" : "#f8f6f1");
        fondo.addColorStop(1, noche ? "#12201a" : "#e8f0e8");
        g.fillStyle = fondo;
        g.fillRect(0, 0, salida.width, salida.height);
        g.drawImage(lienzo, 0, 0); // dentro del evento "render" el buffer todavía tiene el cuadro
        r();
      });
      mapa.triggerRepaint();
    });
    const g = salida.getContext("2d")!;
    const W = salida.width, H = salida.height, k = W / ancho;
    // Viñeta
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, noche ? "rgba(4,9,7,0.55)" : "rgba(232,240,232,0.6)");
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    // Nombres de barrio que se ven en pantalla
    const caja = lienzo.getBoundingClientRect();
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `600 ${Math.round(15 * k)}px Inter, Archivo, sans-serif`;
    document.querySelectorAll<HTMLElement>(".etiqueta-barrio.visible").forEach((el) => {
      const r = el.getBoundingClientRect();
      const x = (r.left + r.width / 2 - caja.left) * k, y = (r.top + r.height / 2 - caja.top) * k;
      if (x < 0 || y < 0 || x > W || y > H) return;
      g.shadowColor = noche ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,1)";
      g.shadowBlur = 4 * k;
      g.fillStyle = noche ? "#e8e6fb" : "#3d2fa8";
      for (let i = 0; i < 3; i++) g.fillText(el.textContent ?? "", x, y);
    });
    g.shadowBlur = 0;
    // Créditos
    const pie = Math.round(13 * k);
    g.font = `600 ${Math.round(18 * k)}px Inter, Archivo, sans-serif`;
    g.textAlign = "left";
    g.fillStyle = noche ? "rgba(232,243,236,0.92)" : "rgba(26,77,46,0.92)";
    g.fillText("Santa Cruz · Comuna 2, Medellín", 24 * k, H - 44 * k);
    g.font = `400 ${pie}px Inter, Archivo, sans-serif`;
    g.fillText(`OTEA · Santa Cruz · ${new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}`, 24 * k, H - 22 * k);
    g.textAlign = "right";
    g.fillText("Datos: Alcaldía de Medellín, DANE · © OpenStreetMap, OpenMapTiles, OpenFreeMap", W - 24 * k, H - 22 * k);
    const blob = await new Promise<Blob | null>((r) => salida.toBlob(r, "image/png"));
    if (!blob) throw new Error("No se pudo crear la imagen");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `santa-cruz-mapa-${fechaArchivo()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } finally {
    mapa.setPixelRatio(original);
  }
}


// --------------------------------------------------------------------- columna de botones
export function Brujula({ mapa }: { mapa: MapaML | null }) {
  const cam = useCamara(mapa);
  return (
    <button
      type="button"
      className={boton}
      title="Brújula: volver al norte"
      aria-label="Volver al norte"
      onClick={() => mapa?.easeTo({ bearing: 0, duration: 700 })}
      disabled={!mapa}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true" style={{ transform: `rotate(${-cam.giro}deg)`, transition: "transform 80ms linear" }}>
        <path d="M12 2 15.5 12H8.5z" className="fill-peligro" />
        <path d="M12 22 8.5 12h7z" className="fill-marca" opacity="0.45" />
        <text x="12" y="7.6" textAnchor="middle" fontSize="4.6" fontWeight="700" className="fill-white">N</text>
      </svg>
    </button>
  );
}

export function BotonesCamara({
  mapa,
  noche,
  onNoche,
  conNoche = true,
  onAviso,
}: {
  mapa: MapaML | null;
  noche: boolean;
  onNoche?: () => void;
  conNoche?: boolean;
  onAviso?: (t: string) => void;
}) {
  const [tomando, setTomando] = useState(false);
  const foto = async () => {
    if (!mapa || tomando) return;
    setTomando(true);
    onAviso?.("Preparando la foto en alta resolución…");
    try {
      await capturarFoto(mapa, noche);
      onAviso?.("Foto descargada");
    } catch {
      onAviso?.("No se pudo tomar la foto. Intente de nuevo.");
    } finally {
      setTomando(false);
    }
  };
  const raya = <span aria-hidden="true" className="mx-2 h-px bg-nivel/70" />;
  return (
    <div className="panel-mapa flex flex-col overflow-hidden rounded-2xl">
      <button type="button" aria-label="Acercar" title="Acercar" disabled={!mapa} onClick={() => mapa?.zoomIn()} className={boton}>
        {ICONOS.mas}
      </button>
      {raya}
      <button type="button" aria-label="Alejar" title="Alejar" disabled={!mapa} onClick={() => mapa?.zoomOut()} className={boton}>
        {ICONOS.menos}
      </button>
      {raya}
      <Brujula mapa={mapa} />
      {conNoche && onNoche && (
        <>
          {raya}
          <button type="button" className={boton} aria-pressed={noche} aria-label={noche ? "Cambiar a día" : "Cambiar a noche"} title={noche ? "Ver de día" : "Ver de noche"} onClick={onNoche}>
            {noche ? ICONOS.luna : ICONOS.sol}
          </button>
        </>
      )}
      {raya}
      <button type="button" className={boton} aria-label="Capturar foto HD del mapa" title="Capturar foto HD (PNG 2K)" disabled={!mapa || tomando} onClick={foto}>
        {tomando ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-marca border-t-transparent" /> : ICONOS.camara}
      </button>
    </div>
  );
}

/** Deslizador de la hora del sol (mueve luz y sombras de los edificios). */
export function HoraSol({ hora, onHora }: { hora: number; onHora: (h: number) => void }) {
  return (
    <label className="panel-mapa flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-tinta">
      <span aria-hidden="true" className="text-[#c98a1a]">{ICONOS.sol}</span>
      <span className="w-[4.6rem] tabular-nums">{textoHora(hora)}</span>
      <input
        type="range"
        min={6}
        max={18}
        step={0.25}
        value={hora}
        onChange={(e) => onHora(Number(e.target.value))}
        aria-label="Hora del sol para las sombras"
        className="rango-verde w-24"
      />
    </label>
  );
}
