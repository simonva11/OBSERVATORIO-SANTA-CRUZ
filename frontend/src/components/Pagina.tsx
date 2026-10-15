import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import IconoNav from "./IconosNav";
import { Cuenta, Revelar, useVisto } from "./Animacion";
import { acentoDeRuta } from "../lib/marca";
import { esCiudadana } from "../lib/experiencia";
import { GRUPOS } from "../lib/menu";
import { useDatos } from "../lib/datos";
import { fecha } from "../lib/formato";

/* =====================================================================================================
 * Sistema de componentes de OTEA.
 * Cada bloque de datos responde una pregunta, dice de dónde sale el dato y de qué fecha es, explica qué
 * no se puede concluir y propone qué hacer después. Por eso Seccion, Kpi y Fuente traen esas piezas.
 * ===================================================================================================== */

/** Grupo y módulo de la ruta actual, para las migas de pan. */
function ubicacion(pathname: string) {
  for (const g of GRUPOS)
    for (const m of g.modulos) if (m.ruta !== "/" && (pathname === m.ruta || pathname.startsWith(`${m.ruta}/`))) return { grupo: g, modulo: m };
  return null;
}

/** Encabezado de cada módulo: migas, la pregunta que responde la página, una entrada breve y las acciones. */
export function Cabecera({
  etiqueta, titulo, texto, icono, children, className = "", pregunta,
}: { etiqueta: string; titulo: string; texto: ReactNode; icono?: string; children?: ReactNode; className?: string; pregunta?: string }) {
  const { pathname } = useLocation();
  const a = acentoDeRuta(pathname);
  const u = ubicacion(pathname);
  return (
    <header className={`cabecera ${className}`} style={{ ["--tono" as string]: a.medio }}>
      <nav aria-label="Ruta" className="migas">
        {esCiudadana(pathname) ? <Link to="/">Inicio</Link> : <Link to="/tecnico">OTEA Técnico</Link>}
        {u && u.grupo.modulos.length > 1 && (
          <>
            <span aria-hidden="true">/</span>
            <span>{u.grupo.titulo}</span>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-tinta">{u ? u.modulo.nombre : etiqueta}</span>
      </nav>
      <div className="cabecera-cuerpo">
        <div className="min-w-0 flex-1 basis-[26rem]">
          <p className="cabecera-ojo">
            {icono && <IconoNav nombre={icono} className="h-4 w-4" trazo={2} />}
            {etiqueta}
          </p>
          <h1 className="cabecera-titulo">{titulo}</h1>
          <div className="cabecera-texto">{texto}</div>
          {pregunta && (
            <p className="cabecera-pregunta">
              <span>Esta página responde</span> {pregunta}
            </p>
          )}
        </div>
        {children && <div className="cabecera-acciones">{children}</div>}
      </div>
      <div className="regla" aria-hidden="true" />
    </header>
  );
}

/** Botón de la cabecera: el principal va lleno, el secundario con contorno. */
export function BotonCabecera({ to, children, claro = false }: { to: string; children: ReactNode; claro?: boolean }) {
  return (
    <Link to={to} className={claro ? "boton boton-2" : "boton boton-1"}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ fuentes y tipos de dato */

type FuenteCat = { id: string; nombre: string; entidad: string; ultima_actualizacion_en_datos: string | null; fecha_descarga: string; licencia: string | null };

/** Clase de cada dato: no se mezclan sin decirlo. */
export type ClaseDato = "oficial" | "entregado" | "derivado" | "ciudadano" | "prensa" | "demostrativo" | "pendiente";
const CLASE: Record<ClaseDato, { t: string; c: string }> = {
  oficial: { t: "Oficial abierto", c: "clase-oficial" },
  entregado: { t: "Entregado, no abierto", c: "clase-entregado" },
  derivado: { t: "Cálculo de OTEA", c: "clase-derivado" },
  ciudadano: { t: "Reporte ciudadano", c: "clase-ciudadano" },
  prensa: { t: "Prensa", c: "clase-prensa" },
  demostrativo: { t: "Demostrativo", c: "clase-demo" },
  pendiente: { t: "Por verificar", c: "clase-pendiente" },
};
export function EtiquetaClase({ clase }: { clase: ClaseDato }) {
  return <span className={`clase ${CLASE[clase].c}`}>{CLASE[clase].t}</span>;
}

/** Clase de un conjunto del catálogo, a partir de sus condiciones de uso. */
export function claseDeFuente(f: Pick<FuenteCat, "licencia">): ClaseDato {
  const l = (f.licencia ?? "").toLowerCase();
  if (l.includes("no son datos abiertos") || l.includes("entregados")) return "entregado";
  return "oficial";
}

/** Atribución de un dato: entidad, fecha y clase, con enlace al catálogo de fuentes. */
export function Fuente({ ids = [], calculo, texto, clase, className = "" }: { ids?: string[]; calculo?: string; texto?: ReactNode; clase?: ClaseDato; className?: string }) {
  const cat = useDatos<FuenteCat[]>(ids.length ? "fuentes.json" : null);
  const fs = cat.estado === "listo" ? ids.map((i) => cat.datos.find((f) => f.id === i)).filter((f): f is FuenteCat => !!f) : [];
  const entidades = [...new Set(fs.map((f) => f.entidad.split(",")[0].split("(")[0].trim()))];
  const fechas = fs.map((f) => f.ultima_actualizacion_en_datos).filter((x): x is string => !!x).sort();
  const descarga = fs.map((f) => f.fecha_descarga).sort().slice(-1)[0];
  const cl: ClaseDato = clase ?? (calculo ? "derivado" : fs.some((f) => claseDeFuente(f) === "entregado") ? "entregado" : "oficial");
  return (
    <p className={`fuente ${className}`}>
      <EtiquetaClase clase={cl} />
      <span>
        <span className="fuente-r">Fuente</span>{" "}
        {texto ?? (entidades.length ? entidades.join(" · ") : ids.length ? "cargando…" : "")}
        {calculo && <> · {calculo}</>}
        {fechas.length > 0 && <> · {calculo ? "datos base a" : "datos a"} {fecha(fechas[fechas.length - 1])}</>}
        {!fechas.length && descarga && <> · consultado {fecha(descarga.slice(0, 10))}</>}
      </span>
      {ids.length > 0 && (
        <Link to={`/fuentes?f=${ids[0]}`} className="fuente-enlace">
          Ver ficha
        </Link>
      )}
    </p>
  );
}

/** Nota plegable: cómo se calculó y qué no se puede concluir. */
export function Metodo({ titulo = "Cómo se calculó y qué no dice", children }: { titulo?: string; children: ReactNode }) {
  return (
    <details className="metodo">
      <summary>{titulo}</summary>
      <div className="metodo-cuerpo">{children}</div>
    </details>
  );
}

/** Qué hacer con lo que se acaba de ver. */
export function Siguiente({ acciones }: { acciones: { to: string; texto: string }[] }) {
  return (
    <div className="siguiente">
      <span className="siguiente-r">Siguiente paso</span>
      {acciones.map((a) => (
        <Link key={a.to + a.texto} to={a.to} className="siguiente-a">
          {a.texto}
          <IconoNav nombre="flecha" className="h-3.5 w-3.5" trazo={2.2} />
        </Link>
      ))}
    </div>
  );
}

/** Aviso con tono: limitación, dato demostrativo o algo que hay que saber antes de leer. */
export function Aviso({ tono = "info", titulo, children }: { tono?: "info" | "ojo" | "demo"; titulo?: string; children: ReactNode }) {
  return (
    <div role="note" className={`aviso aviso-${tono}`}>
      {titulo && <p className="aviso-t">{titulo}</p>}
      <div>{children}</div>
    </div>
  );
}

/** Estado vacío: qué falta, por qué importa y cómo se podría completar. */
export function EstadoVacio({ titulo, children, accion }: { titulo: string; children: ReactNode; accion?: { to: string; texto: string } }) {
  return (
    <div className="vacio">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-10 w-10 shrink-0">
        <path d="M6 38c8-3 12-12 20-14s12-10 16-16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 4" />
        <circle cx="26" cy="24" r="3" fill="currentColor" />
      </svg>
      <div>
        <p className="font-semibold text-tinta">{titulo}</p>
        <div className="mt-1 text-sm text-tinta-suave">{children}</div>
        {accion && (
          <Link to={accion.to} className="mt-2 inline-flex text-sm font-semibold text-marca hover:underline">
            {accion.texto}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ sección */

/**
 * Sección: una pregunta, su respuesta y lo que la respalda.
 * `pregunta` va arriba en letra técnica; `fuente`, `metodo` y `siguiente` cierran el bloque.
 */
export function Seccion({
  id, titulo, texto, derecha, mitad = false, children, pregunta, fuente, metodo, siguiente,
}: {
  id: string; mitad?: boolean; titulo: string; texto?: ReactNode; derecha?: ReactNode; children: ReactNode;
  pregunta?: string; fuente?: ReactNode; metodo?: ReactNode; siguiente?: { to: string; texto: string }[];
}) {
  return (
    <Revelar className={mitad ? "col-mitad" : ""}>
      <section aria-labelledby={id} className="seccion">
        <div className="seccion-cabeza">
          <div className="min-w-0">
            {pregunta && <p className="seccion-pregunta">{pregunta}</p>}
            <h2 id={id} className="seccion-titulo">{titulo}</h2>
            {texto && <div className="seccion-texto">{texto}</div>}
          </div>
          {derecha}
        </div>
        {children}
        {(fuente || metodo || siguiente) && (
          <div className="seccion-pie">
            {fuente}
            {metodo && <Metodo>{metodo}</Metodo>}
            {siguiente && <Siguiente acciones={siguiente} />}
          </div>
        )}
      </section>
    </Revelar>
  );
}

/* ------------------------------------------------------------------ cifras */

/** Si el valor es un número en formato colombiano ("3.336", "12,2 min", "91 %"), cuenta desde 0 al aparecer. */
function ValorAnimado({ valor }: { valor: ReactNode }) {
  const [ref, visto] = useVisto<HTMLSpanElement>(0.1);
  const m = typeof valor === "string" ? /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(.*)$/.exec(valor) : null;
  if (!m || (m[1].length > 1 && m[1].startsWith("0") && !m[2])) return <>{valor}</>;
  const hasta = Number(m[1].replace(/\./g, "") + (m[2] ? "." + m[2] : ""));
  return (
    <span ref={ref}>
      <Cuenta hasta={hasta} decimales={m[2]?.length ?? 0} activo={visto} duracion={700} />
      {m[3]}
    </span>
  );
}

/**
 * Cifra con contexto: qué mide (texto), el valor, con qué compararlo (nota) y, si se da, la fuente.
 * Sin caja: una raya arriba la separa, como en un informe. `tono` marca si el dato es bueno, regular o malo.
 */
export function Kpi({ valor, texto, nota, tono = "verde", grande = false, fuente }: { valor: ReactNode; texto: ReactNode; nota?: ReactNode; tono?: "verde" | "ambar" | "rojo"; grande?: boolean; fuente?: ReactNode }) {
  const estado = tono === "rojo" ? "mal" : tono === "ambar" ? "ojo" : "neutro";
  return (
    <div className={`cifra cifra-${estado} kpi-tarjeta`}>
      <p className="cifra-texto">{texto}</p>
      <p className={`cifra-valor tabular-nums ${grande ? "cifra-grande" : ""}`}><ValorAnimado valor={valor} /></p>
      {nota && <p className="cifra-nota">{nota}</p>}
      {fuente && <div className="cifra-fuente">{fuente}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ navegación entre módulos */

const RELACIONES: Record<string, { ruta: string; icono: string; nombre: string; texto: string }> = {
  mapa: { ruta: "/mapa", icono: "mapa", nombre: "Mapa territorial", texto: "Ver todas las capas sobre el territorio" },
  reclamos: { ruta: "/reclamos", icono: "alerta", nombre: "Huecos y reclamos", texto: "Lo que la gente ya le reportó a la Alcaldía" },
  problematicas: { ruta: "/problematicas", icono: "alerta", nombre: "Problemáticas", texto: "Ocho problemas de la comuna, cada uno con su evidencia" },
  corredor: { ruta: "/corredor-49", icono: "corredor", nombre: "Corredor Carrera 49", texto: "A quién le sirve ir por la 49" },
  indicadores: { ruta: "/indicadores", icono: "indicadores", nombre: "Indicadores", texto: "Comparar barrios cifra por cifra" },
  accesibilidad: { ruta: "/accesibilidad", icono: "accesibilidad", nombre: "Accesibilidad", texto: "Minutos caminando a Metro, colegio, salud y parque" },
  prioridades: { ruta: "/prioridades", icono: "prioridades", nombre: "Prioridad de obras", texto: "Qué obras podrían ayudar a más gente primero" },
  datos: { ruta: "/datos", icono: "subir", nombre: "Mis datos", texto: "Cruzar tus propios datos con el mapa" },
  radar: { ruta: "/radar", icono: "radar", nombre: "Radar de noticias", texto: "Qué dicen los medios de la comuna" },
  propuesta: { ruta: "/propuesta", icono: "corazon", nombre: "Propuesta de valor", texto: "Para quién sirve OTEA y qué hace hoy" },
  inmobiliario: { ruta: "/inmobiliario", icono: "cubo", nombre: "Mercado y POT", texto: "Oferta publicada y norma del POT por barrio" },
  riesgo: { ruta: "/riesgo", icono: "ladera", nombre: "Riesgo de ladera", texto: "Gente y viviendas en zonas de amenaza" },
  residuos: { ruta: "/residuos", icono: "residuos", nombre: "Residuos por barrio", texto: "Toneladas de residuos al mes por barrio" },
  fuentes: { ruta: "/fuentes", icono: "fuentes", nombre: "Fuentes y calidad", texto: "De dónde sale cada dato y qué tan nuevo es" },
  identidad: { ruta: "/identidad", icono: "paleta", nombre: "Manual de identidad", texto: "Colores, letras, voz y reglas del sitio" },
  barrio: { ruta: "/barrios", icono: "personas", nombre: "Mi barrio", texto: "Todo lo que se sabe de un barrio, en una ficha" },
  lideres: { ruta: "/lideres", icono: "estrella", nombre: "Kit para líderes", texto: "Cartas, plazos y a quién acudir" },
  "hist-mayores": { ruta: "/historias/movilidad-mayores", icono: "personas", nombre: "Versión para vecinos", texto: "Esta cifra contada en sencillo: personas mayores y el Metro" },
  "hist-basuras": { ruta: "/historias/basuras", icono: "residuos", nombre: "Versión para vecinos", texto: "Las toneladas de residuos contadas en sencillo" },
  "hist-huecos": { ruta: "/historias/huecos", icono: "alerta", nombre: "Versión para vecinos", texto: "Los huecos reportados contados en sencillo" },
  "hist-espacio": { ruta: "/historias/espacio-publico", icono: "indicadores", nombre: "Versión para vecinos", texto: "El espacio público por persona contado en sencillo" },
  participacion: { ruta: "/participacion", icono: "participacion", nombre: "Participación", texto: "Reportar un problema en tu cuadra" },
};

/** Cierre de cada página: tres módulos que continúan lo que se acaba de ver. */
export function Relacionados({ ids, className = "" }: { ids: (keyof typeof RELACIONES)[]; className?: string }) {
  return (
    <Revelar className={className}>
      <section aria-label="Sigue por aquí" className="relacionados">
        <p className="relacionados-r">Sigue por aquí</p>
        <div className="relacionados-lista">
          {ids.map((id) => {
            const r = RELACIONES[id];
            return (
              <Link key={id} to={r.ruta} className="relacionado group">
                <span className="relacionado-icono">
                  <IconoNav nombre={r.icono} className="h-5 w-5" trazo={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-tight">{r.nombre}</span>
                  <span className="block text-sm text-tinta-suave">{r.texto}</span>
                </span>
                <IconoNav nombre="flecha" className="h-4 w-4 shrink-0 text-tinta-tenue transition group-hover:translate-x-0.5 group-hover:text-marca" trazo={2} />
              </Link>
            );
          })}
        </div>
      </section>
    </Revelar>
  );
}
