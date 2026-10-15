import { useState } from "react";

/** Dirección pública de una página del sitio (el sitio usa # en las direcciones). */
export function urlDe(ruta: string) {
  return `${window.location.href.split("#")[0]}#${ruta}`;
}

/**
 * Compartir por WhatsApp. El mensaje es corto, lleva la cifra con su fuente y el enlace; se muestra tal cual antes de enviarlo.
 * Compartir no es presentar una solicitud: el texto lo dice.
 */
export default function Compartir({ mensaje, ruta, titulo = "Compártelo con tus vecinos" }: { mensaje: string; ruta: string; titulo?: string }) {
  const [copiado, setCopiado] = useState<null | "si" | "no">(null);
  const url = urlDe(ruta);
  const completo = `${mensaje} ${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(completo)}`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado("si");
    } catch {
      setCopiado("no");
    }
    setTimeout(() => setCopiado(null), 3500);
  };
  const puedeCompartir = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="ciu-compartir">
      <h3 className="ciu-h3">{titulo}</h3>
      <blockquote className="ciu-mensaje" aria-label="Mensaje que se va a enviar">{mensaje}</blockquote>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="boton ciu-wa">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.3.1.8-.1 1.4Z" /></svg>
          Enviar por WhatsApp
        </a>
        <button type="button" onClick={copiar} className="boton boton-2">Copiar el enlace</button>
        {puedeCompartir && (
          <button type="button" onClick={() => navigator.share({ title: "OTEA · Así vivimos Santa Cruz", text: mensaje, url }).catch(() => undefined)} className="boton boton-2">Más opciones</button>
        )}
      </div>
      <p role="status" className="mt-2 min-h-[1.4rem] text-sm text-tinta-suave">
        {copiado === "si" && "Enlace copiado."}
        {copiado === "no" && "No se pudo copiar. Mantén presionado el enlace del mensaje para copiarlo."}
      </p>
      <p className="mt-1 text-[0.82rem] text-tinta-tenue">Compartir esto no es presentar una solicitud a la Alcaldía: solo ayuda a que más vecinos conozcan la cifra.</p>
    </div>
  );
}
