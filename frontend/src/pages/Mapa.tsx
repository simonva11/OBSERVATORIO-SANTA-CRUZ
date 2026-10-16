import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PREGUNTAS_MAPA, preguntaPorId, type PreguntaMapa } from "../lib/preguntas";
import { historiaPorId } from "../lib/ciudadano";
import type { Map as MapaML } from "maplibre-gl";
import MapaVivo, { type FiltroHuecos, type FiltroSiniestros, type Modo } from "../components/mapa/MapaVivo";
import { BotonesCamara, HoraSol } from "../components/mapa/ControlesMapa";
import { useNocheActiva } from "../components/Layout";
import { horaColombia } from "../lib/sol";
import PanelCapas from "../components/mapa/PanelCapas";
import PanelRuteo from "../components/mapa/PanelRuteo";
import Buscador, { type Resultado } from "../components/mapa/Buscador";
import Leyenda, { type BloqueLeyenda } from "../components/mapa/Leyenda";
import Icono from "../components/mapa/Iconos";
import FichaBarrio from "../components/FichaBarrio";
import FichaElemento from "../components/FichaElemento";
import { Cargando, ErrorCarga } from "../components/Estado";
import { CAPAS, COLORES_BARRIO, ESCALA_ALERTA, TEMAS, capaPorId, type Tema } from "../lib/capas";
import { cargar, useDatos } from "../lib/datos";
import { dec, dec2, num } from "../lib/formato";
import type { Coleccion, Elemento, FichaBarrio as Ficha, Indicadores, Props } from "../lib/tipos";

const CLAVE_AYUDA = "observatorio-santa-cruz:ayuda-mapa-vista";
const CLAVE_SOLO = "observatorio-santa-cruz:solo-mapa";
const CLAVE_PANEL = "observatorio-santa-cruz:panel-temas-abierto";

function leerAyuda() {
  try {
    return localStorage.getItem(CLAVE_AYUDA) !== "1";
  } catch {
    return true;
  }
}

/** Preferencia guardada en el navegador (si no hay almacenamiento, queda solo en memoria). */
function usePreferencia(clave: string, inicial: boolean) {
  const [v, setV] = useState(() => {
    try {
      const g = localStorage.getItem(clave);
      return g == null ? inicial : g === "1";
    } catch {
      return inicial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(clave, v ? "1" : "0");
    } catch {
      /* sin almacenamiento */
    }
  }, [clave, v]);
  return [v, setV] as const;
}

/** Deslizar en el celular: llama a `fn` si el dedo se movió más de 50 px en la dirección pedida. */
function useDeslizar(direccion: "arriba" | "abajo", fn: () => void) {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0];
      inicio.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: TouchEvent) => {
      const i = inicio.current;
      inicio.current = null;
      if (!i) return;
      const t = e.changedTouches[0];
      const dy = t.clientY - i.y, dx = t.clientX - i.x;
      if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.3 && (direccion === "arriba" ? dy < 0 : dy > 0)) fn();
    },
  };
}

/** Cortes por cuantiles para pintar barrios (5 grupos). */
function cortes(valores: number[]) {
  const v = [...valores].sort((a, b) => a - b);
  return [0.2, 0.4, 0.6, 0.8].map((q) => v[Math.min(v.length - 1, Math.floor(q * v.length))]);
}

function FichaComuna({ p, santaCruz, onVerSantaCruz }: { p: Props; santaCruz?: Props; onVerSantaCruz: () => void }) {
  const fila = (etiqueta: string, valor: string, ref?: string) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-nivel py-2 text-base">
      <dt className="text-tinta-suave">{etiqueta}</dt>
      <dd className="text-right font-semibold tabular-nums">
        {valor}
        {ref && <span className="block text-sm font-normal text-tinta-tenue">{ref}</span>}
      </dd>
    </div>
  );
  const sc = santaCruz && !p.es_santa_cruz ? santaCruz : undefined;
  return (
    <article className="space-y-4">
      <header>
        <p className="text-tinta-suave">{String(p.tipo ?? "")} de Medellín</p>
        <h2 className="text-3xl font-bold leading-tight [font-stretch:112%]">{String(p.nombre)}</h2>
        <p className="text-tinta-suave">{dec(p.area_ha as number)} hectáreas</p>
      </header>
      <dl>
        {fila("Equipamientos colectivos", num(p.equipamientos as number), sc && `Santa Cruz: ${num(sc.equipamientos as number)}`)}
        {fila("Equipamientos de salud", num(p.salud as number), sc && `Santa Cruz: ${num(sc.salud as number)}`)}
        {fila("Colegios y sedes educativas", num(p.sedes_educativas as number), sc && `Santa Cruz: ${num(sc.sedes_educativas as number)}`)}
        {fila("Canchas y escenarios deportivos", num(p.escenarios_deportivos as number), sc && `Santa Cruz: ${num(sc.escenarios_deportivos as number)}`)}
        {fila("Bibliotecas", num(p.bibliotecas as number), sc && `Santa Cruz: ${num(sc.bibliotecas as number)}`)}
        {fila("Estaciones del sistema Metro", num(p.estaciones as number), sc && `Santa Cruz: ${num(sc.estaciones as number)}`)}
        {p.imcv != null &&
          fila(
            `Calidad de vida (IMCV ${String(p.imcv_anio ?? "")})`,
            dec2(p.imcv as number),
            sc ? `Santa Cruz: ${dec2(sc.imcv as number)}` : "De 0 a 100, más alto es mejor",
          )}
      </dl>
      <p className="text-sm text-tinta-tenue">
        Conteos hechos con las capas oficiales de la Alcaldía. No dependen del tamaño ni de la población de cada comuna, así que
        sirven para ubicarse, no para comparar directamente.
      </p>
      {!p.es_santa_cruz && (
        <button type="button" onClick={onVerSantaCruz} className="w-full rounded-xl bg-acento px-4 py-3 text-lg font-semibold text-white hover:bg-acento-hondo">
          Volver a Santa Cruz
        </button>
      )}
    </article>
  );
}

/** Marca de "elegido": chulo blanco sobre círculo verde. */
/** Temas agrupados por la pregunta que ayudan a responder. */
const GRUPOS_TEMA: { titulo: string; temas: string[] }[] = [
  { titulo: "Moverse", temas: ["transporte", "caminar", "corredor", "accidentes", "seguridad"] },
  { titulo: "Servicios cerca", temas: ["colegios", "comunidad", "parques"] },
  { titulo: "Gente y vivienda", temas: ["personas", "vivienda"] },
  { titulo: "Riesgo y norma", temas: ["riesgo", "plan"] },
  { titulo: "Reportes y tus datos", temas: ["reclamos", "misdatos"] },
];

/** Lista de preguntas del mapa para vecinos, con la explicación y la cobertura de la elegida. */
function PreguntasVecinos({ actual, onElegir }: { actual: string | null; onElegir: (p: PreguntaMapa) => void }) {
  return (
    <ul className="space-y-0.5">
      {PREGUNTAS_MAPA.map((x) => {
        const elegida = actual === x.id;
        const h = x.historia ? historiaPorId(x.historia) : undefined;
        return (
          <li key={x.id}>
            <button type="button" aria-pressed={elegida} onClick={() => onElegir(x)}
              className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-[0.92rem] leading-snug transition-colors ${elegida ? "bg-tinta font-semibold text-papel" : "hover:bg-acento/10"}`}>
              <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.color }} />
              {x.pregunta}
            </button>
            {/* La explicación va justo debajo de la pregunta elegida, para que se lea sin bajar en el panel. */}
            {elegida && (
              <div className="mx-1 mb-2 mt-1 rounded-xl bg-papel-hondo p-3 text-[0.85rem] leading-snug">
                <p>{x.explica}</p>
                <p className="mt-2 text-tinta-suave"><strong className="text-tinta">Qué cubre el dato:</strong> {x.cobertura}</p>
                <div className="mt-2 grid gap-1">
                  {h && <Link to={`/historias/${h.id}`} className="font-semibold text-marca underline">Leer la historia</Link>}
                  <Link to={x.tecnica.to} className="font-semibold text-marca underline">{x.tecnica.texto}</Link>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Chulo() {
  return (
    <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-acento text-white shadow">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

function BotonTema({ t, activo, soloComuna, onClick }: { t: Tema; activo: boolean; soloComuna: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`tarjeta-tema group flex w-full min-w-[11.5rem] items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left ${
        activo ? "border-marca bg-superficie text-tinta shadow-lg" : "border-transparent bg-superficie/90 text-tinta"
      }`}
    >
      <span className="icono-tema grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: activo ? t.color : `${t.color}1f`, color: activo ? "#fff" : t.color }}>
        <Icono nombre={t.id} className="h-7 w-7" />
      </span>
      <span className="leading-tight">
        <span className="block text-[1.05rem] font-semibold">{t.nombre}</span>
        <span className="block text-sm text-tinta-suave">{soloComuna ? "Solo Santa Cruz" : t.ayuda}</span>
      </span>
      {activo && <Chulo />}
    </button>
  );
}

/** Fila compacta del tema: ícono pequeño y nombre. Elegida, queda teñida con su color; sin saltos ni sombras. */
function TemaCuadro({ t, activo, soloComuna, onClick }: { t: Tema; activo: boolean; soloComuna: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={activo}
        title={t.ayuda}
        onClick={onClick}
        className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left text-sm font-medium transition-colors ${activo ? "text-tinta" : "text-tinta-suave hover:bg-acento/10 hover:text-tinta"}`}
        style={activo ? { background: `${t.color}22` } : undefined}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: activo ? t.color : `${t.color}1f`, color: activo ? "#fff" : t.color }}>
          <Icono nombre={t.id} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          {t.nombre}
          {soloComuna && <span className="block text-xs font-normal text-tinta-tenue">Solo Santa Cruz</span>}
        </span>
        {activo && (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-marca" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        )}
      </button>
    </li>
  );
}

/** Temas del mapa para vecinos: los que se entienden sin saber de planeación. Los técnicos (POT, Carrera 49, vivienda, tus datos) quedan en OTEA Técnico. */
const TEMAS_VECINOS = ["transporte", "caminar", "reclamos", "parques", "colegios", "comunidad", "personas", "riesgo", "accidentes"];

export default function Mapa({ vecinos = false }: { vecinos?: boolean }) {
  const temasVisibles = vecinos ? TEMAS.filter((t) => TEMAS_VECINOS.includes(t.id)) : TEMAS;
  const [params, setParams] = useSearchParams();
  const indicadores = useDatos<Indicadores>("indicadores.json");

  const [modo, setModo] = useState<Modo>(params.get("vista") === "ciudad" ? "ciudad" : "comuna");
  const [pregunta, setPregunta] = useState<string | null>(() => (vecinos ? preguntaPorId(params.get("pregunta"))?.id ?? null : null));
  const [activas, setActivas] = useState(() => {
    const p0 = vecinos ? preguntaPorId(params.get("pregunta")) : undefined;
    if (p0) return new Set(p0.capas);
    const base = new Set(["lineas_transporte", "estaciones", "equipamientos"]);
    for (const id of (params.get("capas") ?? "").split(",")) if (CAPAS.some((c) => c.id === id)) base.add(id);
    return base;
  });
  const [estados, setEstados] = useState<Record<string, "cargando" | "listo" | "error">>({});
  const [vista3d, setVista3d] = useState(params.get("3d") === "1");
  const [recorrido, setRecorrido] = useState(false);
  const [seleccion, setSeleccion] = useState<{ capa: string; elemento: Elemento } | null>(null);
  const [destino, setDestino] = useState<{ elemento: Elemento; n: number } | null>(null);
  const [reencuadre, setReencuadre] = useState(0);
  const [colorBarrios, setColorBarrios] = useState("");
  const [filtroSin, setFiltroSin] = useState<FiltroSiniestros>({ clase: "Atropello", anio: "Todos" });
  const [filtroHue, setFiltroHue] = useState<FiltroHuecos>({ estado: "Todos", anio: "Todos" });
  const [masOpciones, setMasOpciones] = useState(false);
  const [verLeyenda, setVerLeyenda] = useState(false);
  const [ruteo, setRuteo] = useState(params.get("ruta") === "1");
  const [clicRuta, setClicRuta] = useState<{ lon: number; lat: number; n: number } | null>(null);
  const [rutas, setRutas] = useState<Coleccion | null>(null);
  const [puntosRuta, setPuntosRuta] = useState<Coleccion | null>(null);
  const onGeoRuta = useCallback((r: Coleccion | null, p: Coleccion | null) => {
    setRutas(r);
    setPuntosRuta(p);
  }, []);
  const onEncuadrarRuta = useCallback((e: Elemento) => setDestino({ elemento: e, n: Date.now() }), []);
  const alternarRuteo = () => {
    setRuteo((v) => !v);
    setSeleccion(null);
    setClicRuta(null);
    if (modo !== "comuna") cambiarModo("comuna");
  };
  const [ayuda, setAyuda] = useState(leerAyuda);
  const comunas = useDatos<{ features: Elemento[] }>("comunas_ciudad.geojson");

  // Modo inmersivo ---------------------------------------------------------------
  const [mapaML, setMapaML] = useState<MapaML | null>(null);
  const [solo, setSolo] = usePreferencia(CLAVE_SOLO, false);
  const [panelAbierto, setPanelAbierto] = usePreferencia(CLAVE_PANEL, true);
  const noche = useNocheActiva(); // el mapa sigue el tema del sitio: un solo botón día/noche
  const [hora, setHora] = useState(() => Math.min(17.5, Math.max(6.5, horaColombia())));
  const [opacidad, setOpacidad] = useState(100);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3200);
    return () => clearTimeout(t);
  }, [aviso]);
  // El Layout esconde el menú lateral y la barra del celular con este atributo
  useEffect(() => {
    document.documentElement.toggleAttribute("data-solo-mapa", solo);
    const salir = (e: KeyboardEvent) => e.key === "Escape" && setSolo(false);
    if (solo) window.addEventListener("keydown", salir);
    return () => window.removeEventListener("keydown", salir);
  }, [solo, setSolo]);
  useEffect(() => () => document.documentElement.removeAttribute("data-solo-mapa"), []);
  const deslizarArriba = useDeslizar("arriba", () => setSolo(true));
  const deslizarAbajo = useDeslizar("abajo", () => setSolo(false));
  /** Clases para lo que se esconde en Solo Mapa: fundido de 300 ms, sin desmontar (los filtros no se pierden). */
  const cromo = `transition-opacity duration-300 ${solo ? "pointer-events-none opacity-0" : "opacity-100"}`;

  const onEstado = useCallback((id: string, e: "cargando" | "listo" | "error") => {
    setEstados((s) => (s[id] === e ? s : { ...s, [id]: e }));
  }, []);

  const seleccionar = useCallback(
    (capa: string, elemento: Elemento) => {
      setSeleccion({ capa, elemento });
      setMasOpciones(false);
      if (capa === "barrios") setParams((p) => { p.set("barrio", String(elemento.properties?.codigo ?? "")); return p; }, { replace: true });
    },
    [setParams],
  );

  const cerrarFicha = () => {
    setSeleccion(null);
    setParams((p) => { p.delete("barrio"); return p; }, { replace: true });
  };

  // Abrir un barrio desde la URL (?barrio=0201)
  useEffect(() => {
    const codigo = params.get("barrio");
    if (!codigo || indicadores.estado !== "listo" || seleccion) return;
    cargar<{ features: Elemento[] }>("barrios.geojson").then((c) => {
      const f = c.features.find((x) => x.properties?.codigo === codigo);
      if (f) {
        setSeleccion({ capa: "barrios", elemento: f });
        setDestino({ elemento: f, n: Date.now() });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicadores.estado]);

  const cambiarModo = (m: Modo) => {
    setModo(m);
    setSeleccion(null);
    setParams((p) => { if (m === "ciudad") p.set("vista", "ciudad"); else p.delete("vista"); p.delete("barrio"); return p; }, { replace: true });
  };

  const temaActivo = (t: Tema) => t.capas.every((c) => activas.has(c));
  const alternarTema = (t: Tema) =>
    setActivas((s) => {
      const n = new Set(s);
      if (temaActivo(t)) t.capas.forEach((c) => n.delete(c));
      else t.capas.forEach((c) => n.add(c));
      return n;
    });
  /** Vecinos: una pregunta a la vez. Prende solo las capas que la responden y lo deja en la dirección (se puede compartir). */
  const elegirPregunta = (p: PreguntaMapa) => {
    if (pregunta === p.id) {
      setPregunta(null);
      setActivas(new Set(["lineas_transporte", "estaciones", "equipamientos"]));
      setParams((q) => { q.delete("pregunta"); return q; }, { replace: true });
      return;
    }
    setPregunta(p.id);
    setActivas(new Set(p.capas));
    setParams((q) => { q.set("pregunta", p.id); q.delete("capas"); return q; }, { replace: true });
  };
  const preguntaActual = preguntaPorId(pregunta);
  const historiaActual = preguntaActual?.historia ? historiaPorId(preguntaActual.historia) : undefined;
  const alternarCapa = (id: string) =>
    setActivas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const elegirResultado = (r: Resultado) => {
    const tema = TEMAS.find((t) => t.capas.includes(r.capa));
    if (tema) setActivas((s) => new Set([...s, r.capa]));
    seleccionar(r.capa, r.elemento);
    setDestino({ elemento: r.elemento, n: Date.now() });
  };

  const iniciarRecorrido = () => {
    if (modo !== "comuna") cambiarModo("comuna");
    setVista3d(true);
    setRecorrido(true);
  };

  const cerrarAyuda = () => {
    setAyuda(false);
    try {
      localStorage.setItem(CLAVE_AYUDA, "1");
    } catch {
      /* sin almacenamiento: la ayuda vuelve a salir la próxima vez */
    }
  };

  // Pintar barrios por un indicador -------------------------------------------
  const coloreo = useMemo(() => {
    if (!colorBarrios || indicadores.estado !== "listo" || modo !== "comuna") return null;
    const def = COLORES_BARRIO.find((c) => c.id === colorBarrios);
    if (!def) return null;
    const filas = indicadores.datos.barrios.map((b) => ({ codigo: b.codigo, v: b[def.id as keyof Ficha] as number | null }));
    const valores = filas.map((f) => f.v).filter((v): v is number => v != null);
    const c = cortes(valores);
    const escala = def.mayorEsPeor ? ESCALA_ALERTA : [...ESCALA_ALERTA].reverse();
    const clase = (v: number) => c.filter((x) => v > x).length;
    const colores = Object.fromEntries(filas.filter((f) => f.v != null).map((f) => [f.codigo, escala[clase(f.v as number)]]));
    const max = Math.max(...valores);
    const limites = [Math.min(...valores), ...c, max];
    const f = (v: number) => (max < 10 ? dec2(v) : num(Math.round(v)));
    const bloque: BloqueLeyenda = {
      titulo: `${def.nombre}${def.unidad ? ` (${def.unidad})` : ""}`,
      items: escala.map((color, i) => ({ color, etiqueta: `${f(limites[i])} a ${f(limites[i + 1])}`, forma: "area" as const })),
      nota: "Más oscuro = situación más difícil.",
    };
    return { colores, bloque };
  }, [colorBarrios, indicadores, modo]);

  const leyenda: BloqueLeyenda[] = [
    ...(vista3d && modo === "comuna"
      ? [{
          titulo: "Edificaciones en 3D (catastro)",
          items: [
            { color: "#d9d3f7", etiqueta: "1 piso", forma: "area" as const },
            { color: "#7a5be0", etiqueta: "2 pisos", forma: "area" as const },
            { color: "#3d2fa8", etiqueta: "3 pisos o más", forma: "area" as const },
          ],
          nota: "Altura = pisos × 3 m. Las sombras siguen la posición real del sol a la hora elegida. El relieve está exagerado 1,6 veces para que se note.",
        }]
      : []),
    ...(coloreo ? [coloreo.bloque] : []),
    ...CAPAS.filter((c) => activas.has(c.id)).map((c) => ({ titulo: c.nombre, items: c.leyenda })),
  ];

  const santaCruzProps = comunas.estado === "listo" ? comunas.datos.features.find((f) => f.properties?.es_santa_cruz)?.properties ?? undefined : undefined;

  const contenidoFicha = (() => {
    if (!seleccion) return null;
    if (seleccion.capa === "comunas")
      return <FichaComuna p={seleccion.elemento.properties ?? {}} santaCruz={santaCruzProps} onVerSantaCruz={() => cambiarModo("comuna")} />;
    if (seleccion.capa === "barrios") {
      if (indicadores.estado === "error") return <ErrorCarga error={indicadores.error} reintentar={indicadores.reintentar} />;
      if (indicadores.estado !== "listo") return <Cargando />;
      const ficha = indicadores.datos.barrios.find((b) => b.codigo === seleccion.elemento.properties?.codigo);
      return ficha ? <FichaBarrio ficha={ficha} indicadores={indicadores.datos} /> : null;
    }
    const def = capaPorId(seleccion.capa);
    return def ? <FichaElemento def={def} props={seleccion.elemento.properties ?? {}} /> : null;
  })();

  const btn = "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-[background-color,transform] duration-150 ease-out enabled:active:scale-[0.96]";
  const acciones = (
    <div className={`flex items-center gap-2 ${solo ? "" : "pointer-events-auto"}`}>
      <button
        type="button"
        aria-pressed={ruteo}
        onClick={alternarRuteo}
        className={`${btn} ${ruteo ? "bg-ambar text-white" : "bg-acento text-white hover:bg-acento-hondo"}`}
      >
        <Icono nombre="ruta" className="h-5 w-5" />
        {ruteo ? "Salir de rutas" : "¿Cómo llego?"}
      </button>
      <button
        type="button"
        aria-pressed={vista3d}
        onClick={() => setVista3d((v) => !v)}
        className={`${btn} panel-mapa ${vista3d ? "!border-acento !bg-acento/15 text-marca" : "text-tinta hover:!bg-acento/10"}`}
      >
        <Icono nombre="3d" className="h-5 w-5" />
        {vista3d ? "Ver en plano" : "Ver en 3D"}
      </button>
      <button
        type="button"
        onClick={() => setSolo(true)}
        title="Esconder todo y ver solo el mapa (Esc para salir)"
        className={`${btn} panel-mapa text-tinta hover:!bg-acento/10`}
      >
        Solo mapa <span aria-hidden="true" className="leading-none">⛶</span>
      </button>
      <button
        type="button"
        onClick={() => (recorrido ? setRecorrido(false) : iniciarRecorrido())}
        title={recorrido ? "Detener recorrido" : "Recorrido automático por el mapa"}
        className={`${btn} hidden sm:flex ${recorrido ? "bg-ambar text-white" : "panel-mapa text-tinta hover:!bg-acento/10"}`}
      >
        <Icono nombre="giro" className="h-5 w-5" />
        <span className="sr-only">{recorrido ? "Detener recorrido" : "Recorrido"}</span>
      </button>
    </div>
  );

  return (
    <div className="relative flex h-full bg-papel">
      <h1 className="sr-only">{vecinos ? "Mapa de Santa Cruz para vecinos" : "Mapa territorial de Santa Cruz"}</h1>
      <div className={`relative min-w-0 flex-1 ${noche ? "mapa-noche" : ""}`}>
        <MapaVivo
          modo={modo}
          activas={activas}
          vista3d={vista3d}
          recorrido={recorrido}
          onFinRecorrido={() => setRecorrido(false)}
          colorBarrio={coloreo?.colores ?? null}
          filtroSiniestros={filtroSin}
          filtroHuecos={filtroHue}
          seleccion={seleccion}
          destino={destino}
          reencuadre={reencuadre}
          onSeleccionar={seleccionar}
          onEstado={onEstado}
          ruteoActivo={ruteo}
          onClicMapa={(lon, lat) => setClicRuta({ lon, lat, n: Date.now() })}
          rutas={ruteo ? rutas : null}
          puntosRuta={ruteo ? puntosRuta : null}
          onMapa={setMapaML}
          noche={noche}
          hora={hora}
          opacidad={opacidad / 100}
        />

        {/* Barra superior: modo, búsqueda y vista */}
        <div className={`pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start gap-2 md:inset-x-4 md:top-4 md:gap-3 ${cromo}`}>
          <div role="radiogroup" aria-label="Qué parte de la ciudad ver" className={`panel-mapa flex rounded-2xl p-1 ${solo ? "" : "pointer-events-auto"}`}>
            {(
              [
                ["comuna", "Santa Cruz"],
                ["ciudad", "Toda Medellín"],
              ] as const
            ).map(([id, nombre]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={modo === id}
                onClick={() => cambiarModo(id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors md:px-5 md:text-base ${modo === id ? "bg-acento text-white" : "text-tinta-suave hover:bg-acento/10 hover:text-tinta"}`}
              >
                {nombre}
              </button>
            ))}
          </div>
          <div className={`order-last w-full md:order-none md:w-64 2xl:w-80 ${solo ? "" : "pointer-events-auto"}`}>
            <Buscador onElegir={elegirResultado} modo={modo} />
          </div>
          <div className="ml-auto xl:hidden">{acciones}</div>
        </div>

        {/* Acciones arriba a la derecha (pantallas anchas): en una columna para que no se encimen con la leyenda ni los controles */}
        <div className={`absolute right-4 top-4 z-10 hidden xl:flex ${cromo}`}>{acciones}</div>

        {/* Capas: qué quiere ver (computador). Lista compacta en un solo panel */}
        <nav
          aria-label="Qué quiere ver en el mapa"
          className={`absolute left-4 top-[4.75rem] z-10 w-60 ${panelAbierto ? "bottom-4" : ""} ${ruteo ? "hidden" : "hidden lg:flex"} ${cromo}`}
        >
          <div className="panel-mapa pointer-events-auto flex max-h-full min-h-0 w-full flex-col self-start overflow-hidden rounded-2xl">
            <button
              type="button"
              aria-expanded={panelAbierto}
              onClick={() => setPanelAbierto((v) => !v)}
              className="flex w-full shrink-0 items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-acento/10"
            >
              <span>
                <span className="block text-base font-bold">{vecinos ? "¿Qué quieres saber?" : "Capas del mapa"}</span>
                <span className="block text-xs text-tinta-suave">{vecinos ? "Elige una pregunta: el mapa muestra lo que la responde" : `${TEMAS.filter(temaActivo).length} activas · mejor una pregunta a la vez`}</span>
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 shrink-0 text-tinta-suave transition-transform duration-200 ${panelAbierto ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="m6 15 6-6 6 6" />
              </svg>
              <span className="sr-only">{panelAbierto ? "Colapsar panel" : "Abrir panel"}</span>
            </button>
            {panelAbierto && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
                  {vecinos ? (
                    <PreguntasVecinos actual={pregunta} onElegir={elegirPregunta} />
                  ) : GRUPOS_TEMA.map((g) => ({ ...g, temas: g.temas.filter((id) => temasVisibles.some((t) => t.id === id)) })).filter((g) => g.temas.length > 0).map((g) => (
                    <div key={g.titulo} className="mt-1.5 first:mt-0">
                      <p className="mono px-2 pb-0.5 pt-1.5 text-[0.64rem] uppercase tracking-[0.06em] text-tinta-tenue">{g.titulo}</p>
                      <ul className="space-y-0.5">
                        {g.temas.map((id) => TEMAS.find((t) => t.id === id)).filter((t): t is Tema => !!t).map((t) => (
                          <TemaCuadro
                            key={t.id}
                            t={t}
                            activo={temaActivo(t)}
                            soloComuna={modo === "ciudad" && t.capas.every((c) => !capaPorId(c)?.archivoCiudad)}
                            onClick={() => alternarTema(t)}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="shrink-0 space-y-2 border-t border-nivel/60 px-3.5 py-2.5">
                  <label className="block">
                    <span className="flex items-baseline justify-between text-xs font-semibold text-tinta-suave">
                      Opacidad de las capas
                      <span className="tabular-nums">{opacidad}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={opacidad}
                      onChange={(e) => setOpacidad(Number(e.target.value))}
                      className="rango-verde mt-1 w-full"
                      aria-describedby="ayuda-opacidad"
                    />
                    <span id="ayuda-opacidad" className="sr-only">Bájela para ver mejor el mapa de fondo.</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMasOpciones(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-1.5 text-sm font-semibold text-marca transition-colors hover:bg-acento/10"
                  >
                    <Icono nombre="capas" className="h-4 w-4" />
                    Más opciones
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Temas en celular y tableta: fila deslizable abajo. Deslizar hacia arriba = Solo Mapa */}
        <div {...deslizarArriba} className={`absolute inset-x-0 bottom-0 z-10 lg:hidden ${ruteo ? "hidden" : ""} ${cromo}`}>
          <div className="mx-auto mb-1 flex w-fit items-center gap-2 rounded-full bg-superficie/85 px-3 py-1 text-xs font-semibold text-tinta-suave shadow">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-tinta/30" />
            Deslice hacia arriba para ver solo el mapa
          </div>
        {vecinos && preguntaActual && (
          <p className="mx-3 mb-2 rounded-2xl bg-superficie/95 px-4 py-2.5 text-sm leading-snug shadow">
            {preguntaActual.explica}{" "}
            {historiaActual && <Link to={`/historias/${historiaActual.id}`} className="font-semibold text-marca underline">Leer la historia</Link>}
          </p>
        )}
        <nav aria-label="Qué quiere ver en el mapa" className="flex gap-2 overflow-x-auto px-3 pb-3">
          {vecinos && PREGUNTAS_MAPA.map((p) => (
            <button key={p.id} type="button" aria-pressed={pregunta === p.id} onClick={() => elegirPregunta(p)}
              className={`shrink-0 rounded-2xl px-4 py-3 text-base font-semibold shadow ${pregunta === p.id ? "bg-tinta text-papel" : "bg-superficie text-tinta"}`}>
              {p.corta}
            </button>
          ))}
          {!vecinos && temasVisibles.map((t) => (
            <div key={t.id} className="shrink-0">
              <BotonTema t={t} activo={temaActivo(t)} soloComuna={modo === "ciudad" && t.capas.every((c) => !capaPorId(c)?.archivoCiudad)} onClick={() => alternarTema(t)} />
            </div>
          ))}
          <button type="button" onClick={() => setMasOpciones(true)} className="shrink-0 rounded-2xl bg-tinta px-4 text-base font-semibold text-papel">
            Más opciones
          </button>
        </nav>
        </div>

        {/* Controles de cámara: zoom, brújula, día/noche, foto HD */}
        <div className={`absolute right-3 z-10 md:right-4 ${solo ? "top-4" : "top-[17rem] md:top-40 xl:top-[4.75rem]"}`}>
          <BotonesCamara mapa={mapaML} noche={noche} onNoche={() => window.dispatchEvent(new Event("alternar-tema"))} conNoche={!solo} onAviso={setAviso} />
        </div>

        {/* Abajo a la derecha: hora del sol (3D de día) y leyenda plegada */}
        <div className={`absolute right-3 z-10 flex flex-col items-end gap-2 md:right-4 ${solo ? "bottom-6" : ruteo ? "bottom-6" : "bottom-28 lg:bottom-8"}`}>
          {vista3d && !noche && !solo && <HoraSol hora={hora} onHora={setHora} />}
          {leyenda.length > 0 && !ruteo && (
            <div className={`panel-mapa hidden w-64 overflow-hidden rounded-2xl xl:block ${cromo}`}>
              <button
                type="button"
                aria-expanded={verLeyenda}
                onClick={() => setVerLeyenda((v) => !v)}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm font-bold transition-colors hover:bg-acento/10"
              >
                Leyenda
                <span className="text-xs font-medium text-tinta-suave">{verLeyenda ? "Ocultar" : "Ver"}</span>
              </button>
              {verLeyenda && (
                <div className="max-h-[40vh] overflow-y-auto overscroll-contain px-3.5 pb-3">
                  <Leyenda bloques={leyenda} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Solo Mapa: salir */}
        {solo && (
          <>
            <button
              type="button"
              onClick={() => setSolo(false)}
              className="salida-limpia absolute left-4 top-4 z-20 flex items-center gap-2 rounded-2xl bg-superficie/95 px-4 py-3 text-base font-semibold text-tinta shadow-lg backdrop-blur hover:bg-superficie"
            >
              <span aria-hidden="true" className="text-xl leading-none">✕</span> Salir del modo limpio
            </button>
            {/* En el celular: deslizar hacia abajo desde el borde de arriba también sale */}
            <div {...deslizarAbajo} aria-hidden="true" className="absolute inset-x-0 top-0 z-[15] h-10 lg:hidden" />
          </>
        )}

        {/* Avisos cortos (foto descargada, etc.) */}
        {aviso && (
          <p role="status" className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-acento-hondo px-5 py-2.5 text-base font-semibold text-white shadow-xl">
            {aviso}
          </p>
        )}

        {/* Ayuda la primera vez */}
        {ayuda && !solo && (
          <div role="dialog" aria-label="Cómo usar el mapa" className="absolute left-1/2 top-1/2 z-20 w-[min(92%,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-nivel bg-superficie p-6 shadow-[0_30px_60px_-20px_rgb(16_23_41/0.45)]">
            <p className="mono text-[0.7rem] uppercase tracking-[0.06em] text-tinta-tenue">Antes de empezar</p>
            <h2 className="fuente-titulo mt-1 text-2xl font-extrabold tracking-[-0.02em]">Así se usa el mapa</h2>
            <ol className="mt-4 space-y-3 text-base">
              <li className="flex gap-3"><span className="mono pt-0.5 text-sm text-marca">01</span><span>{vecinos ? "Elige una pregunta: ¿cómo llego al Metro?, ¿dónde reportaron huecos?… El mapa muestra lo que la responde." : "Elige un tema en el panel de capas: Metro, colegios, riesgo… Mejor uno a la vez."}</span></li>
              <li className="flex gap-3"><span className="mono pt-0.5 text-sm text-marca">02</span><span>Toca un barrio o un punto: a la derecha aparece qué es, sus datos y de dónde salen.</span></li>
              <li className="flex gap-3"><span className="mono pt-0.5 text-sm text-marca">03</span><span>Usa <strong>¿Cómo llego?</strong> para ver rutas caminando, <strong>Ver en 3D</strong> para la montaña y <strong>Toda Medellín</strong> para comparar.</span></li>
            </ol>
            <button type="button" onClick={cerrarAyuda} className="boton boton-1 mt-6 w-full justify-center !py-3 !text-base">
              Entendido, ver el mapa
            </button>
          </div>
        )}

        {/* Más opciones */}
        {masOpciones && (
          <aside aria-label="Más opciones del mapa" className="absolute inset-y-0 left-0 z-30 w-full max-w-sm overflow-y-auto overscroll-contain bg-papel p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold [font-stretch:110%]">Más opciones</h2>
              <button type="button" onClick={() => setMasOpciones(false)} className="flex items-center gap-1 rounded-xl border border-nivel bg-superficie px-3 py-2 text-base font-medium">
                <Icono nombre="cerrar" className="h-5 w-5" /> Cerrar
              </button>
            </div>
            <PanelCapas
              modo={modo}
              activas={activas}
              cargando={estados}
              onCambiar={alternarCapa}
              colorBarrios={colorBarrios}
              onColorBarrios={setColorBarrios}
              filtroSiniestros={filtroSin}
              onFiltroSiniestros={setFiltroSin}
              filtroHuecos={filtroHue}
              onFiltroHuecos={setFiltroHue}
            />
            <section className="mt-8 border-t border-nivel pt-4">
              <h3 className="mb-2 text-lg font-bold">Leyenda</h3>
              <Leyenda bloques={leyenda} />
            </section>
            <button type="button" onClick={() => setReencuadre((n) => n + 1)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-nivel bg-superficie px-4 py-3 text-base font-semibold">
              <Icono nombre="inicio" className="h-5 w-5" /> Centrar el mapa otra vez
            </button>
          </aside>
        )}
      </div>

      {/* ¿Cómo llego? */}
      {ruteo && (
        <aside
          aria-label="Rutas caminando"
          className={`absolute inset-x-0 bottom-0 z-40 max-h-[62%] overflow-y-auto overscroll-contain rounded-t-3xl bg-papel p-5 shadow-2xl md:static md:z-auto md:max-h-none md:w-[26rem] md:shrink-0 md:rounded-none md:border-l md:border-nivel md:shadow-none ${solo ? "!hidden" : ""}`}
        >
          <PanelRuteo clic={clicRuta} onGeo={onGeoRuta} onEncuadrar={onEncuadrarRuta} onCerrar={alternarRuteo} />
        </aside>
      )}

      {/* Ficha */}
      {!ruteo && contenidoFicha && (
        <aside
          aria-label="Ficha"
          className={`absolute inset-x-0 bottom-0 z-40 max-h-[62%] overflow-y-auto overscroll-contain rounded-t-3xl bg-papel p-5 shadow-2xl md:static md:z-auto md:max-h-none md:w-[26rem] md:shrink-0 md:rounded-none md:border-l md:border-nivel md:shadow-none ${solo ? "!hidden" : ""}`}
        >
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={cerrarFicha} className="flex items-center gap-1 rounded-xl border border-nivel bg-superficie px-3 py-2 text-base font-medium hover:bg-papel-hondo">
              <Icono nombre="cerrar" className="h-5 w-5" /> Cerrar
            </button>
          </div>
          {contenidoFicha}
          {vecinos && (
            <div className="mt-5 rounded-2xl bg-papel-hondo p-4 text-[0.95rem]">
              {preguntaActual && <p className="font-semibold">{preguntaActual.pregunta}</p>}
              <p className="mt-1 text-tinta-suave">{preguntaActual ? preguntaActual.cobertura : "Elige una pregunta en el mapa para ver qué dice el dato y qué no."}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {historiaActual && <Link to={`/historias/${historiaActual.id}`} className="siguiente-a">Leer la historia: {historiaActual.titulo}</Link>}
                {preguntaActual && <Link to={preguntaActual.tecnica.to} className="siguiente-a">{preguntaActual.tecnica.texto} (OTEA Técnico)</Link>}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
