import { FOTOS, creditoCorto, fuentesFoto, type Foto as TFoto } from "../../lib/fotos";

/**
 * Fotografía del catálogo con su crédito. Reserva el espacio (no hace saltar la página), carga diferida fuera de
 * pantalla y srcset para no bajar más píxeles de los que se ven.
 *
 * - `relleno`: la foto cubre su contenedor (que debe ser `relative`); se usa en portadas y fondos.
 * - Sin `relleno`, el tamaño lo da `className` (por ejemplo `aspect-[4/3] w-full`).
 */
export default function Foto({
  id, className = "", sizes = "(min-width: 1024px) 50vw, 100vw", prioridad = false, relleno = false, credito = "esquina", tono = "claro", creditoArriba = false,
}: {
  id: string;
  className?: string;
  sizes?: string;
  prioridad?: boolean;
  relleno?: boolean;
  /** Dónde va el crédito: sobre la foto, debajo, o en ninguna parte (cuando otro elemento ya lo muestra). */
  credito?: "esquina" | "pie" | "ninguno";
  tono?: "claro" | "oscuro";
  /** El crédito arriba a la derecha, cuando abajo hay texto o botones encima de la foto. */
  creditoArriba?: boolean;
}) {
  const f = FOTOS[id];
  if (!f) return null;
  const { src, srcSet } = fuentesFoto(f);
  const img = (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={f.alt}
      loading={prioridad ? "eager" : "lazy"}
      decoding="async"
      // @ts-expect-error fetchpriority aún no está en los tipos de React 18
      fetchpriority={prioridad ? "high" : undefined}
      width={1280}
      height={Math.round(1280 / f.proporcion)}
      className="h-full w-full object-cover"
      style={{ objectPosition: f.foco ?? "50% 50%" }}
    />
  );
  if (relleno) {
    return (
      <>
        <div className={`absolute inset-0 ${className}`} style={{ background: f.color }}>{img}</div>
        {credito === "esquina" && <InfoFoto f={f} className={`absolute right-2 z-[3] ${creditoArriba ? "info-foto-abajo top-2" : "bottom-2"}`} tono={tono} />}
      </>
    );
  }
  return (
    <figure className={`ciu-foto ${className}`} style={{ background: f.color }}>
      {img}
      {credito === "esquina" && <InfoFoto f={f} className="absolute bottom-2 right-2" tono="oscuro" />}
      {credito === "pie" && (
        <figcaption className="ciu-foto-pie-abajo">
          <span>{f.descripcion}</span> <InfoFoto f={f} tono="claro" enLinea />
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Crédito plegable: muestra autor y licencia; al abrirlo, el lugar (y si está confirmado), dónde se publicó, la fecha
 * y lo que OTEA le cambió. Es un <details>, así que funciona con teclado y sin JavaScript extra.
 */
export function InfoFoto({ f, className = "", tono = "oscuro", enLinea = false }: { f: TFoto; className?: string; tono?: "claro" | "oscuro"; enLinea?: boolean }) {
  return (
    <details className={`info-foto ${tono === "oscuro" ? "info-foto-oscuro" : "info-foto-claro"} ${enLinea ? "inline-block align-baseline" : ""} ${className}`}>
      <summary aria-label={`Sobre esta foto: ${creditoCorto(f)}`}>
        <span aria-hidden="true" className="info-foto-i">i</span>
        <span>{creditoCorto(f)}</span>
      </summary>
      <div className="info-foto-cuerpo">
        <p><strong>Lugar:</strong> {f.lugar}</p>
        <p><strong>Fecha:</strong> {f.fecha}</p>
        <p><strong>Publicada por:</strong> {f.publicadaPor}</p>
        <p><strong>Licencia:</strong> <a href={f.urlLicencia} target="_blank" rel="noopener noreferrer">{f.licencia}</a>. {f.cambios}</p>
        <p><a href={f.urlOriginal} target="_blank" rel="noopener noreferrer">Ver la foto original</a></p>
      </div>
    </details>
  );
}
