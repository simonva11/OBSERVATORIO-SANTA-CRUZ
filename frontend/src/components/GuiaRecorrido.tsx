import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PASOS, useRecorrido } from "../lib/recorrido";

/**
 * Barra del recorrido de presentación. Aparece abajo mientras el recorrido está activo; cada botón abre la página real.
 * Teclado: Mayúscula + → siguiente, Mayúscula + ← anterior (fuera de campos de texto). «Ocultar» la deja como un
 * botón pequeño para grabar la pantalla sin estorbo.
 */
export default function GuiaRecorrido() {
  const [paso, setPaso] = useRecorrido();
  const [mini, setMini] = useState(false);
  const ir = useNavigate();
  const { pathname, search } = useLocation();

  const mover = (n: number) => {
    const k = Math.min(PASOS.length - 1, Math.max(0, n));
    setPaso(k);
    ir(PASOS[k].ruta);
  };

  useEffect(() => {
    if (paso == null) return;
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!e.shiftKey || t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); mover(paso + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); mover(paso - 1); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });

  if (paso == null) return null;
  const p = PASOS[paso];
  const aqui = `${pathname}${search}` === p.ruta || pathname === p.ruta.split("?")[0];

  if (mini) {
    return (
      <button type="button" onClick={() => setMini(false)} className="guia-mini" aria-label={`Mostrar el recorrido, paso ${paso + 1} de ${PASOS.length}`}>
        {paso + 1}/{PASOS.length}
      </button>
    );
  }
  return (
    <aside className="guia" aria-label="Recorrido de presentación" aria-live="polite">
      <div className="min-w-0 flex-1">
        <p className="mono text-[0.68rem] uppercase tracking-[0.06em] text-white/70">Recorrido · paso {paso + 1} de {PASOS.length} · {p.segundos} s</p>
        <p className="font-semibold leading-tight">{p.titulo}</p>
        <p className="mt-0.5 text-[0.85rem] leading-snug text-white/80">{p.mostrar}</p>
        {!aqui && <button type="button" onClick={() => ir(p.ruta)} className="mt-1 text-[0.85rem] font-semibold underline">Volver a la página de este paso</button>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => mover(paso - 1)} disabled={paso === 0} className="guia-boton" aria-label="Paso anterior">←</button>
        {paso < PASOS.length - 1 ? (
          <button type="button" onClick={() => mover(paso + 1)} className="guia-boton guia-boton-1">Siguiente →</button>
        ) : (
          <button type="button" onClick={() => setPaso(null)} className="guia-boton guia-boton-1">Terminar</button>
        )}
        <button type="button" onClick={() => setMini(true)} className="guia-boton" title="Ocultar para grabar">Ocultar</button>
        <button type="button" onClick={() => setPaso(null)} className="guia-boton" aria-label="Salir del recorrido">✕</button>
      </div>
    </aside>
  );
}
