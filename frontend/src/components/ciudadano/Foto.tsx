import { Link } from "react-router-dom";
import { fotoReal, FOTOS, type IdFoto } from "../../lib/fotos";
import { HISTORIAS, useCiudadano } from "../../lib/ciudadano";
import MapaBarrios from "./MapaBarrios";

/**
 * Imagen de un tema. Si el equipo ya copió una foto real a src/assets/fotos/ (ver LEEME.md), se muestra esa con su pie de foto.
 * Mientras no exista, se muestra una ilustración hecha con los datos del propio barrio y dice con claridad que lo es:
 * nunca se presenta una ilustración como si fuera una foto de Santa Cruz.
 */
export default function Foto({ id, className = "", prioridad = false }: { id: IdFoto; className?: string; prioridad?: boolean }) {
  const real = fotoReal(id);
  if (real) {
    return (
      <figure className={`ciu-foto ${className}`}>
        <img src={real.src} alt={real.alt} loading={prioridad ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
        {(real.lugar || real.credito) && (
          <figcaption className="ciu-foto-pie">{[real.lugar, real.credito && `Foto: ${real.credito}`].filter(Boolean).join(" · ")}</figcaption>
        )}
      </figure>
    );
  }
  return <Ilustracion id={id} className={className} />;
}

function Ilustracion({ id, className }: { id: IdFoto; className: string }) {
  const ciu = useCiudadano();
  const h = HISTORIAS.find((x) => x.foto === id);
  const color = h?.color ?? "#1f40cc";
  // Portada: los barrios en tonos de la marca según cuánta gente vive en cada uno. Historias: el dato del tema.
  const valores = ciu.estado === "listo" ? Object.fromEntries(ciu.datos.barrios.map((b) => [b.codigo, h ? h.mapa.valor(b) : b.personas])) : {};
  return (
    <figure className={`ciu-foto ciu-ilustracion ${className}`} style={{ ["--tono" as string]: color }}>
      <div className="grid h-full w-full place-items-center p-4" role="img" aria-label={`Ilustración con los barrios de la comuna. ${FOTOS[id].alt}`}>
        <div className="w-full max-w-[17rem]">
          <MapaBarrios mini valores={valores} color={color} invertir={h?.mapa.invertir} unidad="" formato={String} />
        </div>
      </div>
      <figcaption className="ciu-foto-pie">
        {id === "portada" ? "Ilustración: los 11 barrios de la comuna, más oscuro donde vive más gente." : "Ilustración con datos del barrio."} <span className="whitespace-nowrap">Aquí irá una foto real de Santa Cruz.</span>
      </figcaption>
    </figure>
  );
}

/** Aviso corto de pie de página para las fotos pendientes (solo se ve mientras falte alguna). */
export function AvisoFotos() {
  const faltan = (Object.keys(FOTOS) as IdFoto[]).filter((i) => !fotoReal(i));
  if (!faltan.length) return null;
  return (
    <p className="text-[0.82rem] text-tinta-tenue">
      Las imágenes con mapa son ilustraciones hechas con datos. Las fotos reales de Santa Cruz se agregan copiándolas a una carpeta del proyecto; <Link to="/identidad" className="underline">cómo hacerlo</Link>.
    </p>
  );
}
