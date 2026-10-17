import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Position } from "geojson";
import { useDatos } from "../lib/datos";
import { useProyeccion } from "../lib/proyeccion";
import { puntoEn } from "../lib/geo";
import { dec, num } from "../lib/formato";
import type { Coleccion, Props } from "../lib/tipos";
import { Fuente } from "../components/Pagina";
import { urlDe } from "../components/ciudadano/Compartir";

/* =====================================================================================================
 * «Mi cuadra, mi minuto» y «Antes de arrendar».
 * Cada manzana del Censo 2018 ya tiene calculados por OTEA los minutos caminando, por la red real de calles,
 * andenes y escaleras con la pendiente, hasta el Metro, el colegio, la salud, el parque, la biblioteca y la cancha
 * más cercanos (manzanas.geojson). Aquí solo se eligen y se cuentan. La ficha de arrendar cruza el centro de la
 * manzana con las zonas de amenaza, riesgo no mitigable y tratamiento del POT. Todo es a escala de manzana: no hay
 * direcciones ni datos de ninguna persona.
 * ===================================================================================================== */

const ANCHO = 360;
const ALTO = 420;

type Manzana = {
  id: string;
  barrio: string;
  personas: number;
  d: string;
  centro: [number, number];
  lonlat: [number, number];
  p: Props;
};

const DESTINOS: { k: string; t: string; color: string }[] = [
  { k: "colegio", t: "Colegio", color: "#ffd166" },
  { k: "salud", t: "Centro de salud", color: "#ff8a80" },
  { k: "parque", t: "Parque o zona verde", color: "#8fe0a8" },
  { k: "biblioteca", t: "Biblioteca", color: "#c7b8ff" },
  { k: "deporte", t: "Cancha o gimnasio", color: "#7fd8e6" },
];

const tono = (min: number | null) => (min == null ? "rgb(var(--nivel))" : min <= 10 ? "#4c8fd9" : min <= 15 ? "#1d5aa8" : "#0b2b52");
const limpio = (s: unknown) => {
  const t = String(s ?? "").trim();
  return !t || /sin informaci/i.test(t) ? null : t.replace(/, Medellin$/i, "");
};

function centroide(anillo: Position[]): [number, number] {
  let x = 0, y = 0;
  for (const p of anillo) { x += p[0]; y += p[1]; }
  return [x / anillo.length, y / anillo.length];
}

export default function MiLugar() {
  const [params, setParams] = useSearchParams();
  const modo = params.get("modo") === "arrendar" ? "arrendar" : "minuto";
  const elegido = params.get("m") ?? "";
  const proy = useProyeccion(ANCHO, ALTO, 10);
  const manzanas = useDatos<Coleccion>("manzanas.geojson");
  const amenaza = useDatos<Coleccion>("amenaza_movimiento_masa.geojson");
  const riesgo = useDatos<Coleccion>("riesgo_no_mitigable.geojson");
  const tratamientos = useDatos<Coleccion>("tratamientos.geojson");
  const oferta = useDatos<Coleccion>("oferta_inmobiliaria.geojson");
  const [aviso, setAviso] = useState("");

  const lista = useMemo<Manzana[]>(() => {
    if (!proy || manzanas.estado !== "listo") return [];
    return manzanas.datos.features.flatMap((f) => {
      if (f.geometry.type !== "Polygon") return [];
      const anillo = f.geometry.coordinates[0];
      const c = centroide(anillo);
      const d = "M" + anillo.map((p) => proy.xy(p).map((n) => n.toFixed(1)).join(",")).join("L") + "Z";
      const [cx, cy] = proy.xy(c);
      return [{ id: String(f.properties?.codigo_dane), barrio: String(f.properties?.barrio), personas: Number(f.properties?.personas ?? 0), d, centro: [cx, cy] as [number, number], lonlat: c, p: f.properties ?? {} }];
    });
  }, [proy, manzanas]);

  const m = lista.find((x) => x.id === elegido);
  const elegir = (id: string) => setParams((q) => { q.set("m", id); return q; }, { replace: true });
  const cambiarModo = (x: "minuto" | "arrendar") => setParams((q) => { if (x === "arrendar") q.set("modo", "arrendar"); else q.delete("modo"); return q; }, { replace: true });

  // Una cuadra típica por barrio (la de minutos al Metro en la mitad), para quien elige desde la lista.
  const tipicas = useMemo(() => {
    const por = new Map<string, Manzana[]>();
    for (const x of lista) por.set(x.barrio, [...(por.get(x.barrio) ?? []), x]);
    return [...por.entries()].map(([barrio, xs]) => {
      const orden = [...xs].sort((a, b) => Number(a.p.t_transporte_masivo) - Number(b.p.t_transporte_masivo));
      return { barrio, id: orden[Math.floor(orden.length / 2)].id };
    }).sort((a, b) => a.barrio.localeCompare(b.barrio, "es"));
  }, [lista]);

  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(""), 3000); return () => clearTimeout(t); }, [aviso]);

  const ficha = useMemo(() => {
    if (!m) return null;
    const [lon, lat] = m.lonlat;
    const dentro = (c: typeof amenaza) => (c.estado === "listo" ? c.datos.features.filter((f) => puntoEn(lon, lat, f.geometry)) : []);
    const am = dentro(amenaza)[0]?.properties?.grado as string | undefined;
    const rnm = dentro(riesgo)[0]?.properties;
    const tr = dentro(tratamientos)[0]?.properties?.tratamiento as string | undefined;
    const avisos = oferta.estado === "listo" ? oferta.datos.features.filter((f) => f.properties?.barrio === m.barrio) : [];
    return { amenaza: am ?? null, riesgo: rnm ?? null, tratamiento: tr ?? null, avisos: avisos.length, cargando: amenaza.estado !== "listo" || riesgo.estado !== "listo" || tratamientos.estado !== "listo" };
  }, [m, amenaza, riesgo, tratamientos, oferta]);

  const metro = m ? Number(m.p.t_transporte_masivo) : null;
  const estacion = m ? limpio(m.p.d_transporte_masivo) : null;
  const rodeo = m ? Number(m.p.rodeo_transporte) : null;

  const mensaje = m
    ? `Desde mi cuadra en ${m.barrio} camino ${dec(metro)} min hasta el Metro${estacion ? ` (${estacion})` : ""}, ${dec(Number(m.p.t_colegio))} al colegio y ${dec(Number(m.p.t_salud))} al centro de salud, por las calles y escaleras de verdad (cálculo de OTEA). Mira la tuya:`
    : "";
  const enlace = m ? urlDe(`/mi-lugar?m=${m.id}${modo === "arrendar" ? "&modo=arrendar" : ""}`) : "";

  const guardarTarjeta = () => {
    if (!m) return;
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1350;
    const g = c.getContext("2d");
    if (!g) return;
    const grad = g.createLinearGradient(0, 0, 0, 1350);
    grad.addColorStop(0, "#0d1e5c"); grad.addColorStop(1, "#1f40cc");
    g.fillStyle = grad; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = "rgba(255,255,255,0.75)"; g.font = "600 38px 'DM Sans', sans-serif";
    g.fillText(`Desde mi cuadra en ${m.barrio}`, 80, 150);
    g.fillStyle = "#fff"; g.font = "800 240px 'Bricolage Grotesque', 'DM Sans', sans-serif";
    g.fillText(`${dec(metro)}`, 70, 400);
    g.font = "700 64px 'DM Sans', sans-serif"; g.fillText("minutos al Metro", 80, 480);
    if (estacion) { g.font = "500 36px 'DM Sans', sans-serif"; g.fillStyle = "rgba(255,255,255,0.8)"; g.fillText(estacion, 80, 535); }
    let y = 660;
    for (const d of DESTINOS.slice(0, 4)) {
      const v = Number(m.p[`t_${d.k}`]);
      g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(80, y - 62, 920, 96);
      g.fillStyle = "#fff"; g.font = "600 44px 'DM Sans', sans-serif"; g.fillText(d.t, 115, y);
      g.font = "800 52px 'DM Sans', sans-serif"; const t = `${dec(v)} min`; g.fillText(t, 965 - g.measureText(t).width, y);
      y += 130;
    }
    g.fillStyle = "rgba(255,255,255,0.7)"; g.font = "500 30px 'DM Sans', sans-serif";
    g.fillText("Caminando por calles, andenes y escaleras, con la pendiente.", 80, 1215);
    g.fillText("Cálculo de OTEA con el Censo 2018 · Santa Cruz, Comuna 2", 80, 1260);
    g.fillStyle = "#fff"; g.font = "800 44px 'Bricolage Grotesque', sans-serif"; g.fillText("OTEA", 880, 150);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png"); a.download = `mi-cuadra-${m.barrio.toLowerCase().replace(/\s+/g, "-")}.png`; a.click();
    setAviso("Tarjeta guardada en tus descargas.");
  };

  return (
    <div className="ciu">
      <div className="ciu-ancho pb-16 pt-8">
        <nav aria-label="Ruta" className="migas"><Link to="/">Inicio</Link><span aria-hidden="true">/</span><span aria-current="page" className="text-tinta">Mi cuadra</span></nav>
        <h1 className="ciu-h1 mt-4 max-w-[18ch]">{modo === "arrendar" ? "Antes de arrendar, mira la cuadra" : "Mi cuadra, mi minuto"}</h1>
        <p className="ciu-lead">
          {modo === "arrendar"
            ? "Toca la cuadra del lugar que piensas arrendar o comprar: OTEA te dice cuánto se camina a lo básico y qué dice el POT sobre el riesgo de esa zona."
            : "Toca tu cuadra en el mapa. OTEA te dice cuántos minutos caminas de verdad, subiendo y bajando la ladera, hasta el Metro, el colegio y el centro de salud."}
        </p>

        <div role="tablist" aria-label="Qué quieres ver" className="mt-6 inline-flex rounded-full bg-papel-hondo p-1">
          {([["minuto", "Mi cuadra, mi minuto"], ["arrendar", "Antes de arrendar"]] as const).map(([k, t]) => (
            <button key={k} role="tab" aria-selected={modo === k} type="button" onClick={() => cambiarModo(k)}
              className={`rounded-full px-4 py-2 text-[0.95rem] font-semibold transition-colors ${modo === k ? "bg-tinta text-papel" : "text-tinta-suave hover:text-tinta"}`}>{t}</button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="lugar-mapa">
            {!proy || manzanas.estado !== "listo" ? (
              <div className="grid aspect-[360/420] place-items-center text-sm text-tinta-suave" role="status">Cargando las 523 manzanas…</div>
            ) : (
              <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="group" aria-label="Mapa de las manzanas de Santa Cruz. Toca una para ver sus minutos.">
                {lista.map((x) => (
                  <path key={x.id} d={x.d} data-m={x.id} onClick={() => elegir(x.id)} className="lugar-manzana" style={{ fill: tono(Number(x.p.t_transporte_masivo)) }}>
                    <title>{`${x.barrio}: ${dec(Number(x.p.t_transporte_masivo))} min al Metro`}</title>
                  </path>
                ))}
                {proy.items.map((b) => <path key={b.codigo} d={b.d} className="lugar-barrio" />)}
                {proy.items.map((b) => (
                  <text key={`t${b.codigo}`} x={b.centro[0]} y={b.centro[1]} textAnchor="middle" className="lugar-etiqueta">{b.nombre.replace("Playón de Los Comuneros", "Playón").replace("Villa del Socorro", "V. Socorro")}</text>
                ))}
                {m && (
                  <g className="pointer-events-none">
                    <path d={m.d} className="lugar-elegida" />
                    <circle cx={m.centro[0]} cy={m.centro[1]} r="9" className="lugar-pulso" />
                    <circle cx={m.centro[0]} cy={m.centro[1]} r="4.5" className="lugar-punto" />
                  </g>
                )}
              </svg>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.82rem] text-tinta-suave">
              <span className="font-semibold">Minutos caminando al Metro:</span>
              {[["#4c8fd9", "10 o menos"], ["#1d5aa8", "10 a 15"], ["#0b2b52", "más de 15"]].map(([c, t]) => (
                <span key={t} className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm" style={{ background: c }} aria-hidden="true" />{t}</span>
              ))}
            </div>
            <label className="etiqueta-campo mt-4" htmlFor="lugar-barrio">¿No encuentras tu cuadra? Elige tu barrio</label>
            <select id="lugar-barrio" className="campo !py-3 !text-base" value="" onChange={(e) => e.target.value && elegir(e.target.value)}>
              <option value="">Una cuadra típica de…</option>
              {tipicas.map((t) => <option key={t.barrio} value={t.id}>{t.barrio}</option>)}
            </select>
          </div>

          <div aria-live="polite">
            {!m ? (
              <div className="lugar-vacio">
                <p className="ciu-h3">Toca una cuadra del mapa</p>
                <p className="mt-2 text-tinta-suave">Los colores muestran cuánto se camina al Metro o al Metrocable. Cada cuadra tiene su cálculo, hecho sobre la red real de calles, andenes y escaleras.</p>
              </div>
            ) : modo === "minuto" ? (
              <article className="lugar-tarjeta">
                <p className="lugar-ojo">Desde una cuadra de {m.barrio}</p>
                <p className="lugar-cifra">{dec(metro)}<span> min</span></p>
                <p className="text-[1.15rem] font-semibold">caminando hasta el Metro{estacion ? ` · ${estacion}` : ""}</p>
                {rodeo != null && rodeo > 1.05 && (
                  <p className="lugar-rodeo">Por la ladera, el camino de verdad es <strong>{dec(rodeo)} veces</strong> más largo que la línea recta que mide un mapa común.</p>
                )}
                <ul className="mt-5 grid grid-cols-1 gap-2">
                  {DESTINOS.map((d) => {
                    const v = m.p[`t_${d.k}`];
                    const nombre = limpio(m.p[`d_${d.k}`]);
                    return (
                      <li key={d.k} className="lugar-fila">
                        <span aria-hidden="true" className="lugar-icono" style={{ background: d.color }} />
                        <span className="min-w-0 flex-1"><span className="block font-semibold">{d.t}</span>{nombre && <span className="block truncate text-[0.85rem] text-white/75">{nombre}</span>}</span>
                        <span className="text-[1.3rem] font-extrabold tabular-nums">{v == null ? "—" : `${dec(Number(v))} min`}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${mensaje} ${enlace}`)}`} target="_blank" rel="noopener noreferrer" className="boton ciu-wa">Compartir por WhatsApp</a>
                  <button type="button" onClick={guardarTarjeta} className="boton lugar-boton-claro">Guardar como imagen</button>
                </div>
                <p role="status" className="mt-2 min-h-[1.2rem] text-sm text-white/80">{aviso}</p>
              </article>
            ) : (
              <article className="lugar-ficha">
                <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-tinta-tenue">Ficha de la cuadra · {m.barrio}</p>
                <h2 className="ciu-h3 !text-[1.5rem]">Lo que conviene saber antes de arrendar o comprar</h2>
                <dl className="lugar-dl mt-4">
                  <div>
                    <dt>Amenaza por deslizamiento (POT)</dt>
                    <dd>{ficha?.cargando ? "Cargando…" : <span className={`lugar-nivel lugar-nivel-${(ficha?.amenaza ?? "sin").toLowerCase()}`}>{ficha?.amenaza ? `Amenaza ${ficha.amenaza.toLowerCase()}` : "Fuera de las zonas marcadas"}</span>}</dd>
                  </div>
                  <div>
                    <dt>Zona con condiciones de riesgo</dt>
                    <dd>{ficha?.cargando ? "Cargando…" : ficha?.riesgo ? <span className="lugar-nivel lugar-nivel-alta">Sí: {String(ficha.riesgo.descripcion ?? "condiciones de riesgo").toLowerCase()}</span> : "No, según el POT"}</dd>
                  </div>
                  <div><dt>Tratamiento urbano del POT</dt><dd>{ficha?.tratamiento ?? "Sin dato para esta cuadra"}</dd></div>
                  <div><dt>Metro o Metrocable</dt><dd><strong>{dec(metro)} min</strong> caminando{estacion ? ` · ${estacion}` : ""}</dd></div>
                  <div><dt>Colegio · salud · parque</dt><dd>{dec(Number(m.p.t_colegio))} · {dec(Number(m.p.t_salud))} · {dec(Number(m.p.t_parque))} min</dd></div>
                  <div><dt>Gente en la manzana</dt><dd>{num(m.personas)} personas (Censo 2018)</dd></div>
                  <div><dt>Avisos de venta o arriendo publicados</dt><dd>{ficha ? `${num(ficha.avisos)} en ${m.barrio} en 2023` : "—"} · <Link to="/inmobiliario" className="underline">ver el mercado</Link></dd></div>
                </dl>
                <p className="mt-4 rounded-xl bg-papel-hondo p-3 text-[0.88rem] text-tinta-suave">Es una guía, no un certificado: el riesgo de una casa concreta lo define un estudio técnico o el concepto de la Alcaldía (DAGRD). Los precios publicados en 2023 son pocos y no sirven como avalúo.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Ficha de una cuadra de ${m.barrio} en OTEA: amenaza ${ficha?.amenaza?.toLowerCase() ?? "fuera de zonas marcadas"} según el POT, ${dec(metro)} min caminando al Metro. Mírala:`)} ${encodeURIComponent(enlace)}`} target="_blank" rel="noopener noreferrer" className="boton ciu-wa">Enviar la ficha por WhatsApp</a>
                  <Link to="/mapa-vecinos?pregunta=riesgo" className="boton boton-2">Ver el riesgo en el mapa</Link>
                </div>
              </article>
            )}
            <div className="mt-4 space-y-1.5">
              <Fuente ids={["manzanas_censo", "vias"]} calculo="minutos caminando por manzana, calculados por OTEA" />
              {modo === "arrendar" && <Fuente ids={["amenaza_movimiento_masa", "tratamientos"]} />}
            </div>
            <details className="metodo mt-3">
              <summary>Cómo se calculó</summary>
              <div className="metodo-cuerpo">
                <p>Desde cada manzana del Censo 2018 se busca el camino más corto por la red de calles, andenes y escaleras hasta el destino más cercano de cada tipo. La velocidad baja con la pendiente (fórmula de Tobler, unos 5 km/h en plano). Una persona mayor o con un coche de bebé puede tardar más.</p>
                <p>«Veces más largo que la línea recta» compara ese camino con la distancia en línea recta hasta la estación.</p>
                <p>La ficha de arrendar cruza el centro de la manzana con las capas del POT: amenaza por movimiento en masa, zonas con condiciones de riesgo y tratamientos urbanos.</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
