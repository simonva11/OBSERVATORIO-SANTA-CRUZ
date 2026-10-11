import { useEffect, useState } from "react";

/**
 * Carga de datos. En el prototipo todo se lee de archivos estáticos en /data.
 * Cuando exista el backend con base de datos, solo cambia esta función:
 * el resto de la aplicación sigue igual.
 */
const BASE = `${import.meta.env.BASE_URL}data/`;
const cache = new Map<string, Promise<unknown>>();

export function cargar<T>(archivo: string): Promise<T> {
  if (!cache.has(archivo)) {
    const p = fetch(BASE + archivo)
      .catch(() => {
        // Sin red y sin copia guardada: un mensaje claro en lugar del texto técnico del navegador
        throw new Error(navigator.onLine === false ? "sin conexión y este dato aún no está guardado en el dispositivo." : "no se pudo descargar el dato, revise la conexión.");
      })
      .then(async (r) => {
      if (!r.ok) throw new Error(`No se pudo leer ${archivo} (HTTP ${r.status}).`);
      return r.json();
    });
    p.catch(() => cache.delete(archivo)); // permite reintentar
    cache.set(archivo, p);
  }
  return cache.get(archivo) as Promise<T>;
}

export type Estado<T> =
  | { estado: "cargando" }
  | { estado: "error"; error: string; reintentar: () => void }
  | { estado: "listo"; datos: T };

export function useDatos<T>(archivo: string | null): Estado<T> {
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState<Estado<T>>({ estado: "cargando" });

  useEffect(() => {
    if (!archivo) return;
    let vivo = true;
    setEstado({ estado: "cargando" });
    cargar<T>(archivo)
      .then((datos) => vivo && setEstado({ estado: "listo", datos }))
      .catch((e: Error) =>
        vivo && setEstado({ estado: "error", error: e.message, reintentar: () => setIntento((i) => i + 1) }),
      );
    return () => {
      vivo = false;
    };
  }, [archivo, intento]);

  return estado;
}
