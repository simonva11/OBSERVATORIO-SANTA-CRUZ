import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { HISTORIAS } from "../../lib/ciudadano";
import { FOTOS, fuentesFoto } from "../../lib/fotos";

/** Cómo se nombra cada tema en el menú: palabras de todos los días. */
const ROTULO: Record<string, string> = {
  "movilidad-mayores": "Moverme por el barrio",
  basuras: "Basuras y limpieza",
  huecos: "Calles y andenes",
  "espacio-publico": "Espacios para encontrarnos",
};

/**
 * Menú de la vista ciudadana. No es una lista de módulos: abre con los temas, cada uno con una foto real y la
 * pregunta que responde; al lado, los caminos para explorar y participar (con su estado real) y la puerta a OTEA
 * Técnico. Se cierra con Escape, con un clic afuera o al navegar; el foco vuelve al botón que lo abrió.
 */
export default function MenuCiudadano({ abierto, onCerrar, botones, children }: { abierto: boolean; onCerrar: () => void; botones: React.RefObject<HTMLButtonElement>[]; children?: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const primero = panel.current?.querySelector<HTMLElement>("a,button");
    primero?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCerrar();
        botones.find((b) => b.current && b.current.offsetParent !== null)?.current?.focus();
      }
    };
    const fuera = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !botones.some((b) => b.current?.contains(e.target as Node))) onCerrar();
    };
    document.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", fuera);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fuera);
    };
  }, [abierto, onCerrar, botones]);
  if (!abierto) return null;

  return (
    <div id="menu-ciudadano" ref={panel} className="menu-ciu" role="region" aria-label="Menú de OTEA">
      <div className="menu-ciu-cuerpo">
        <section aria-labelledby="mc-temas">
          <p id="mc-temas" className="menu-ciu-rotulo">¿Qué quieres saber?</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {HISTORIAS.map((h) => {
              const f = FOTOS[h.foto];
              const { srcSet } = fuentesFoto(f);
              return (
                <li key={h.id}>
                  <NavLink to={`/historias/${h.id}`} onClick={onCerrar} className="menu-ciu-tema" style={{ ["--tono" as string]: h.color }}>
                    <img src={`${import.meta.env.BASE_URL}fotos/${f.id}-640.webp`} srcSet={srcSet} sizes="96px" alt="" loading="lazy" className="menu-ciu-miniatura" style={{ objectPosition: f.foco, background: f.color }} />
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight">{ROTULO[h.id]}</span>
                      <span className="mt-0.5 block text-[0.86rem] leading-snug text-tinta-suave">{h.pregunta}</span>
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="mc-explorar">
          <p id="mc-explorar" className="menu-ciu-rotulo">Explorar</p>
          <ul className="grid gap-0.5">
            <li><NavLink to="/mi-lugar" onClick={onCerrar} className="menu-ciu-enlace"><strong>Mi cuadra, mi minuto</strong><span>Cuánto caminas de verdad al Metro, al colegio y a la salud</span></NavLink></li>
            <li><NavLink to="/mi-lugar?modo=arrendar" onClick={onCerrar} className="menu-ciu-enlace"><strong>Antes de arrendar</strong><span>Riesgo del POT y servicios cerca de una cuadra</span></NavLink></li>
            <li><NavLink to="/mapa-vecinos" onClick={onCerrar} className="menu-ciu-enlace"><strong>Explorar el mapa</strong><span>Metro, huecos, parques y más, por preguntas</span></NavLink></li>
            <li><NavLink to="/barrios" onClick={onCerrar} className="menu-ciu-enlace"><strong>Mi barrio</strong><span>Los 11 barrios, cada uno con su ficha</span></NavLink></li>
            <li><NavLink to="/historias" end onClick={onCerrar} className="menu-ciu-enlace"><strong>Todos los problemas</strong><span>Las cuatro historias y el mapa por tema</span></NavLink></li>
          </ul>
        </section>
        <section aria-labelledby="mc-participar">
          <p id="mc-participar" className="menu-ciu-rotulo">Participar</p>
          <ul className="grid gap-0.5">
            <li><NavLink to="/participacion" onClick={onCerrar} className="menu-ciu-enlace"><strong>Compartir una problemática <span className="estado estado-prueba ml-1 align-middle">Prueba</span></strong><span>Queda en tu dispositivo y la puedes mandar por WhatsApp</span></NavLink></li>
            <li><a href="https://www.medellin.gov.co/es/sala-de-prensa/noticias/con-reportesmed-ciudadanos-podran-reportar-escombros-huecos-en-las-calles-y-danos-en-luminarias/" target="_blank" rel="noopener noreferrer" className="menu-ciu-enlace"><strong>Reportar a la Alcaldía ↗</strong><span>Huecos y daños se reportan en ReportesMED</span></a></li>
            <li><NavLink to="/recorrido" onClick={onCerrar} className="menu-ciu-enlace"><strong>OTEA en 2 minutos</strong><span>Un recorrido guiado por el sitio</span></NavLink></li>
          </ul>
        </section>
      </div>
      {children && <div className="menu-ciu-extra">{children}</div>}
      <div className="menu-ciu-pie">
        <Link to="/" onClick={onCerrar} className="font-semibold">← Volver al inicio</Link>
        <Link to="/tecnico" onClick={onCerrar} className="menu-ciu-tecnico">
          <strong>OTEA Técnico</strong> <span>Cifras, métodos y fuentes para JAC, JAL, entidades y analistas →</span>
        </Link>
      </div>
    </div>
  );
}
