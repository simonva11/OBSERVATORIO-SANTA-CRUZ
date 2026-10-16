import { Link } from "react-router-dom";
import { HISTORIAS, useCiudadano, useMiBarrio } from "../lib/ciudadano";
import { useDatos } from "../lib/datos";
import { num } from "../lib/formato";
import type { Indicadores } from "../lib/tipos";
import { FOTOS } from "../lib/fotos";
import { RETO, hayApoyo } from "../lib/reto";
import { ConDatos } from "../components/Estado";
import Foto, { InfoFoto } from "../components/ciudadano/Foto";
import TarjetaHistoria from "../components/ciudadano/TarjetaHistoria";
import AtlasBarrios from "../components/ciudadano/AtlasBarrios";
import MapaCiudadano from "../components/ciudadano/MapaCiudadano";
import { urlDe } from "../components/ciudadano/Compartir";

const MENSAJE_OTEA =
  "Mira cómo se ven en datos algunos problemas de Santa Cruz (Comuna 2 de Medellín): caminar al Metro, las basuras, los huecos y el espacio público. Cada cifra trae su fuente.";

const suave = () => (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth") as ScrollBehavior;
const ir = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: suave(), block: "start" });

/** Estado real de cada forma de participar. Nada se presenta como si funcionara si no funciona. */
const PARTICIPAR: { t: string; d: string; estado: "Funciona" | "Prueba" | "Canal oficial" | "Pendiente"; to?: string; href?: string }[] = [
  { t: "Compartir una historia por WhatsApp", d: "Cada historia trae un mensaje corto con la cifra, su fuente y el enlace.", estado: "Funciona", to: "/historias" },
  { t: "Revisar de dónde sale cada dato", d: "Cada cifra enlaza a su ficha: entidad, fecha, licencia y qué no se puede concluir.", estado: "Funciona", to: "/fuentes" },
  { t: "Contar lo que ves en tu cuadra", d: "Se guarda solo en tu dispositivo. Todavía no le llega a nadie: sirve para organizar lo que llevas a la JAC.", estado: "Prueba", to: "/participacion" },
  { t: "Reportar un hueco a la Alcaldía", d: "Eso se hace en ReportesMED, la aplicación de la Alcaldía. OTEA no recibe reportes oficiales.", estado: "Canal oficial", href: "https://www.medellin.gov.co/es/sala-de-prensa/noticias/con-reportesmed-ciudadanos-podran-reportar-escombros-huecos-en-las-calles-y-danos-en-luminarias/" },
];

function coord(v: number, pos: string, neg: string) {
  const a = Math.abs(v), g = Math.floor(a), m = Math.floor((a - g) * 60), s = Math.round(((a - g) * 60 - m) * 60);
  return `${g}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″ ${v >= 0 ? pos : neg}`;
}

/**
 * OTEA Ciudadano: la puerta de entrada. Empieza por el territorio (una calle real de Santa Cruz), sigue con lo que se
 * vive a diario, deja explorar los barrios y los temas, explica qué hace OTEA y termina invitando a mirar y compartir.
 */
export default function Ciudadano() {
  const ciu = useCiudadano();
  const ind = useDatos<Indicadores>("indicadores.json");
  const [barrio, setBarrio] = useMiBarrio();
  const area = ind.estado === "listo" ? ind.datos.comuna.area_ha : null;
  const fotoCierre = FOTOS.laderas;

  return (
    <div className="ciu">
      {/* 1 ---------------------------------------------------------------- el territorio como protagonista */}
      <section className="portada" aria-labelledby="t-portada">
        <Foto id="calle" relleno prioridad sizes="100vw" tono="oscuro" creditoArriba />
        <div className="portada-velo" aria-hidden="true" />
        <div className="ciu-ancho relative z-[1] flex min-h-[inherit] flex-col justify-end pb-10 pt-24 md:pb-16">
          <p className="portada-ojo">Así vivimos Santa Cruz · Comuna 2, Medellín</p>
          <h1 id="t-portada" className="portada-titulo">Tu barrio tiene mucho que contar</h1>
          <p className="portada-texto">Conoce lo que pasa en Santa Cruz, descubre los problemas que vivimos y mira qué podemos mejorar juntos.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => ir("problemas")} className="boton boton-1 ciu-boton-grande portada-boton">
              Explorar los problemas del barrio <span aria-hidden="true">↓</span>
            </button>
            <button type="button" onClick={() => ir("que-es")} className="boton ciu-boton-grande portada-boton-2">Conocer OTEA</button>
          </div>
        </div>
      </section>
      <div className="regla-coordenadas" aria-label="Datos de ubicación de la comuna">
        <div className="ciu-ancho flex flex-wrap gap-x-6 gap-y-1">
          <span>{coord(6.2995, "N", "S")} · {coord(-75.5538, "E", "O")}</span>
          <span>Comuna 2 · Santa Cruz</span>
          <span>11 barrios</span>
          {ciu.estado === "listo" && <span>{num(ciu.datos.comuna.personas)} personas (Censo 2018)</span>}
          {area != null && <span>{num(Math.round(area))} hectáreas</span>}
        </div>
      </div>

      <div className="ciu-ancho">
        {/* 2 ---------------------------------------------------------------- lo que vivimos */}
        <section id="problemas" aria-labelledby="t-problemas" className="ciu-seccion scroll-mt-4">
          <p className="ciu-ojo-seccion">01 · Lo que vivimos</p>
          <h2 id="t-problemas" className="ciu-h2">Lo que vivimos todos los días</h2>
          <p className="ciu-sub">Cuatro situaciones que muchos vecinos reconocen. Cada una abre una historia con fotos, una cifra explicada en palabras de todos los días y lo que se puede hacer.</p>
          <ConDatos estado={ciu}>
            {(c) => (
              <div className="grilla-historias mt-8">
                <div className="gh-a"><TarjetaHistoria h={HISTORIAS[0]} c={c} barrio={barrio || undefined} variante="grande" /></div>
                <div className="gh-b"><TarjetaHistoria h={HISTORIAS[1]} c={c} barrio={barrio || undefined} /></div>
                <div className="gh-c"><TarjetaHistoria h={HISTORIAS[2]} c={c} barrio={barrio || undefined} /></div>
                <div className="gh-d"><TarjetaHistoria h={HISTORIAS[3]} c={c} barrio={barrio || undefined} variante="ancha" /></div>
              </div>
            )}
          </ConDatos>
        </section>

        {/* 3 ---------------------------------------------------------------- los barrios */}
        <section aria-labelledby="t-barrios" className="ciu-seccion">
          <p className="ciu-ojo-seccion">02 · Los barrios</p>
          <h2 id="t-barrios" className="ciu-h2">Un territorio, muchas historias</h2>
          <p className="ciu-sub">Santa Cruz son 11 barrios, con los límites oficiales del POT. Elige el tuyo y mira qué dicen los datos.</p>
          <ConDatos estado={ciu}>{(c) => <div className="mt-7"><AtlasBarrios barrios={c.barrios} elegido={barrio} onElegir={setBarrio} /></div>}</ConDatos>
        </section>
      </div>

      {/* 4 ---------------------------------------------------------------- tema → barrios */}
      <section aria-labelledby="t-comprender" className="banda-papel">
        <div className="ciu-ancho ciu-seccion">
          <p className="ciu-ojo-seccion">03 · Comprender</p>
          <h2 id="t-comprender" className="ciu-h2">Los problemas también se pueden comprender</h2>
          <p className="ciu-sub">Elige un tema y mira en qué barrios pesa más. Es la puerta de entrada al mapa: pocos colores, una cifra por barrio y la explicación al lado.</p>
          <div className="mt-7"><MapaCiudadano /></div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/mapa-vecinos" className="boton boton-1 ciu-boton-grande">Explorar el mapa completo</Link>
            <span className="text-[0.92rem] text-tinta-suave">Metro, colegios, parques, huecos reportados y más, sobre el mapa de la comuna.</span>
          </div>
        </div>
      </section>

      <div className="ciu-ancho">
        {/* 5 ---------------------------------------------------------------- qué hace diferente a OTEA */}
        <section id="que-es" aria-labelledby="t-que-es" className="ciu-seccion scroll-mt-4">
          <p className="ciu-ojo-seccion">04 · Qué es OTEA</p>
          <h2 id="t-que-es" className="ciu-h2">Del dato suelto a una historia que se puede revisar</h2>
          <p className="ciu-sub">OTEA es un observatorio de Santa Cruz hecho por estudiantes y vecinos. Junta información que hoy está regada en muchos portales y la conecta con los lugares y las preguntas de la gente.</p>
          <ConDatos estado={ciu}>
            {(c) => {
              const h = c.comuna.huecos;
              return (
                <div className="contraste mt-8">
                  <div className="contraste-antes">
                    <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-tinta-tenue">Un dato suelto</p>
                    <p className="contraste-numero">{num(h.total)}</p>
                    <p className="text-tinta-suave">reportes de huecos.</p>
                    <p className="mt-4 text-[0.92rem] text-tinta-tenue">¿Dónde? ¿Desde cuándo? ¿Se arreglaron? ¿Quién lo dice? Solo, el número no responde nada.</p>
                  </div>
                  <div className="contraste-despues">
                    <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-marca">El mismo dato en OTEA</p>
                    <dl className="contraste-lista">
                      <div><dt>Dónde</dt><dd>Contado por barrio, en el mapa de la comuna.</dd></div>
                      <div><dt>Cuándo</dt><dd>Reportes desde {new Date(`${h.desde}T12:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" })} hasta {new Date(`${h.hasta}T12:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" })}.</dd></div>
                      <div><dt>Qué pasó</dt><dd>{num(h.arreglados)} figuran como arreglados y {num(h.pendientes)} siguen pendientes; la mitad se arregló en {num(h.dias_mediana)} días o menos.</dd></div>
                      <div><dt>Quién lo dice</dt><dd>Alcaldía de Medellín, Sistema de Gestión Vial. <Link to="/fuentes?f=huecos" className="underline">Ver la ficha de la fuente</Link>.</dd></div>
                      <div><dt>Qué no dice</dt><dd>Un reporte no es un hueco confirmado: puede haber repetidos y huecos que nadie reportó.</dd></div>
                    </dl>
                    <Link to="/historias/huecos" className="siguiente-a mt-4 !text-base">Leer la historia completa →</Link>
                  </div>
                </div>
              );
            }}
          </ConDatos>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ["Reúne", "Datos de la Alcaldía, el DANE y otras entidades, que hoy están en portales y formatos distintos."],
              ["Ubica", "Los pone sobre los 11 barrios y las manzanas de la comuna, para que se vea dónde pasa cada cosa."],
              ["Explica", "Cuenta qué significa cada cifra, de dónde sale, de qué fecha es y qué todavía no se sabe."],
            ].map(([t, d], i) => (
              <div key={t} className="paso">
                <span className="paso-n" aria-hidden="true">{i + 1}</span>
                <p className="ciu-h3 !mt-0">{t}</p>
                <p className="mt-1.5 text-tinta-suave">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[46rem] text-[0.95rem] text-tinta-suave">
            Lo que OTEA <strong className="text-tinta">no</strong> hace: no arregla problemas, no ejecuta obras y no recibe solicitudes oficiales. Le da a la comunidad, a la JAC y a la JAL cifras claras para conversar y pedir con argumentos.
          </p>
        </section>

        {/* 6 ---------------------------------------------------------------- la comunidad */}
        <section aria-labelledby="t-comunidad" className="ciu-seccion">
          <div className="editorial editorial-invertida">
            <Foto id="callejon-tierra" className="editorial-foto" sizes="(min-width: 1024px) 45vw, 100vw" credito="pie" />
            <div>
              <p className="ciu-ojo-seccion">05 · Participar</p>
              <h2 id="t-comunidad" className="ciu-h2">La comunidad también hace parte de la historia</h2>
              <p className="ciu-sub">Esto es lo que hoy se puede hacer, dicho tal cual: qué funciona, qué es una prueba y qué se hace por fuera de OTEA.</p>
              <ul className="mt-6 grid gap-3">
                {PARTICIPAR.map((p) => {
                  const cuerpo = (
                    <>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{p.t}</span>
                        <span className={`estado estado-${p.estado === "Funciona" ? "ok" : p.estado === "Prueba" ? "prueba" : "externo"}`}>{p.estado}</span>
                      </span>
                      <span className="mt-1 block text-[0.94rem] leading-snug text-tinta-suave">{p.d}</span>
                    </>
                  );
                  return (
                    <li key={p.t}>
                      {p.to ? <Link to={p.to} className="accion-fila">{cuerpo}</Link> : <a href={p.href} target="_blank" rel="noopener noreferrer" className="accion-fila">{cuerpo}</a>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* 7 ---------------------------------------------------------------- cierre */}
      <section className="cierre" aria-labelledby="t-cierre">
        <Foto id="laderas" relleno sizes="100vw" credito="ninguno" />
        <div className="cierre-velo" aria-hidden="true" />
        <div className="ciu-ancho relative z-[1] py-20 md:py-28">
          <h2 id="t-cierre" className="cierre-titulo">Santa Cruz se entiende mejor cuando la miramos juntos.</h2>
          <p className="mt-4 max-w-[34rem] text-[1.15rem] leading-relaxed text-white/90">Mira tu barrio, comparte lo que encuentres y lleva las cifras a la próxima reunión de la JAC.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/mapa-vecinos" className="boton boton-1 ciu-boton-grande portada-boton">Explorar el mapa</Link>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${MENSAJE_OTEA} ${urlDe("/")}`)}`} target="_blank" rel="noopener noreferrer" className="boton ciu-boton-grande ciu-wa">Compartir OTEA por WhatsApp</a>
            {hayApoyo() && <a href={RETO.urlApoyo} target="_blank" rel="noopener noreferrer" className="boton ciu-boton-grande portada-boton-2">{RETO.textoApoyo}</a>}
          </div>
          <InfoFoto f={fotoCierre} tono="claro" className="mt-10" />
        </div>
      </section>

      {/* pie ---------------------------------------------------------------- */}
      <footer className="ciu-ancho ciu-pie">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="text-[0.95rem] leading-relaxed text-tinta-suave">
            ¿Trabajas en una JAC, una JAL, una entidad o analizas datos? Las cifras con su método, las fuentes y las herramientas de análisis están en <Link to="/tecnico" className="font-semibold underline">OTEA Técnico</Link>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/recorrido" className="boton boton-2 !text-sm">Recorrido de 2 minutos</Link>
            <Link to="/tecnico" className="boton boton-2 !text-sm">Abrir OTEA Técnico</Link>
          </div>
        </div>
        <details className="metodo mt-5">
          <summary>Créditos de las fotos</summary>
          <div className="metodo-cuerpo">
            <ul className="grid gap-1.5">
              {Object.values(FOTOS).map((f) => (
                <li key={f.id}>
                  <strong>{f.descripcion}</strong> {f.autor}, {f.fecha}. {f.publicadaPor}. <a className="underline" href={f.urlLicencia} target="_blank" rel="noopener noreferrer">{f.licencia}</a>. {f.cambios} <a className="underline" href={f.urlOriginal} target="_blank" rel="noopener noreferrer">Original</a>.
                </li>
              ))}
            </ul>
          </div>
        </details>
        <p className="mono mt-4 text-[0.72rem] text-tinta-tenue">OTEA · Observatorio territorial de Santa Cruz · {RETO.nombre}, {RETO.reto.toLowerCase()} · <Link to="/fuentes" className="underline">Fuentes de los datos</Link></p>
      </footer>
    </div>
  );
}
