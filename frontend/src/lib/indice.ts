import type { Indicadores } from "./tipos";

/**
 * Índice de entorno (0 a 100) por barrio. Es RELATIVO: compara los barrios de la comuna entre sí
 * (el mejor de cada componente vale 100, el peor 0) y promedia cuatro componentes con el mismo peso.
 * No es una medida oficial; sirve para ordenar y ver dónde pesa cada cosa.
 */
export type Componente = { clave: string; nombre: string; valor: number | null; unidad: string; mayorEsMejor: boolean; puntos: number };
export type Puntaje = { codigo: string; nombre: string; total: number; componentes: Componente[] };

type Fila = Record<string, number | string | null>;

export function calcularIndice(ind: Indicadores): Puntaje[] {
  const acc = (ind.accesibilidad?.barrios as Fila[] | undefined) ?? [];
  const crudo = ind.barrios.map((b) => ({
    b,
    vals: [
      { clave: "ep", nombre: "Espacio público por habitante", valor: b.espacio_publico_m2_hab, unidad: "m²", mayorEsMejor: true },
      { clave: "acc", nombre: "Minutos al Metro o Metrocable", valor: (acc.find((x) => x.barrio === b.nombre)?.transporte_masivo_promedio_min as number | undefined) ?? null, unidad: "min", mayorEsMejor: false },
      { clave: "vial", nombre: "Atropellos por 1.000 habitantes", valor: b.poblacion_2018 ? (b.atropellos / b.poblacion_2018) * 1000 : null, unidad: "", mayorEsMejor: false },
      { clave: "riesgo", nombre: "Superficie con amenaza alta", valor: b.amenaza_alta_pct, unidad: "%", mayorEsMejor: false },
    ],
  }));
  const rango = (i: number) => {
    const v = crudo.map((c) => c.vals[i].valor).filter((x): x is number => x != null);
    return { min: Math.min(...v), max: Math.max(...v) };
  };
  const rangos = [0, 1, 2, 3].map(rango);
  return crudo
    .map(({ b, vals }) => {
      const componentes = vals.map((v, i) => {
        const { min, max } = rangos[i];
        // Sin dato cuenta 0: un barrio sin cifra no se premia.
        const t = v.valor == null || max === min ? 0 : (v.valor - min) / (max - min);
        return { ...v, puntos: Math.round(100 * (v.mayorEsMejor ? t : 1 - t)) };
      });
      return { codigo: b.codigo, nombre: b.nombre, componentes, total: Math.round(componentes.reduce((s, c) => s + c.puntos, 0) / componentes.length) };
    })
    .sort((a, b) => b.total - a.total);
}
