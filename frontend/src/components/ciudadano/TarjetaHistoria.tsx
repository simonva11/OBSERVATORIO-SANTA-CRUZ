import { Link } from "react-router-dom";
import { type Ciudadano, type Historia } from "../../lib/ciudadano";
import Foto from "./Foto";

/**
 * Puerta de entrada a una historia. Tres composiciones para que la grilla tenga ritmo y no sean cuatro cajas iguales:
 *  - grande: foto a todo el bloque y el texto encima, sobre un degradado que asegura el contraste.
 *  - normal: foto arriba y texto abajo.
 *  - ancha: foto a un lado y texto al otro.
 * El crédito de la foto va siempre visible; el enlace cubre la tarjeta pero el crédito queda por encima y se puede abrir.
 */
export default function TarjetaHistoria({ h, c, barrio, variante = "normal" }: { h: Historia; c: Ciudadano; barrio?: string; variante?: "grande" | "normal" | "ancha" }) {
  const k = h.cifra(c);
  const to = `/historias/${h.id}${barrio ? `?barrio=${barrio}` : ""}`;
  const estilo = { ["--tono" as string]: h.color };
  const texto = (claro: boolean) => (
    <>
      <p className={`ciu-tema ${claro ? "ciu-tema-claro" : ""}`}><span aria-hidden="true">{h.numero}</span> {h.titulo}</p>
      <h3 className={`ciu-tarjeta-frase ${variante === "grande" ? "!text-[clamp(1.6rem,3vw,2.35rem)]" : ""}`}>
        <Link to={to} className="ciu-enlace-cubre">{h.pregunta}</Link>
      </h3>
      <p className={`mt-3 text-[0.98rem] leading-snug ${claro ? "text-white/85" : "text-tinta-suave"}`}>
        <strong className={`text-[1.2rem] font-extrabold ${claro ? "text-white" : "text-tinta"}`}>{k.valor}</strong> {k.texto}
      </p>
      <span className={`mt-auto inline-flex items-center gap-1.5 pt-4 text-[0.98rem] font-semibold ${claro ? "text-white" : "text-marca"}`} aria-hidden="true">
        Conocer la historia <span className="transition group-hover:translate-x-1">→</span>
      </span>
    </>
  );

  if (variante === "grande") {
    return (
      <article className="ciu-tarjeta ciu-tarjeta-grande group" style={estilo}>
        <Foto id={h.foto} relleno sizes="(min-width: 1024px) 66vw, 100vw" creditoArriba tono="oscuro" />
        <div className="ciu-velo" aria-hidden="true" />
        <div className="relative z-[1] mt-auto flex flex-col p-6 text-white md:p-8">{texto(true)}</div>
      </article>
    );
  }
  if (variante === "ancha") {
    return (
      <article className="ciu-tarjeta ciu-tarjeta-ancha group" style={estilo}>
        <Foto id={h.foto} className="aspect-[16/10] w-full md:aspect-auto md:h-full" sizes="(min-width: 768px) 50vw, 100vw" />
        <div className="flex flex-1 flex-col p-6 md:p-8">{texto(false)}</div>
      </article>
    );
  }
  return (
    <article className="ciu-tarjeta group" style={estilo}>
      <Foto id={h.foto} className="aspect-[4/3] w-full" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
      <div className="flex flex-1 flex-col p-5">{texto(false)}</div>
    </article>
  );
}
