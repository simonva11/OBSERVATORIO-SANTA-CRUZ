import { calcularIndice } from "./indice";
import type { Indicadores } from "./tipos";

const celda = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Comillas dobles, y un apóstrofo delante si empieza como fórmula (evita que Excel ejecute texto).
  const seguro = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
  return /[",\n;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

/** CSV de los 11 barrios: cifras + índice de entorno. Cada fila trae su fuente y la fecha del cálculo. */
export function csvBarrios(ind: Indicadores): string {
  const idx = new Map(calcularIndice(ind).map((p) => [p.codigo, p]));
  const acc = (ind.accesibilidad?.barrios as Record<string, number | string | null>[] | undefined) ?? [];
  const cols = ["codigo", "barrio", "poblacion_2018", "viviendas_2018", "area_ha", "densidad_hab_ha", "espacio_publico_m2_hab", "equipamientos", "amenaza_alta_pct", "atropellos", "siniestros_viales", "minutos_al_metro", "indice_entorno", "fuente", "calculado"];
  const filas = ind.barrios.map((b) => [
    b.codigo, b.nombre, b.poblacion_2018, b.viviendas_2018, b.area_ha, b.densidad_hab_ha, b.espacio_publico_m2_hab, b.equipamientos, b.amenaza_alta_pct, b.atropellos, b.siniestros_viales,
    acc.find((x) => x.barrio === b.nombre)?.transporte_masivo_promedio_min ?? "", idx.get(b.codigo)?.total ?? "",
    "Alcaldía de Medellín y DANE (Censo 2018); indice_entorno es un puntaje relativo entre barrios, no oficial", ind.generado,
  ]);
  return [cols, ...filas].map((f) => f.map(celda).join(",")).join("\r\n");
}

/** Baja el texto como archivo (con BOM para que Excel respete las tildes). */
export function descargar(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob(["﻿", texto], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
