import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cargar } from "../lib/datos";
import type { Indicadores } from "../lib/tipos";
import IconoNav from "./IconosNav";
import { GRUPOS } from "../lib/menu";
import { HISTORIAS } from "../lib/ciudadano";
import { PREGUNTAS_MAPA } from "../lib/preguntas";

type Opcion = { id: string; nombre: string; detalle: string; icono: string; ruta: string; grupo?: string; claves?: string };

/** Palabras con que la gente busca cada tema (no aparecen en pantalla). */
const CLAVES_HISTORIA: Record<string, string> = {
  "movilidad-mayores": "metro metrocable caminar escaleras lomas personas mayores abuelos viejitos adultos transporte estación bus",
  basuras: "basura basuras residuos aseo reciclaje quebradas toneladas limpieza escombros",
  huecos: "huecos hueco calles andenes vías daños pavimento reportes",
  "espacio-publico": "parques parque canchas cancha espacio público plazas jugar niños deporte",
};

const ATAJOS: Opcion[] = [
  { id: "m-seg", nombre: "Mapa: seguridad", detalle: "Atajo a las capas de seguridad", icono: "mapa", ruta: "/mapa?capas=mortalidad_vial,camaras_cctv,semaforos", grupo: "Explorar" },
  { id: "m-49", nombre: "Mapa: eje de la Carrera 49", detalle: "Atajo a la capa del eje", icono: "mapa", ruta: "/mapa?capas=eje49", grupo: "Explorar" },
];

/** Vista ciudadana: la portada y las cuatro historias, primero porque es lo que busca la mayoría. */
const CIUDADANAS: Opcion[] = [
  { id: "/", nombre: "Así vivimos Santa Cruz (vista ciudadana)", detalle: "La portada para vecinos", icono: "inicio", ruta: "/", grupo: "Para vecinos" },
  { id: "/mi-lugar", nombre: "Mi cuadra, mi minuto", detalle: "Cuánto caminas de verdad al Metro, al colegio y a la salud", icono: "accesibilidad", ruta: "/mi-lugar", grupo: "Para vecinos", claves: "minutos casa caminar metro arrendar arriendo comprar vivienda riesgo cuadra" },
  { id: "/barrios-ciu", nombre: "Mi barrio", detalle: "Los 11 barrios, cada uno con su ficha", icono: "personas", ruta: "/barrios", grupo: "Para vecinos" },
  { id: "/participacion-ciu", nombre: "Compartir una problemática", detalle: "Prueba: queda en tu dispositivo y la puedes mandar por WhatsApp", icono: "participacion", ruta: "/participacion", grupo: "Para vecinos" },
  { id: "/mapa-vecinos", nombre: "El mapa de Santa Cruz (para vecinos)", detalle: "Metro, huecos, parques, colegios y más, sobre el mapa", icono: "mapa", ruta: "/mapa-vecinos", grupo: "Para vecinos" },
  ...HISTORIAS.map((h) => ({ id: `h-${h.id}`, nombre: h.titulo, detalle: h.pregunta, icono: "alerta", ruta: `/historias/${h.id}`, grupo: "Para vecinos", claves: `${h.frase} ${CLAVES_HISTORIA[h.id] ?? ""}` })),
];

/** Preguntas cotidianas: abren el mapa para vecinos con las capas que las responden. */
const PREGUNTAS: Opcion[] = PREGUNTAS_MAPA.map((p) => ({ id: `p-${p.id}`, nombre: p.pregunta, detalle: "Abrir el mapa con esta pregunta", icono: "mapa", ruta: `/mapa-vecinos?pregunta=${p.id}`, grupo: "Preguntas en el mapa" }));

/** Los módulos salen del menú, en el mismo orden y con las mismas categorías. Los atajos van con el Mapa. */
const FIJAS: Opcion[] = GRUPOS.flatMap((g) => {
  const ops: Opcion[] = g.modulos.map((m) => ({ id: m.ruta, nombre: m.nombre, detalle: m.detalle, icono: m.icono, ruta: m.ruta, grupo: g.titulo }));
  return g.id === "explorar" ? [...ops.slice(0, 2), ...ATAJOS, ...ops.slice(2)] : ops;
});
const TODAS_FIJAS = [...CIUDADANAS, ...FIJAS];

/** Conceptos que la gente busca por su nombre: llevan a la página donde se explican con datos. */
const CONCEPTOS: Opcion[] = [
  ["POT", "Plan de Ordenamiento Territorial: tratamientos e instrumentos por barrio", "cubo", "/inmobiliario"],
  ["Amenaza por movimiento en masa", "Zonas de ladera donde el POT marca amenaza alta, media o baja", "ladera", "/riesgo"],
  ["Riesgo no mitigable", "Zonas donde el POT dice que el riesgo no se puede reducir con obras", "ladera", "/riesgo"],
  ["Espacio público por habitante", "Metros cuadrados por persona frente a la meta nacional de 15", "indicadores", "/indicadores"],
  ["Derecho de petición", "Carta para pedirle algo a la Alcaldía, con plazos de respuesta", "estrella", "/lideres"],
  ["Presupuesto Participativo", "Cómo se decide parte de la inversión de la comuna", "estrella", "/lideres"],
  ["Huecos", "Reportes del Sistema de Gestión Vial por barrio", "alerta", "/reclamos"],
  ["Toneladas de residuos", "Estimación mensual por barrio", "residuos", "/residuos"],
  ["Metrocable", "Minutos caminando hasta las estaciones", "accesibilidad", "/accesibilidad"],
  ["Andenes angostos", "Tramos de andén de menos de 1,2 m", "accesibilidad", "/accesibilidad"],
  ["Siniestros viales", "Choques y atropellos registrados en la comuna", "corredor", "/corredor-49"],
  ["Calidad de vida (IMCV)", "Índice de la Encuesta de Calidad de Vida por año", "indicadores", "/indicadores"],
  ["Personas mayores y el Metro", "Cuántas personas de 60 años o más viven lejos de una estación", "accesibilidad", "/historias/movilidad-mayores"],
  ["Basuras en el barrio", "Cuántas toneladas de residuos se estima que genera cada barrio", "residuos", "/historias/basuras"],
  ["Huecos en las calles", "Qué se ha reportado y qué tan rápido se arregla", "alerta", "/historias/huecos"],
  ["Parques y espacio público", "Cuánto espacio le toca a cada persona", "indicadores", "/historias/espacio-publico"],
  ["Licencia de los datos", "Condiciones de uso de cada fuente", "fuentes", "/fuentes"],
].map(([n, d, i, r]) => ({ id: `c-${n}`, nombre: n, detalle: d, icono: i, ruta: r, grupo: "Conceptos" }));

const sin = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Buscador rápido (Ctrl + K): saltar a cualquier módulo o barrio sin recorrer el menú. */
export default function Paleta({ abierta, onCerrar, ciudadana = false }: { abierta: boolean; onCerrar: () => void; ciudadana?: boolean }) {
  const [todo, setTodo] = useState(false);
  const sencilla = ciudadana && !todo;
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [barrios, setBarrios] = useState<Opcion[]>([]);
  const ir = useNavigate();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierta) return;
    setQ("");
    setSel(0);
    setTodo(false);
    setTimeout(() => input.current?.focus(), 30);
    cargar<Indicadores>("indicadores.json")
      .then((d) => setBarrios(d.barrios.map((b) => ({ id: `b-${b.codigo}`, nombre: b.nombre, detalle: "Ficha del barrio", icono: "personas", ruta: `/barrios/${b.codigo}`, grupo: "Barrios" }))))
      .catch(() => undefined);
  }, [abierta]);

  const lista = useMemo(() => {
    const t = sin(q.trim());
    // Vista ciudadana: temas, preguntas, barrios y conceptos. Vista técnica (o «buscar en todo»): además los módulos.
    const base = sencilla ? [...CIUDADANAS, ...PREGUNTAS] : TODAS_FIJAS;
    const todas = sencilla ? [...base, ...barrios, ...CONCEPTOS] : [...base, ...PREGUNTAS, ...barrios, ...CONCEPTOS];
    // Sin texto se ve el menú completo, agrupado; al escribir, los resultados quedan agrupados igual.
    return t ? todas.filter((o) => sin(`${o.nombre} ${o.detalle} ${o.grupo ?? ""} ${o.claves ?? ""}`).includes(t)) : base;
  }, [q, barrios, sencilla]);

  if (!abierta) return null;
  const abrir = (o: Opcion | undefined) => {
    if (!o) return;
    onCerrar();
    ir(o.ruta);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center bg-[rgb(16_23_41/0.45)] px-4 pt-[12vh]" onMouseDown={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Buscar en el observatorio" className="w-full max-w-xl overflow-hidden rounded-xl border border-nivel bg-superficie shadow-[0_30px_60px_-20px_rgb(16_23_41/0.45)]" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape" && e.target !== input.current) onCerrar(); }}>
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCerrar();
            else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(lista.length - 1, s + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
            else if (e.key === "Enter") abrir(lista[sel]);
          }}
          placeholder={sencilla ? "¿Qué quieres saber? Prueba: huecos, Metro, basuras o tu barrio" : "Busca un barrio, un tema (POT, huecos, riesgo…) o un módulo"}
          aria-label="Buscar"
          className="w-full border-b border-nivel bg-superficie px-5 py-4 text-lg text-tinta outline-none"
        />
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {lista.length === 0 && <li className="px-3 py-6 text-center text-tinta-suave">No encontramos eso. Prueba con el nombre de un barrio o un tema como “riesgo” o “huecos”.</li>}
          {lista.map((o, i) => (
            <li key={o.id} role="presentation">
              {o.grupo && o.grupo !== lista[i - 1]?.grupo && (
                <p className="mono px-3 pb-1 pt-3 text-[0.68rem] uppercase tracking-[0.06em] text-tinta-tenue first:pt-1">{o.grupo}</p>
              )}
              <button type="button" onMouseEnter={() => setSel(i)} onClick={() => abrir(o)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === sel ? "bg-papel-hondo" : ""}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-papel-hondo text-tinta"><IconoNav nombre={o.icono} className="h-5 w-5" trazo={1.8} /></span>
                <span className="min-w-0"><span className="block font-semibold leading-tight">{o.nombre}</span><span className="block text-sm text-tinta-suave">{o.detalle}</span></span>
              </button>
            </li>
          ))}
          {sencilla && (
            <li role="presentation" className="px-3 pb-1 pt-3">
              <button type="button" onClick={() => { setTodo(true); input.current?.focus(); }} className="text-sm font-semibold text-marca underline">Buscar también en OTEA Técnico (módulos y conceptos)</button>
            </li>
          )}
        </ul>
        <p className="mono border-t border-nivel bg-papel px-4 py-2 text-[0.7rem] text-tinta-tenue">↑ ↓ para moverte, Enter para abrir, Esc para cerrar</p>
      </div>
    </div>
  );
}
