import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import IconoNav from "./IconosNav";
import Paleta from "./Paleta";
import { ACENTOS } from "../lib/marca";
import { GRUPOS, grupoDeRuta, type ModuloMenu } from "../lib/menu";

export function Logo({ className = "" }: { className?: string }) {
  // Curvas de nivel de una ladera con la línea de un cable aéreo encima.
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#3d2fa8" />
      <path d="M2 34 C12 30 18 22 38 20" stroke="#a8cbb6" strokeWidth="1.6" fill="none" />
      <path d="M2 38 C14 34 22 28 38 27" stroke="#a8cbb6" strokeWidth="1.6" fill="none" />
      <path d="M4 26 L36 8" stroke="#f5f6f2" strokeWidth="1.6" />
      <rect x="17" y="15" width="6" height="5" rx="1" fill="#f5f6f2" />
      <path d="M20 13.5 V15" stroke="#f5f6f2" strokeWidth="1.4" />
      <defs><linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6a4fe0" /><stop offset="1" stopColor="#1d4f9a" /></linearGradient></defs>
      <rect width="40" height="40" rx="9" fill="url(#logo-g)" />
      <path d="M2 34 C12 30 18 22 38 20" stroke="#c9c2ff" strokeWidth="1.6" fill="none" />
      <path d="M2 38 C14 34 22 28 38 27" stroke="#c9c2ff" strokeWidth="1.6" fill="none" />
      <path d="M4 26 L36 8" stroke="#f6f6fc" strokeWidth="1.6" />
      <rect x="17" y="15" width="6" height="5" rx="1" fill="#f6f6fc" />
      <path d="M20 13.5 V15" stroke="#f6f6fc" strokeWidth="1.4" />
    </svg>
  );
}

const CLAVE_GRUPOS = "observatorio-santa-cruz:menu-grupos";

/** Categorías abiertas. El grupo del módulo en el que se está se abre solo; el resto se recuerda. */
function useGruposAbiertos(pathname: string) {
  const [abiertos, setAbiertos] = useState<string[]>(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_GRUPOS) ?? "[]");
      return Array.isArray(guardado) ? guardado : [];
    } catch {
      return [];
    }
  });
  const activo = grupoDeRuta(pathname);
  useEffect(() => {
    if (activo) setAbiertos((a) => (a.includes(activo) ? a : [...a, activo]));
  }, [activo]);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_GRUPOS, JSON.stringify(abiertos));
    } catch {
      /* sin almacenamiento */
    }
  }, [abiertos]);
  const alternar = (id: string) => setAbiertos((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  return { abiertos, alternar };
}

function ItemMenu({ m, compacta, onNavegar }: { m: ModuloMenu; compacta: boolean; onNavegar?: () => void }) {
  return (
    <NavLink
      to={m.ruta}
      end={m.ruta === "/"}
      onClick={onNavegar}
      title={compacta ? m.nombre : undefined}
      aria-label={m.nombre}
      style={({ isActive }) => (isActive ? { backgroundImage: `linear-gradient(135deg, ${ACENTOS.violeta.medio}, ${ACENTOS.violeta.vivo})` } : undefined)}
      className={({ isActive }) =>
        `group relative flex items-center rounded-xl text-[0.95rem] transition-colors ${compacta ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"} ${
          isActive ? "text-white" : "text-tinta hover:bg-acento/10"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <IconoNav nombre={m.icono} className="h-6 w-6 shrink-0" trazo={isActive ? 2 : 1.7} />
          {!compacta && <span className={`flex-1 ${isActive ? "font-semibold" : ""}`}>{m.nombre}</span>}
          {m.fase && !compacta && (
            <span className={`flex items-center gap-1.5 text-[0.7rem] font-medium ${isActive ? "text-white/85" : "text-ambar-texto"}`}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ambar" />
              {m.fase}
            </span>
          )}
          {m.fase && compacta && <span aria-hidden="true" className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-[#6ab7ff]" />}
        </>
      )}
    </NavLink>
  );
}

function Navegacion({ onNavegar, compacta = false }: { onNavegar?: () => void; compacta?: boolean }) {
  const { pathname } = useLocation();
  const { abiertos, alternar } = useGruposAbiertos(pathname);
  return (
    <nav aria-label="Módulos" className="flex flex-col">
      {GRUPOS.map((g, i) => {
        // En la barra angosta (solo íconos) todos los módulos quedan a la vista, separados por una línea fina.
        const abierto = compacta || abiertos.includes(g.id);
        return (
          <div key={g.id} role="group" aria-label={g.titulo} className={i === 0 ? "" : compacta ? "mt-2 border-t border-nivel/70 pt-2" : "mt-2"}>
            {!compacta && (
              <button
                type="button"
                aria-expanded={abierto}
                aria-controls={`grupo-${g.id}`}
                onClick={() => alternar(g.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-tinta-tenue transition-colors hover:text-tinta"
              >
                {g.titulo}
                <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-4 w-4 transition-transform duration-200 ${abierto ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            )}
            {abierto && (
              <div id={`grupo-${g.id}`} className="flex flex-col gap-0.5">
                {g.modulos.map((m) => (
                  <ItemMenu key={m.ruta} m={m} compacta={compacta} onNavegar={onNavegar} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ------------------------------------------------------------------ modo noche
const CLAVE_TEMA = "observatorio-santa-cruz:tema";

/** Claro por defecto (se lee mejor al sol y al imprimir); el modo noche es una opción y se recuerda. */
export function useTema() {
  const [noche, setNoche] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_TEMA) === "noche";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("cambiando-tema");
    html.classList.toggle("noche", noche);
    const t = setTimeout(() => html.classList.remove("cambiando-tema"), 400);
    try {
      localStorage.setItem(CLAVE_TEMA, noche ? "noche" : "dia");
    } catch {
      /* sin almacenamiento */
    }
    return () => clearTimeout(t);
  }, [noche]);
  // Otras pantallas (el mapa) piden cambiar el tema con este evento, para que el sitio y el mapa siempre coincidan.
  useEffect(() => {
    const alternar = () => setNoche((v) => !v);
    window.addEventListener("alternar-tema", alternar);
    return () => window.removeEventListener("alternar-tema", alternar);
  }, []);
  return [noche, setNoche] as const;
}

/** Dice si el sitio está en modo noche, sin importar quién lo cambió. */
export function useNocheActiva() {
  const [noche, setNoche] = useState(() => document.documentElement.classList.contains("noche"));
  useEffect(() => {
    const html = document.documentElement;
    const leer = () => setNoche(html.classList.contains("noche"));
    leer();
    const o = new MutationObserver(leer);
    o.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => o.disconnect();
  }, []);
  return noche;
}

function BotonTema({ noche, onCambiar, compacta = false }: { noche: boolean; onCambiar: () => void; compacta?: boolean }) {
  return (
    <button type="button" onClick={onCambiar} aria-pressed={noche} title={noche ? "Cambiar a modo día" : "Cambiar a modo noche"}
      className={`flex w-full items-center rounded-xl py-2.5 text-base font-medium text-tinta-suave transition hover:bg-menta hover:text-tinta ${compacta ? "justify-center" : "gap-3 px-3"}`}>
      <IconoNav nombre={noche ? "sol" : "luna"} className="h-6 w-6 shrink-0" trazo={2} />
      {!compacta && (noche ? "Modo día" : "Modo noche")}
    </button>
  );
}

// ------------------------------------------------------------------ tamaño de la letra (A- / A+)
const CLAVE_NIVEL = "observatorio-santa-cruz:letra-nivel";
const CLAVE_LETRA_VIEJA = "observatorio-santa-cruz:letra-grande";
const CLAVE_BARRA = "observatorio-santa-cruz:barra-colapsada";
/** Porcentaje del tamaño de letra en cada nivel. */
const NIVELES = [100, 112, 124, 138];

function useLetra() {
  const [nivel, setNivel] = useState(() => {
    try {
      const n = localStorage.getItem(CLAVE_NIVEL);
      if (n != null) return Math.min(NIVELES.length - 1, Math.max(0, Number(n) || 0));
      return localStorage.getItem(CLAVE_LETRA_VIEJA) === "1" ? 2 : 0; // venía del botón anterior
    } catch {
      return 0;
    }
  });
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("letra-grande");
    html.style.fontSize = nivel === 0 ? "" : `${NIVELES[nivel]}%`;
    try {
      localStorage.setItem(CLAVE_NIVEL, String(nivel));
    } catch {
      /* sin almacenamiento */
    }
  }, [nivel]);
  return [nivel, setNivel] as const;
}

/** Botones A- y A+. Flotante en casi todas las páginas; dentro del menú en el mapa, donde esa esquina está ocupada. */
function LetraTamano({ nivel, onNivel, variante }: { nivel: number; onNivel: (n: number) => void; variante: "flotante" | "barra" }) {
  const base = "grid place-items-center rounded-full font-bold transition hover:bg-menta disabled:opacity-35 disabled:hover:bg-transparent";
  const botones = (
    <>
      <button type="button" aria-label="Hacer la letra más pequeña" title="Letra más pequeña" disabled={nivel === 0} onClick={() => onNivel(nivel - 1)} className={`${base} h-11 w-11 text-base`}>
        <span aria-hidden="true">A−</span>
      </button>
      <button type="button" aria-label="Hacer la letra más grande" title="Letra más grande" disabled={nivel === NIVELES.length - 1} onClick={() => onNivel(nivel + 1)} className={`${base} h-11 w-11 text-xl`}>
        <span aria-hidden="true">A+</span>
      </button>
    </>
  );
  if (variante === "barra")
    return (
      <div role="group" aria-label="Tamaño de la letra" className="flex items-center justify-between rounded-2xl border border-nivel bg-superficie px-3 py-1">
        <span className="text-sm font-semibold text-tinta-suave">Letra</span>
        <div className="flex items-center gap-1">{botones}</div>
      </div>
    );
  return (
    <div role="group" aria-label="Tamaño de la letra" className="fixed bottom-4 right-4 z-[1200] flex items-center gap-1 rounded-full bg-superficie/95 py-1 pl-4 pr-1.5 shadow-lg ring-1 ring-black/10 backdrop-blur">
      <span className="mr-1 text-sm font-semibold text-tinta-suave">Letra</span>
      {botones}
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { pathname } = useLocation();
  const [buscar, setBuscar] = useState(false);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscar((v) => !v);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  const esMapa = pathname === "/mapa";
  const [nivel, setNivel] = useLetra();
  const [noche, setNoche] = useTema();
  const [colapsada, setColapsada] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_BARRA) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_BARRA, colapsada ? "1" : "0");
    } catch {
      /* sin almacenamiento */
    }
  }, [colapsada]);

  useEffect(() => setMenuAbierto(false), [pathname]);

  return (
    <div className="flex h-[100dvh] flex-col bg-papel text-tinta lg:flex-row">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded focus:bg-papel focus:px-3 focus:py-2">
        Saltar al contenido
      </a>

      {/* Barra lateral en computador: se puede encoger a solo íconos */}
      <aside
        data-cromo="lateral"
        data-animar={esMapa ? undefined : ""}
        className={`hidden shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-nivel bg-papel py-5 lg:flex ${colapsada ? "w-[5.5rem] px-2.5" : "w-64 px-3"}`}
      >
        <div className={`mb-6 flex items-center gap-3 ${colapsada ? "justify-center" : "px-2"}`}>
          <Logo className="h-10 w-10 shrink-0" />
          {!colapsada && (
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-[0.14em]">OTEA</p>
              <p className="text-sm text-tinta-suave">Observatorio Santa Cruz · Comuna 2</p>
            </div>
          )}
        </div>
        <button type="button" onClick={() => setBuscar(true)} title="Buscar (Ctrl + K)" aria-label="Buscar un módulo o barrio"
          className={`mb-3 flex items-center rounded-xl border border-nivel bg-superficie py-2 text-sm text-tinta-suave transition hover:border-marca hover:text-tinta ${colapsada ? "justify-center px-0" : "gap-2 px-3"}`}>
          <IconoNav nombre="lupa" className="h-5 w-5 shrink-0" trazo={2} />
          {!colapsada && <><span className="flex-1 text-left">Buscar…</span><kbd className="rounded bg-papel px-1.5 py-0.5 text-[0.7rem] font-semibold">Ctrl K</kbd></>}
        </button>
        <Navegacion compacta={colapsada} />
        <div className="mt-auto space-y-2 pt-4">
          {esMapa && !colapsada && <LetraTamano nivel={nivel} onNivel={setNivel} variante="barra" />}
          <BotonTema noche={noche} onCambiar={() => setNoche((v) => !v)} compacta={colapsada} />
          <button
            type="button"
            onClick={() => setColapsada((v) => !v)}
            aria-expanded={!colapsada}
            aria-label={colapsada ? "Mostrar el menú completo" : "Contraer el menú"}
            title={colapsada ? "Mostrar el menú completo" : "Contraer el menú"}
            className={`flex w-full items-center rounded-xl py-2.5 text-base font-medium text-tinta-suave transition hover:bg-menta hover:text-tinta ${colapsada ? "justify-center" : "gap-3 px-3"}`}
          >
            <IconoNav nombre={colapsada ? "derecha" : "izquierda"} className="h-6 w-6 shrink-0" trazo={2} />
            {!colapsada && "Contraer menú"}
          </button>
        </div>
        {!colapsada && (
          <p className="mt-2 px-3 text-xs text-tinta-tenue">Prototipo de la Fase 2 para Territorio INN 2026. Reto #4: espacios públicos, equipamientos y movilidad.</p>
        )}
      </aside>

      {/* Barra superior en celular y tableta */}
      <header data-cromo="cabecera" className="relative z-[1100] flex items-center justify-between border-b border-nivel bg-papel px-4 py-2.5 lg:hidden">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <p className="font-bold">OTEA · Santa Cruz</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
          className="rounded-md border border-nivel px-3 py-1.5 text-sm font-medium"
        >
          {menuAbierto ? "Cerrar" : "Menú"}
        </button>
        {menuAbierto && (
          <div id="menu-movil" className="absolute inset-x-0 top-full border-b border-nivel bg-papel p-3 shadow-lg">
            <Navegacion onNavegar={() => setMenuAbierto(false)} />
            <div className="mt-3 space-y-2">
              <BotonTema noche={noche} onCambiar={() => setNoche((v) => !v)} />
              <LetraTamano nivel={nivel} onNivel={setNivel} variante="barra" />
            </div>
          </div>
        )}
      </header>

      <main id="contenido" className={`min-h-0 flex-1 ${esMapa ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div key={pathname} className={esMapa ? "h-full" : "animate-[entrar-suave_450ms_ease-out_backwards]"}>{children}</div>
      </main>

      <Paleta abierta={buscar} onCerrar={() => setBuscar(false)} />
      {!esMapa && <LetraTamano nivel={nivel} onNivel={setNivel} variante="flotante" />}
    </div>
  );
}
