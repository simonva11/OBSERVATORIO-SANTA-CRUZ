import { Link } from "react-router-dom";
import { type Ciudadano, type Historia } from "../../lib/ciudadano";
import Foto from "./Foto";

/** Tarjeta de un problema: imagen, la frase que lo resume y la cifra principal en palabras. */
export default function TarjetaHistoria({ h, c, barrio }: { h: Historia; c: Ciudadano; barrio?: string }) {
  const k = h.cifra(c);
  return (
    <Link to={`/historias/${h.id}${barrio ? `?barrio=${barrio}` : ""}`} className="ciu-tarjeta group" style={{ ["--tono" as string]: h.color }}>
      <Foto id={h.foto} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col p-5">
        <p className="ciu-tema"><span aria-hidden="true">{h.numero}</span> {h.titulo}</p>
        <h3 className="ciu-tarjeta-frase">{h.frase}</h3>
        <p className="mt-3 text-[0.95rem] leading-snug text-tinta-suave">
          <strong className="text-[1.15rem] font-extrabold text-tinta">{k.valor}</strong> {k.texto}
        </p>
        <span className="siguiente-a mt-auto pt-4 !text-[0.98rem]">Conocer este problema <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></span>
      </div>
    </Link>
  );
}
