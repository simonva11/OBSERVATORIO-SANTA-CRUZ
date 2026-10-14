import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import IconoNav from "./IconosNav";
import { Cuenta, Revelar, useVisto } from "./Animacion";
import { acentoDeRuta } from "../lib/marca";

/** Encabezado de cada módulo: una franja compacta con el título, una línea de explicación y las acciones a la derecha. */
export function Cabecera({
  etiqueta, titulo, texto, icono, children, className = "",
}: { etiqueta: string; titulo: string; texto: ReactNode; icono?: string; children?: ReactNode; className?: string }) {
  const a = acentoDeRuta(useLocation().pathname);
  return (
    <header className={`cabecera-panel rounded-2xl border border-nivel/80 px-4 py-3.5 sm:px-5 ${className}`} style={{ ["--tono" as string]: a.vivo }}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {icono && (
          <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl text-white sm:grid" style={{ background: `linear-gradient(145deg, ${a.vivo}, ${a.medio})` }}>
            <IconoNav nombre={icono} className="h-6 w-6" trazo={1.7} />
          </span>
        )}
        <div className="min-w-0 flex-1 basis-[20rem]">
          <p className="text-xs font-medium text-tinta-tenue">{etiqueta}</p>
          <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-[1.6rem]">{titulo}</h1>
          <div className="mt-1 max-w-4xl text-sm leading-snug text-tinta-suave">{texto}</div>
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
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

/** Sección con título, una línea de ayuda y entrada animada al llegar a la pantalla. */
export function Seccion({ id, titulo, texto, derecha, mitad = false, children }: { id: string; mitad?: boolean; titulo: string; texto?: ReactNode; derecha?: ReactNode; children: ReactNode }) {
  return (
    <Revelar className={mitad ? "col-mitad" : ""}>
      <section aria-labelledby={id}>
        <div className="mb-2.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-b border-nivel/70 pb-2">
          <div className="min-w-0">
            <h2 id={id} className="text-[1.05rem] font-semibold tracking-tight sm:text-[1.15rem]">{titulo}</h2>
            {texto && <p className="mt-0.5 max-w-3xl text-[0.8rem] leading-snug text-tinta-tenue">{texto}</p>}
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

/** Dato compacto: la etiqueta arriba, la cifra abajo y una raya de color a un lado. `grande` lo hace protagonista. */
export function Kpi({ valor, texto, nota, tono = "verde", grande = false }: { valor: ReactNode; texto: ReactNode; nota?: ReactNode; tono?: "verde" | "ambar" | "rojo"; grande?: boolean }) {
  const punto = tono === "rojo" ? "#c0583a" : tono === "ambar" ? "#e0a526" : "#2d9a5a";
  return (
    <div className="vidrio kpi-tarjeta relative h-full overflow-hidden rounded-xl py-2.5 pl-4 pr-3" style={{ ["--glow" as string]: punto }}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: punto }} />
      <p className="text-[0.8rem] leading-snug text-tinta-suave">{texto}</p>
      <p className={`mt-0.5 font-semibold leading-none tabular-nums text-tinta ${grande ? "text-[1.9rem]" : "text-[1.4rem]"}`}><ValorAnimado valor={valor} /></p>
      {nota && <p className="mt-1 text-[0.72rem] leading-snug text-tinta-tenue">{nota}</p>}
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
