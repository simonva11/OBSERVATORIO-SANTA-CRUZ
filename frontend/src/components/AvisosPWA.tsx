import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/** Cuenta si hay internet. Escucha los eventos del navegador, que avisan al instante al perder o recuperar la señal. */
function useEnLinea() {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const encender = () => setEnLinea(true);
    const apagar = () => setEnLinea(false);
    window.addEventListener("online", encender);
    window.addEventListener("offline", apagar);
    return () => {
      window.removeEventListener("online", encender);
      window.removeEventListener("offline", apagar);
    };
  }, []);
  return enLinea;
}

/**
 * Tres avisos discretos abajo de la pantalla:
 * - sin conexión (con los datos que ya se guardaron),
 * - lista para usar sin conexión (la primera vez),
 * - hay una versión nueva (la persona decide cuándo recargar).
 */
export default function AvisosPWA() {
  const enLinea = useEnLinea();
  const [volvio, setVolvio] = useState(false);
  const [yaEstaba, setYaEstaba] = useState(true);
  const {
    needRefresh: [hayNueva, setHayNueva],
    offlineReady: [listaOffline, setListaOffline],
    updateServiceWorker,
  } = useRegisterSW();

  // "Conexión recuperada" se muestra unos segundos y se va
  useEffect(() => {
    if (!enLinea) {
      setYaEstaba(false);
      return;
    }
    if (yaEstaba) return;
    setVolvio(true);
    const t = setTimeout(() => setVolvio(false), 4000);
    return () => clearTimeout(t);
  }, [enLinea, yaEstaba]);

  useEffect(() => {
    if (!listaOffline) return;
    const t = setTimeout(() => setListaOffline(false), 6000);
    return () => clearTimeout(t);
  }, [listaOffline, setListaOffline]);

  const caja = "pointer-events-auto flex items-center gap-3 rounded-xl border border-nivel bg-superficie px-4 py-2.5 text-sm text-tinta shadow-sm";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[3000] flex flex-col items-center gap-2 px-4">
      {!enLinea && (
        <p role="status" className={caja}>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ambar" />
          Sin conexión: se muestran los últimos datos guardados. El mapa de fondo puede verse incompleto.
        </p>
      )}
      {volvio && enLinea && (
        <p role="status" className={caja}>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[#2d9a5a]" />
          Conexión recuperada.
        </p>
      )}
      {listaOffline && (
        <p role="status" className={caja}>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[#2d9a5a]" />
          Listo: lo que ya visitó también funciona sin conexión.
        </p>
      )}
      {hayNueva && (
        <div role="alertdialog" aria-label="Actualización disponible" className={caja}>
          <span>Hay una versión nueva del observatorio.</span>
          <button type="button" onClick={() => updateServiceWorker(true)} className="rounded-lg bg-acento px-3 py-1.5 font-medium text-white hover:bg-acento-hondo">
            Actualizar
          </button>
          <button type="button" onClick={() => setHayNueva(false)} className="rounded-lg px-2 py-1.5 font-medium text-tinta-suave hover:bg-acento/10">
            Después
          </button>
        </div>
      )}
    </div>
  );
}
