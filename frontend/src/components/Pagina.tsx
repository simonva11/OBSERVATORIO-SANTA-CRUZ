import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import IconoNav from "./IconosNav";
import { Revelar } from "./Animacion";
import { acentoDeRuta } from "../lib/marca";

/** Encabezado de cada módulo: ligero, sin banda de color. El módulo se reconoce por su ícono y una raya de acento. */
export function Cabecera({
  etiqueta, titulo, texto, icono, children, className = "",
}: { etiqueta: string; titulo: string; texto: ReactNode; icono?: string; children?: ReactNode; className?: string }) {
  const a = acentoDeRuta(useLocation().pathname);
  return (
    <header className={`relative border-b border-nivel/70 pb-5 ${className}`}>
      <div className="flex items-start gap-3.5">
        {icono && (
          <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl text-white sm:grid" style={{ background: a.medio }}>
            <IconoNav nombre={icono} className="h-5 w-5" trazo={1.8} />
          </span>
        )}
        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-marca">{etiqueta}</p>
          <h1 className="mt-1 text-[1.6rem] font-semibold leading-tight tracking-tight [text-wrap:balance] sm:text-[1.9rem]">{titulo}</h1>
          <div className="mt-2 text-base leading-relaxed text-tinta-suave">{texto}</div>
          {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
        </div>
      </div>
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

/** Sección con título pequeño y una línea de ayuda. */
export function Seccion({ id, titulo, texto, derecha, children }: { id: string; titulo: string; texto?: ReactNode; derecha?: ReactNode; children: ReactNode }) {
  const a = acentoDeRuta(useLocation().pathname);
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: a.vivo }} />
            {titulo}
          </h2>
          {texto && <p className="mt-0.5 max-w-3xl pl-4 text-sm text-tinta-tenue">{texto}</p>}
        </div>
        {derecha}
      </div>
      {children}
    </section>
  );
}

/** Dato grande y compacto, con una barra de color a un lado. `grande` lo hace protagonista. */
export function Kpi({ valor, texto, nota, tono = "verde", grande = false }: { valor: ReactNode; texto: ReactNode; nota?: ReactNode; tono?: "verde" | "ambar" | "rojo"; grande?: boolean }) {
  const punto = tono === "rojo" ? "#c0583a" : tono === "ambar" ? "#e0a526" : "#2d9a5a";
  return (
    <div className="vidrio vidrio--quieto relative h-full rounded-xl p-3.5">
      <p className="flex items-start gap-2 text-sm leading-snug text-tinta-suave">
        <span aria-hidden="true" className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: punto }} />
        <span>{texto}</span>
      </p>
      <p className={`mt-1 font-semibold leading-none tabular-nums text-tinta ${grande ? "text-[2rem]" : "text-[1.4rem]"}`}>{valor}</p>
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
