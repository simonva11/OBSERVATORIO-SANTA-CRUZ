import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import IconoNav from "./IconosNav";
import { Cuenta, Revelar, useVisto } from "./Animacion";
import { curvas } from "./FondoPagina";
import { acentoDeRuta } from "../lib/marca";

/** Encabezado de cada módulo: panel con degradado azul, curvas de nivel y la coordenada de la comuna. */
const CURVAS_CAB = curvas([{ cx: 760, cy: 120, n: 9, base: 20, paso: 24, fase: 1.4 }]);
export function Cabecera({
  etiqueta, titulo, texto, icono, children, className = "",
}: { etiqueta: string; titulo: string; texto: ReactNode; icono?: string; children?: ReactNode; className?: string }) {
  const a = acentoDeRuta(useLocation().pathname);
  return (
    <header className={`cabecera-panel relative overflow-hidden rounded-3xl border border-nivel/80 p-6 sm:p-9 ${className}`} style={{ ["--tono" as string]: a.vivo }}>
      <svg aria-hidden="true" viewBox="0 0 1000 260" preserveAspectRatio="xMaxYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
        <g fill="none" stroke="rgb(var(--marca))" strokeWidth="1.3" opacity="0.14">
          {CURVAS_CAB.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full " style={{ background: `radial-gradient(circle, ${a.vivo}44, transparent 70%)` }} />
      <div className="relative flex items-start gap-5">
        {icono && (
          <span className="cabecera-icono hidden h-14 w-14 shrink-0 place-items-center rounded-2xl text-white sm:grid" style={{ background: `linear-gradient(145deg, ${a.vivo}, ${a.medio})` }}>
            <IconoNav nombre={icono} className="h-7 w-7" trazo={1.7} />
          </span>
        )}
        <div className="min-w-0 max-w-5xl">
          <p className="entra inline-flex items-center gap-2 rounded-full border border-marca/25 bg-superficie/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-marca backdrop-blur">
            <span aria-hidden="true" className="punto-vivo !h-1.5 !w-1.5 !bg-[var(--tono)]" />
            {etiqueta}
          </p>
          <h1 className="entra mt-3 text-[1.9rem] font-bold leading-[1.1] tracking-tight [text-wrap:balance] sm:text-[2.6rem]" style={{ animationDelay: "80ms" }}>
            <span className="titulo-degradado">{titulo}</span>
          </h1>
          <div className="entra mt-3 text-base leading-relaxed text-tinta-suave sm:text-[1.05rem]" style={{ animationDelay: "160ms" }}>{texto}</div>
          {children && <div className="entra mt-5 flex flex-wrap gap-2.5" style={{ animationDelay: "240ms" }}>{children}</div>}
        </div>
      </div>
      <p aria-hidden="true" className="absolute bottom-3 right-5 hidden text-[0.65rem] font-semibold tracking-[0.18em] text-marca/45 md:block">6°18′N · 75°33′O · COMUNA 2</p>
    </header>
  );
}

/** Botón dentro de la Cabecera (siempre blanco o de vidrio, porque el fondo es de color). */
export function BotonCabecera({ to, children, claro = false }: { to: string; children: ReactNode; claro?: boolean }) {
  const a = acentoDeRuta(useLocation().pathname);
  return (
    <Link
      to={to}
      style={claro ? undefined : { background: a.medio }}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-[background-color,filter] ${claro ? "border border-nivel text-tinta hover:bg-acento/10" : "text-white hover:brightness-110"}`}
    >
      {children}
    </Link>
  );
}

/** Sección con título, una línea de ayuda y entrada animada al llegar a la pantalla. */
export function Seccion({ id, titulo, texto, derecha, mitad = false, children }: { id: string; mitad?: boolean; titulo: string; texto?: ReactNode; derecha?: ReactNode; children: ReactNode }) {
  const a = acentoDeRuta(useLocation().pathname);
  return (
    <Revelar className={mitad ? "col-mitad" : ""}>
      <section aria-labelledby={id}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id={id} className="flex items-center gap-3 text-xl font-bold tracking-tight sm:text-[1.4rem]">
              <span aria-hidden="true" className="h-6 w-1.5 rounded-full" style={{ background: `linear-gradient(180deg, ${a.vivo}, ${a.medio})` }} />
              {titulo}
            </h2>
            {texto && <p className="mt-1 max-w-3xl pl-[1.125rem] text-sm text-tinta-tenue">{texto}</p>}
          </div>
          {derecha}
        </div>
        {children}
      </section>
    </Revelar>
  );
}

/** Si el valor es un número en formato colombiano ("3.336", "12,2 min", "91 %"), cuenta desde 0 al aparecer. */
function ValorAnimado({ valor }: { valor: ReactNode }) {
  const [ref, visto] = useVisto<HTMLSpanElement>(0.3);
  const m = typeof valor === "string" ? /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(.*)$/.exec(valor) : null;
  if (!m || (m[1].length > 1 && m[1].startsWith("0") && !m[2])) return <>{valor}</>;
  const hasta = Number(m[1].replace(/\./g, "") + (m[2] ? "." + m[2] : ""));
  return (
    <span ref={ref}>
      <Cuenta hasta={hasta} decimales={m[2]?.length ?? 0} activo={visto} duracion={1300} />
      {m[3]}
    </span>
  );
}

/** Dato grande y compacto, con una barra de color a un lado. `grande` lo hace protagonista. */
export function Kpi({ valor, texto, nota, tono = "verde", grande = false }: { valor: ReactNode; texto: ReactNode; nota?: ReactNode; tono?: "verde" | "ambar" | "rojo"; grande?: boolean }) {
  const punto = tono === "rojo" ? "#c0583a" : tono === "ambar" ? "#e0a526" : "#2d9a5a";
  return (
    <div className="vidrio kpi-tarjeta relative h-full overflow-hidden rounded-2xl p-4" style={{ ["--glow" as string]: punto }}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${punto}, transparent)` }} />
      <p className="flex items-start gap-2 text-sm leading-snug text-tinta-suave">
        <span aria-hidden="true" className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: punto }} />
        <span>{texto}</span>
      </p>
      <p className={`mt-1 font-semibold leading-none tabular-nums text-tinta ${grande ? "text-[2.4rem]" : "text-[1.75rem]"}`}><ValorAnimado valor={valor} /></p>
      {nota && <p className="mt-1.5 text-xs text-tinta-tenue">{nota}</p>}
    </div>
  );
}

const RELACIONES: Record<string, { ruta: string; icono: string; nombre: string; texto: string }> = {
  mapa: { ruta: "/mapa", icono: "mapa", nombre: "Mapa territorial", texto: "Ver todo sobre la comuna en el mapa" },
  reclamos: { ruta: "/reclamos", icono: "alerta", nombre: "Huecos y reclamos", texto: "Lo que la gente ya reportó" },
  problematicas: { ruta: "/problematicas", icono: "alerta", nombre: "Problemáticas", texto: "Los ocho problemas, con su número" },
  corredor: { ruta: "/corredor-49", icono: "corredor", nombre: "Corredor Carrera 49", texto: "¿Conviene ir por la 49?" },
  indicadores: { ruta: "/indicadores", icono: "indicadores", nombre: "Indicadores", texto: "Cifras por barrio" },
  accesibilidad: { ruta: "/accesibilidad", icono: "accesibilidad", nombre: "Accesibilidad", texto: "Minutos caminando a lo básico" },
  prioridades: { ruta: "/prioridades", icono: "prioridades", nombre: "Prioridad de obras", texto: "Dónde intervenir primero" },
  datos: { ruta: "/datos", icono: "subir", nombre: "Mis datos", texto: "Sube y mira tus propios datos" },
  radar: { ruta: "/radar", icono: "radar", nombre: "Radar de noticias", texto: "Lo que dicen los medios de la comuna" },
  propuesta: { ruta: "/propuesta", icono: "corazon", nombre: "Propuesta de valor", texto: "Por qué existe y qué falta por hacer" },
  inmobiliario: { ruta: "/inmobiliario", icono: "cubo", nombre: "Mercado inmobiliario y POT", texto: "Oferta observada y norma por barrio" },
  riesgo: { ruta: "/riesgo", icono: "ladera", nombre: "Riesgo de movimiento en masa", texto: "Gente y viviendas en zonas de amenaza" },
  residuos: { ruta: "/residuos", icono: "residuos", nombre: "Aseo y residuos", texto: "Rutas del camión y toneladas por barrio" },
  fuentes: { ruta: "/fuentes", icono: "fuentes", nombre: "Fuentes y calidad", texto: "De dónde sale cada dato" },
  identidad: { ruta: "/identidad", icono: "paleta", nombre: "Manual de identidad", texto: "Colores, letras y reglas del sitio" },
};

/** Cierre de cada página: tres enlaces a módulos que se conectan con lo que acabas de ver. */
export function Relacionados({ ids, className = "" }: { ids: (keyof typeof RELACIONES)[]; className?: string }) {
  return (
    <Revelar className={className}>
      <section aria-label="Sigue por aquí" className="rounded-2xl border border-nivel/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tinta-tenue">Sigue por aquí</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {ids.map((id) => {
            const r = RELACIONES[id];
            return (
              <Link key={id} to={r.ruta} className="fila-modulo group flex items-center gap-3 rounded-xl p-2.5 hover:bg-acento/10">
                <span className="fila-modulo-icono grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-menta text-marca">
                  <IconoNav nombre={r.icono} className="h-6 w-6" trazo={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{r.nombre}</span>
                  <span className="block text-xs text-tinta-suave">{r.texto}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </Revelar>
  );
}
