import { useEffect, useState } from "react";
import { cargar } from "./datos";

export type Pulso = { clave: string; valor: number | null; texto: string; modulo: string; ruta: string; nota: string | null };
export type Resumen = {
  generado: string;
  comuna: { nombre: string; poblacion_2018: number; viviendas_2018: number; barrios: number; area_ha: number; densidad_hab_ha: number };
  pulso: Pulso[];
  datos: { fuentes: number; capas: number; calculo_indicadores: string | null };
};

/** Dirección de la API. Se cambia con VITE_API_URL al compilar. */
export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

/**
 * Resumen de la portada. Primero le pregunta a la API (GET /api/inicio); si no está encendida
 * o tarda más de 1,5 s, lee el archivo estático inicio.json que genera `python -m app.resumen`.
 */
export function useResumen() {
  const [r, setR] = useState<{ datos: Resumen; origen: "api" | "archivo" } | null>(null);
  useEffect(() => {
    let vivo = true;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1500);
    fetch(`${API}/api/inicio`, { signal: ctl.signal })
      .then((x) => (x.ok ? (x.json() as Promise<Resumen>) : Promise.reject(new Error("API"))))
      .then((datos) => vivo && setR({ datos, origen: "api" }))
      .catch(() =>
        cargar<Resumen>("inicio.json")
          .then((datos) => vivo && setR({ datos, origen: "archivo" }))
          .catch(() => undefined),
      )
      .finally(() => clearTimeout(t));
    return () => {
      vivo = false;
      ctl.abort();
    };
  }, []);
  return r;
}
