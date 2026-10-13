import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import IconoNav from "./IconosNav";
import Paleta from "./Paleta";
import FondoPagina from "./FondoPagina";
import { ACENTOS } from "../lib/marca";
import { GRUPOS, grupoDeRuta, type ModuloMenu } from "../lib/menu";

export function Logo({ className = "" }: { className?: string }) {
  // Curvas de nivel de una ladera con la línea de un cable aéreo encima.
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs><linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#1d4f9a" /></linearGradient></defs>
      <rect width="40" height="40" rx="9" fill="url(#logo-g)" />
      <path d="M2 34 C12 30 18 22 38 20" stroke="#bfdbfe" strokeWidth="1.6" fill="none" />
      <path d="M2 38 C14 34 22 28 38 27" stroke="#bfdbfe" strokeWidth="1.6" fill="none" />
      <path d="M4 26 L36 8" stroke="#f4f8fe" strokeWidth="1.6" />
      <rect x="17" y="15" width="6" height="5" rx="1" fill="#f4f8fe" />
      <path d="M20 13.5 V15" stroke="#f4f8fe" strokeWidth="1.4" />
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
        `group relative flex items-center rounded-xl transition-colors ${compacta ? "flex-col justify-center gap-1 px-1 py-2" : "gap-3 px-3 py-2 text-[0.9rem]"} ${
          isActive ? "text-white shadow-md shadow-acento/25" : "text-tinta hover:bg-acento/10"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <IconoNav nombre={m.icono} className="h-5 w-5 shrink-0" trazo={isActive ? 2 : 1.7} />
          {compacta ? (
            <span className={`w-full truncate text-center text-[0.62rem] leading-none ${isActive ? "font-semibold" : "text-tinta-suave"}`}>{m.corto}</span>
          ) : (
            <span className={`flex-1 ${isActive ? "font-semibold" : ""}`}>{m.nombre}</span>
          )}
          {m.fase && !compacta && (
            <span className={`flex items-center gap-1.5 text-[0.7rem] font-medium ${isActive ? "text-white/85" : "text-ambar-texto"}`}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ambar" />
              {m.fase}
            </span>
          )}
          {m.fase && compacta && <span aria-hidden="true" className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-[#6ab7ff]" />}
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
          <div key={g.id} role="group" aria-label={g.titulo} className={i === 0 ? "" : "mt-2"}>
            {compacta && (
              <p className={`px-1 pb-1 text-center text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-tinta-tenue ${i === 0 ? "" : "border-t border-nivel/70 pt-2"}`}>{g.corto}</p>
            )}
            {!compacta && (
              <button
                type="button"
                aria-expanded={abierto}
                aria-controls={`grupo-${g.id}`}
                onClick={() => alternar(g.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-tinta-tenue transition-colors hover:text-tinta"
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

/** Botón del pie de la barra: mismo tamaño que un módulo; en la barra angosta lleva su rótulo debajo del ícono. */
function BotonPie({ icono, texto, corto, compacta, ...resto }: { icono: string; texto: string; corto: string; compacta: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" title={texto} {...resto}
      className={`flex items-center rounded-xl text-tinta-suave transition hover:bg-menta hover:text-tinta ${compacta ? "w-full flex-col justify-center gap-1 px-1 py-2" : "flex-1 justify-center gap-2 whitespace-nowrap px-2 py-2 text-[0.8rem] font-medium"}`}>
      <IconoNav nombre={icono} className="h-5 w-5 shrink-0" trazo={2} />
      <span className={compacta ? "text-[0.62rem] leading-none" : ""}>{compacta ? corto : texto}</span>
    </button>
  );
}

function BotonTema({ noche, onCambiar, compacta = false }: { noche: boolean; onCambiar: () => void; compacta?: boolean }) {
  return <BotonPie icono={noche ? "sol" : "luna"} texto={noche ? "Modo día" : "Modo noche"} corto={noche ? "Día" : "Noche"} compacta={compacta} onClick={onCambiar} aria-pressed={noche} />;
}

// ------------------------------------------------------------------ tamaño de la letra (A- / A+)
const CLAVE_NIVEL = "observatorio-santa-cruz:letra-nivel";
const CLAVE_LETRA_VIEJA = "observatorio-santa-cruz:letra-grande";
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
        <span className="text-[0.8rem] font-semibold text-tinta-suave">Letra</span>
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

/** Módulos en la barra superior (computador). Una categoría con varios módulos abre un desplegable; con uno solo es un enlace directo. */
function BarraModulos() {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const activo = grupoDeRuta(pathname);
  useEffect(() => setAbierto(null), [pathname]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAbierto(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(null);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);
  const chip = (activa: boolean) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-[0.88rem] font-medium transition-colors ${activa ? "bg-acento/15 text-tinta" : "text-tinta-suave hover:bg-acento/10 hover:text-tinta"}`;
  return (
    <nav ref={ref} aria-label="Módulos" className="hidden items-center gap-0.5 lg:flex">
      {GRUPOS.map((g, i) => {
        const esActivo = activo === g.id;
        if (g.modulos.length === 1) {
          const m = g.modulos[0];
          return (
            <NavLink key={g.id} to={m.ruta} className={chip(esActivo)} aria-current={esActivo ? "page" : undefined}>
              <IconoNav nombre={m.icono} className="h-4 w-4" trazo={esActivo ? 2.2 : 1.8} />
              {m.corto}
            </NavLink>
          );
        }
        const abre = abierto === g.id;
        return (
          <div key={g.id} className="relative">
            <button type="button" aria-expanded={abre} aria-haspopup="true" onClick={() => setAbierto(abre ? null : g.id)} className={chip(esActivo || abre)}>
              {g.titulo}
              <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${abre ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {abre && (
              <div className={`absolute top-full z-[1200] mt-2 w-80 rounded-2xl border border-nivel bg-superficie p-2 shadow-xl ${i >= 4 ? "right-0" : "left-0"}`}>
                {g.modulos.map((m) => (
                  <NavLink key={m.ruta} to={m.ruta} end={m.ruta === "/"} onClick={() => setAbierto(null)}
                    className={({ isActive }) => `flex items-start gap-3 rounded-xl px-3 py-2 transition-colors ${isActive ? "bg-acento/15" : "hover:bg-acento/10"}`}>
                    <IconoNav nombre={m.icono} className="mt-0.5 h-5 w-5 shrink-0 text-acento" trazo={1.8} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[0.92rem] font-semibold">
                        {m.nombre}
                        {m.fase && <span className="text-[0.68rem] font-medium text-ambar-texto">{m.fase}</span>}
                      </span>
                      <span className="block text-[0.8rem] leading-snug text-tinta-suave">{m.detalle}</span>
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
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
  const principal = useRef<HTMLElement>(null);
  const [avance, setAvance] = useState(0);
  const alDesplazar = () => {
    const el = principal.current;
    if (el) setAvance(el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0);
  };
  useEffect(() => setAvance(0), [pathname]);
  const [nivel, setNivel] = useLetra();
  const [noche, setNoche] = useTema();
  useEffect(() => setMenuAbierto(false), [pathname]);

  return (
    <div className="flex h-[100dvh] flex-col bg-papel text-tinta">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded focus:bg-papel focus:px-3 focus:py-2">
        Saltar al contenido
      </a>

      {/* Barra superior: en computador lleva los módulos agrupados en desplegables; en celular, un botón de menú */}
      <header data-cromo="cabecera" className="relative z-[1100] flex items-center gap-3 border-b border-nivel bg-papel px-4 py-2.5 lg:px-6">
        <NavLink to="/" className="flex shrink-0 items-center gap-2.5" aria-label="OTEA, ir al inicio">
          <Logo className="h-8 w-8" />
          <p className="font-bold tracking-[0.1em]">OTEA<span className="hidden font-normal tracking-normal text-tinta-suave xl:inline"> · Santa Cruz</span></p>
        </NavLink>
        <BarraModulos />
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => setBuscar(true)} title="Buscar (Ctrl + K)" aria-label="Buscar un módulo o barrio"
            className="hidden items-center gap-2 whitespace-nowrap rounded-xl border border-nivel bg-superficie px-3 py-1.5 text-sm text-tinta-suave transition hover:border-marca hover:text-tinta lg:flex">
            <IconoNav nombre="lupa" className="h-4 w-4" trazo={2} />
            <span className="hidden xl:inline">Buscar…</span>
            <kbd className="hidden rounded bg-papel px-1.5 py-0.5 text-[0.68rem] font-semibold xl:inline">Ctrl K</kbd>
          </button>
          <button type="button" onClick={() => setNoche((v) => !v)} aria-pressed={noche} title={noche ? "Modo día" : "Modo noche"} aria-label={noche ? "Cambiar a modo día" : "Cambiar a modo noche"}
            className="hidden h-9 w-9 place-items-center rounded-xl text-tinta-suave transition hover:bg-menta hover:text-tinta lg:grid">
            <IconoNav nombre={noche ? "sol" : "luna"} className="h-5 w-5" trazo={2} />
          </button>
          {esMapa && <div className="hidden whitespace-nowrap xl:block [&_button]:!h-8 [&_button]:!w-8 [&_div]:!py-0 [&_div]:!px-1 [&_span.font-semibold]:hidden"><LetraTamano nivel={nivel} onNivel={setNivel} variante="barra" /></div>}
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
            className="rounded-md border border-nivel px-3 py-1.5 text-sm font-medium lg:hidden"
          >
            {menuAbierto ? "Cerrar" : "Menú"}
          </button>
        </div>
        {menuAbierto && (
          <div id="menu-movil" className="absolute inset-x-0 top-full max-h-[80dvh] overflow-y-auto border-b border-nivel bg-papel p-3 shadow-lg lg:hidden">
            <Navegacion onNavegar={() => setMenuAbierto(false)} />
            <div className="mt-3 space-y-2">
              <BotonTema noche={noche} onCambiar={() => setNoche((v) => !v)} />
              <LetraTamano nivel={nivel} onNivel={setNivel} variante="barra" />
            </div>
          </div>
        )}
      </header>

      <div className="relative min-h-0 flex-1">
        {!esMapa && <FondoPagina />}
        {!esMapa && <div aria-hidden="true" className="progreso-lectura absolute inset-x-0 top-0 z-10 h-0.5 origin-left" style={{ transform: `scaleX(${avance})` }} />}
        <main id="contenido" ref={principal} onScroll={alDesplazar} className={`absolute inset-0 ${esMapa ? "overflow-hidden" : "overflow-y-auto"}`}>
          <div key={pathname} className={esMapa ? "h-full" : "animate-[entrar-suave_450ms_ease-out_backwards]"}>{children}</div>
        </main>
      </div>

      <Paleta abierta={buscar} onCerrar={() => setBuscar(false)} />
      {!esMapa && <LetraTamano nivel={nivel} onNivel={setNivel} variante="flotante" />}
    </div>
  );
}
