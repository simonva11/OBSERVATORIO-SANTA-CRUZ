import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cargar } from "../lib/datos";
import type { Indicadores } from "../lib/tipos";
import IconoNav from "./IconosNav";
import { GRUPOS } from "../lib/menu";

type Opcion = { id: string; nombre: string; detalle: string; icono: string; ruta: string; grupo?: string };

const ATAJOS: Opcion[] = [
  { id: "m-seg", nombre: "Mapa: seguridad", detalle: "Atajo a las capas de seguridad", icono: "mapa", ruta: "/mapa?capas=mortalidad_vial,camaras_cctv,semaforos", grupo: "Territorio" },
  { id: "m-49", nombre: "Mapa: eje de la Carrera 49", detalle: "Atajo a la capa del eje", icono: "mapa", ruta: "/mapa?capas=eje49", grupo: "Territorio" },
];

/** Los módulos salen del menú, en el mismo orden y con las mismas categorías. Los atajos van con el Mapa. */
const FIJAS: Opcion[] = GRUPOS.flatMap((g) => {
  const ops: Opcion[] = g.modulos.map((m) => ({ id: m.ruta, nombre: m.nombre, detalle: m.detalle, icono: m.icono, ruta: m.ruta, grupo: g.titulo }));
  return g.id === "territorio" ? [ops[0], ...ATAJOS, ...ops.slice(1)] : ops;
});

const sin = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Buscador rápido (Ctrl + K): saltar a cualquier módulo o barrio sin recorrer el menú. */
export default function Paleta({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [barrios, setBarrios] = useState<Opcion[]>([]);
  const ir = useNavigate();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierta) return;
    setQ("");
    setSel(0);
    setTimeout(() => input.current?.focus(), 30);
    cargar<Indicadores>("indicadores.json")
      .then((d) => setBarrios(d.barrios.map((b) => ({ id: `b-${b.codigo}`, nombre: b.nombre, detalle: "Ficha del barrio", icono: "personas", ruta: `/barrios/${b.codigo}`, grupo: "Barrios" }))))
      .catch(() => undefined);
  }, [abierta]);

  const lista = useMemo(() => {
    const t = sin(q.trim());
    const todas = [...FIJAS, ...barrios];
    // Sin texto se ve el menú completo, agrupado; al escribir, los resultados quedan agrupados igual.
    return t ? todas.filter((o) => sin(`${o.nombre} ${o.detalle} ${o.grupo ?? ""}`).includes(t)) : FIJAS;
  }, [q, barrios]);

  if (!abierta) return null;
  const abrir = (o: Opcion | undefined) => {
    if (!o) return;
    onCerrar();
    ir(o.ruta);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center bg-[#14104a]/45 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Buscar en el observatorio" className="w-full max-w-lg overflow-hidden rounded-2xl bg-superficie shadow-2xl ring-1 ring-black/10" onMouseDown={(e) => e.stopPropagation()}>
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
          placeholder="Ir a un módulo o un barrio…"
          aria-label="Buscar"
          className="w-full border-b border-nivel px-5 py-4 text-lg outline-none"
        />
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {lista.length === 0 && <li className="px-3 py-6 text-center text-tinta-suave">No hay nada con ese nombre.</li>}
          {lista.map((o, i) => (
            <li key={o.id} role="presentation">
              {o.grupo && o.grupo !== lista[i - 1]?.grupo && (
                <p className="px-3 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-tinta-tenue first:pt-1">{o.grupo}</p>
              )}
              <button type="button" onMouseEnter={() => setSel(i)} onClick={() => abrir(o)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === sel ? "bg-menta" : ""}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-acento/10 text-marca"><IconoNav nombre={o.icono} className="h-5 w-5" trazo={1.8} /></span>
                <span className="min-w-0"><span className="block font-semibold leading-tight">{o.nombre}</span><span className="block text-sm text-tinta-suave">{o.detalle}</span></span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-nivel bg-papel px-4 py-2 text-xs text-tinta-tenue">↑ ↓ para moverte, Enter para abrir, Esc para cerrar</p>
      </div>
    </div>
  );
}
