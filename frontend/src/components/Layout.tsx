import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import IconoNav from "./IconosNav";
import Paleta from "./Paleta";
import { acentoDeRuta } from "../lib/marca";
import { esCiudadana, esHistoria, NAV_CIUDADANA } from "../lib/experiencia";
import { GRUPOS, grupoDeRuta, type ModuloMenu } from "../lib/menu";

export function Logo({ className = "" }: { className?: string }) {
  // Tres curvas de nivel de la ladera y la línea del cable aéreo que la cruza: la comuna vista como un mapa.
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#1f40cc" />
      <path d="M3 33c9-1 14-8 21-10s10-6 13-11" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" fill="none" />
      <path d="M3 38c10-1 16-7 23-9s9-5 12-9" stroke="#fff" strokeOpacity=".3" strokeWidth="1.6" fill="none" />
      <path d="M3 27c8-1 12-7 18-9s9-7 11-13" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" fill="none" />
      <path d="M5 30 35 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="3.2" fill="#fff" />
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
      className={({ isActive }) =>
        `group relative flex items-center rounded-xl transition-colors ${compacta ? "flex-col justify-center gap-1 px-1 py-2" : "gap-3 px-3 py-2 text-[0.9rem]"} ${
          isActive ? "bg-tinta text-papel" : "text-tinta hover:bg-papel-hondo"
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

/** Claro por defecto (limpio, se lee bien al sol); el modo noche es una opción y se recuerda. */
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

/** A− y A+ siempre a la vista en la cabecera ciudadana: muchas personas necesitan letra más grande. */
function LetraCompacta({ nivel, onNivel }: { nivel: number; onNivel: (n: number) => void }) {
  const base = "grid h-10 w-10 place-items-center rounded-lg border border-nivel bg-superficie font-bold transition hover:bg-menta disabled:opacity-35 disabled:hover:bg-superficie";
  return (
    <div role="group" aria-label="Tamaño de la letra" className="flex items-center gap-1">
      <button type="button" aria-label="Hacer la letra más pequeña" title="Letra más pequeña" disabled={nivel === 0} onClick={() => onNivel(nivel - 1)} className={`${base} text-sm`}><span aria-hidden="true">A−</span></button>
      <button type="button" aria-label="Hacer la letra más grande" title="Letra más grande" disabled={nivel === NIVELES.length - 1} onClick={() => onNivel(nivel + 1)} className={`${base} text-lg`}><span aria-hidden="true">A+</span></button>
    </div>
  );
}

/** Índice de la página: chips con las secciones (se leen del propio contenido) para saltar de una a otra. */
function IndicePagina({ raiz }: { raiz: React.RefObject<HTMLElement> }) {
  const { pathname } = useLocation();
  const [items, setItems] = useState<{ id: string; t: string }[]>([]);
  const [activo, setActivo] = useState<string | null>(null);
  useEffect(() => {
    setItems([]);
    setActivo(null);
    const leer = () => {
      const hs = [...document.querySelectorAll<HTMLElement>("#contenido h2[id]")];
      setItems(hs.map((h) => ({ id: h.id, t: (h.textContent ?? "").trim() })).filter((x) => x.t));
    };
    const a = setTimeout(leer, 600);
    const b = setTimeout(leer, 2000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [pathname]);
  useEffect(() => {
    if (items.length < 3 || !raiz.current) return;
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
        if (v) setActivo(v.target.id);
      },
      { root: raiz.current, rootMargin: "-8% 0px -80% 0px" },
    );
    items.forEach((i) => { const el = document.getElementById(i.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [items, raiz]);
  if (items.length < 3 || esHistoria(pathname) || pathname === "/tecnico") return null;
  return (
    <nav aria-label="En esta página" className="barra-sup sticky top-0 z-20">
      <ul className="mx-auto flex max-w-[112rem] items-center gap-1.5 overflow-x-auto px-4 py-1.5 lg:px-8 2xl:px-12 [scrollbar-width:none]">
        <li className="mono shrink-0 pr-2 text-[0.68rem] uppercase tracking-[0.06em] text-tinta-tenue">En esta página</li>
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <button
              type="button"
              onClick={() => document.getElementById(i.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              aria-current={activo === i.id ? "true" : undefined}
              className={`max-w-[15rem] truncate rounded-full px-3 py-1 text-xs font-medium transition-colors ${activo === i.id ? "bg-tinta text-papel" : "text-tinta-suave hover:bg-papel-hondo hover:text-tinta"}`}
            >
              {i.t}
            </button>
          </li>
        ))}
      </ul>
    </nav>
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
  const tono = acentoDeRuta(pathname).medio;
  const chip = (activa: boolean) =>
    `relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[0.9rem] transition-colors ${activa ? "font-semibold text-tinta" : "font-medium text-tinta-suave hover:bg-papel-hondo hover:text-tinta"}`;
  const raya = (activa: boolean) => (activa ? <span aria-hidden="true" className="absolute inset-x-2.5 -bottom-[0.6rem] h-[3px] rounded-full" style={{ background: tono }} /> : null);
  return (
    <nav ref={ref} aria-label="Módulos" className="hidden min-w-0 items-center gap-0.5 xl:flex">
      {GRUPOS.map((g, i) => {
        const esActivo = activo === g.id;
        if (g.modulos.length === 1) {
          const m = g.modulos[0];
          return (
            <NavLink key={g.id} to={m.ruta} className={chip(esActivo)} aria-current={esActivo ? "page" : undefined}>
              <IconoNav nombre={m.icono} className="h-4 w-4" trazo={esActivo ? 2.2 : 1.8} />
              {m.corto}
              {raya(esActivo)}
            </NavLink>
          );
        }
        const abre = abierto === g.id;
        return (
          <div key={g.id} className="relative">
            <button type="button" aria-expanded={abre} aria-haspopup="true" onClick={() => setAbierto(abre ? null : g.id)} className={chip(esActivo || abre)}>
              {g.titulo}
              {raya(esActivo)}
              <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${abre ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {abre && (
              <div className={`absolute top-full z-[1200] mt-3 w-[22rem] rounded-xl border border-nivel bg-superficie p-1.5 shadow-[0_18px_40px_-16px_rgb(16_23_41/0.35)] ${i >= 4 ? "right-0" : "left-0"}`}>
                {g.modulos.map((m) => (
                  <NavLink key={m.ruta} to={m.ruta} end={m.ruta === "/"} onClick={() => setAbierto(null)}
                    className={({ isActive }) => `flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${isActive ? "bg-papel-hondo" : "hover:bg-papel-hondo"}`}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: acentoDeRuta(m.ruta).medio }}><IconoNav nombre={m.icono} className="h-[1.1rem] w-[1.1rem]" trazo={1.9} /></span>
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
  const esMapa = pathname === "/mapa" || pathname === "/mapa-vecinos";
  const ciu = esCiudadana(pathname);
  const principal = useRef<HTMLElement>(null);
  const barra = useRef<HTMLDivElement>(null);
  const alDesplazar = () => {
    const el = principal.current;
    if (el && barra.current) barra.current.style.transform = `scaleX(${el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0})`;
  };
  const [nivel, setNivel] = useLetra();
  const [noche, setNoche] = useTema();
  useEffect(() => setMenuAbierto(false), [pathname]);

  return (
    <div className="flex h-[100dvh] flex-col bg-papel text-tinta">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded focus:bg-papel focus:px-3 focus:py-2">
        Saltar al contenido
      </a>

      {/* Barra superior. Vista ciudadana: tres enlaces claros y letra grande a un toque. Vista técnica: módulos agrupados. */}
      <header data-cromo="cabecera" className="barra-sup relative z-[1100] flex items-center gap-3 px-4 py-2.5 lg:px-6">
        <NavLink to="/" className="flex shrink-0 items-center gap-2.5" aria-label="OTEA, ir al inicio">
          <Logo className="h-8 w-8" />
          <p className="leading-none"><span className="fuente-titulo text-[1.15rem] font-extrabold tracking-[0.04em]">OTEA</span>{ciu ? <span className="hidden pl-2 text-[0.82rem] font-medium text-tinta-suave sm:inline">Santa Cruz</span> : <span className="mono hidden pl-2 text-[0.7rem] uppercase tracking-[0.06em] text-tinta-tenue 2xl:inline">Técnico · Comuna 2</span>}</p>
        </NavLink>
        {ciu ? (
          <nav aria-label="Principal" className="ml-3 hidden items-center gap-1 lg:flex">
            {NAV_CIUDADANA.map((n) => (
              <NavLink key={n.ruta} to={n.ruta} className={({ isActive }) => `rounded-lg px-3 py-2 text-[1rem] transition-colors ${isActive ? "bg-tinta font-semibold text-papel" : "font-medium text-tinta hover:bg-papel-hondo"}`}>{n.texto}</NavLink>
            ))}
          </nav>
        ) : (
          <BarraModulos />
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => setBuscar(true)} title="Buscar (Ctrl + K)" aria-label="Buscar un tema o barrio"
            className={`${ciu ? "flex" : "hidden xl:flex"} items-center gap-2 whitespace-nowrap rounded-lg border border-nivel bg-superficie px-3 py-1.5 text-sm text-tinta-suave transition hover:border-tinta/60 hover:text-tinta ${ciu ? "h-10" : ""}`}>
            <IconoNav nombre="lupa" className="h-4 w-4" trazo={2} />
            <span className={ciu ? "hidden lg:inline" : "hidden 2xl:inline"}>Buscar barrio o tema</span>
            {!ciu && <kbd className="mono hidden rounded border border-nivel px-1.5 py-0.5 text-[0.66rem] 2xl:inline">Ctrl K</kbd>}
          </button>
          {ciu && <div className="hidden sm:block"><LetraCompacta nivel={nivel} onNivel={setNivel} /></div>}
          <button type="button" onClick={() => setNoche((v) => !v)} aria-pressed={noche} title={noche ? "Modo día" : "Modo noche"} aria-label={noche ? "Cambiar a modo día" : "Cambiar a modo noche"}
            className={`${ciu ? "hidden h-10 w-10 lg:grid" : "hidden h-9 w-9 xl:grid"} place-items-center rounded-lg text-tinta-suave transition hover:bg-papel-hondo hover:text-tinta`}>
            <IconoNav nombre={noche ? "sol" : "luna"} className="h-5 w-5" trazo={2} />
          </button>
          {!ciu && <div className="hidden whitespace-nowrap 2xl:block [&_button]:!h-8 [&_button]:!w-8 [&_div]:!py-0 [&_div]:!px-1 [&_span.font-semibold]:hidden"><LetraTamano nivel={nivel} onNivel={setNivel} variante="barra" /></div>}
          {ciu ? (
            <NavLink to="/tecnico" className="hidden whitespace-nowrap rounded-lg border border-nivel px-3 py-2 text-[0.82rem] font-medium text-tinta-suave transition hover:border-tinta/60 hover:text-tinta lg:inline-block" title="Cifras, métodos y fuentes para JAC, JAL, entidades y analistas">OTEA Técnico</NavLink>
          ) : (
            <NavLink to="/" className="hidden whitespace-nowrap rounded-lg bg-tinta px-3 py-2 text-[0.85rem] font-semibold text-papel transition hover:opacity-90 xl:inline-block">Vista ciudadana</NavLink>
          )}
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
            className={`${ciu ? "h-10 lg:hidden" : "xl:hidden"} rounded-lg border border-nivel bg-superficie px-3 py-1.5 text-sm font-semibold`}
          >
            {menuAbierto ? "Cerrar" : "Menú"}
          </button>
        </div>
        {menuAbierto && (
          <div id="menu-movil" className={`absolute inset-x-0 top-full max-h-[85dvh] overflow-y-auto border-b border-nivel bg-papel p-3 shadow-[0_18px_40px_-16px_rgb(16_23_41/0.35)] ${ciu ? "lg:hidden" : "xl:hidden"}`}>
            {ciu ? (
              <nav aria-label="Principal" className="flex flex-col gap-1">
                {[{ ruta: "/", texto: "Inicio" }, ...NAV_CIUDADANA].map((n) => (
                  <NavLink key={n.ruta} to={n.ruta} end={n.ruta === "/"} onClick={() => setMenuAbierto(false)} className={({ isActive }) => `rounded-xl px-4 py-3 text-[1.05rem] ${isActive ? "bg-tinta font-semibold text-papel" : "font-medium hover:bg-papel-hondo"}`}>{n.texto}</NavLink>
                ))}
                <NavLink to="/tecnico" onClick={() => setMenuAbierto(false)} className="mt-1 rounded-xl border border-nivel px-4 py-3 text-[0.95rem] text-tinta-suave">OTEA Técnico <span className="block text-[0.8rem]">Cifras, métodos y fuentes para JAC, JAL, entidades y analistas</span></NavLink>
              </nav>
            ) : (
              <>
                <NavLink to="/" onClick={() => setMenuAbierto(false)} className="mb-2 block rounded-xl bg-tinta px-4 py-3 text-center font-semibold text-papel">Vista ciudadana</NavLink>
                <Navegacion onNavegar={() => setMenuAbierto(false)} />
              </>
            )}
            <div className="mt-3 space-y-2">
              <BotonTema noche={noche} onCambiar={() => setNoche((v) => !v)} />
              <LetraTamano nivel={nivel} onNivel={setNivel} variante="barra" />
            </div>
          </div>
        )}
      </header>

      <div className="relative min-h-0 flex-1">
        {!esMapa && <div ref={barra} aria-hidden="true" className="progreso-lectura absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0" />}
        <main id="contenido" ref={principal} onScroll={alDesplazar} className={`absolute inset-0 ${esMapa ? "overflow-hidden" : "overflow-y-auto"}`}>
          {!esMapa && <IndicePagina raiz={principal} />}
          <div key={pathname} className={esMapa ? "h-full" : "animate-[entrar-suave_220ms_ease-out_backwards]"}>{children}</div>
        </main>
      </div>

      <Paleta abierta={buscar} onCerrar={() => setBuscar(false)} />
    </div>
  );
}
