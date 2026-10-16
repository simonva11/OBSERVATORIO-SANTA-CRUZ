import { useCallback, useEffect, useState } from "react";

/**
 * Recorrido de presentación: siete paradas por páginas reales de OTEA, en el orden en que se cuenta el proyecto.
 * No simula nada: cada paso abre la página de verdad y dice qué mostrar. El guion completo del video está en
 * docs/guion-video.md y usa estas mismas paradas.
 */
export interface Paso {
  ruta: string;
  titulo: string;
  /** Qué mostrar en pantalla. */
  mostrar: string;
  /** Línea sugerida para narrar (español de Colombia, natural). */
  decir: string;
  segundos: string;
}

export const PASOS: Paso[] = [
  {
    ruta: "/",
    titulo: "Santa Cruz es la protagonista",
    mostrar: "La portada con la foto de la calle. Bajar despacio hasta «Lo que vivimos todos los días».",
    decir: "Esta es Santa Cruz, la Comuna 2 de Medellín. Once barrios, más de cien mil personas, y muchas cosas que vivimos todos los días sin una forma sencilla de entenderlas.",
    segundos: "0–15",
  },
  {
    ruta: "/historias/huecos",
    titulo: "Un problema cotidiano",
    mostrar: "La historia de los huecos: la foto, la cifra de reportes y la barra de qué pasó con ellos.",
    decir: "Un hueco lo ve todo el barrio. OTEA cuenta cuántos se han reportado, cuántos se arreglaron, cuántos siguen pendientes y cuánto se demoran. Dicho en sencillo y con su fuente.",
    segundos: "15–35",
  },
  {
    ruta: "/mapa-vecinos?pregunta=huecos",
    titulo: "Del relato al mapa",
    mostrar: "El mapa para vecinos con la pregunta «¿Dónde han reportado huecos?». Tocar un punto para abrir su ficha.",
    decir: "La misma historia en el mapa: cualquier vecino elige una pregunta y ve dónde pasa, sin saber de mapas ni de capas.",
    segundos: "35–50",
  },
  {
    ruta: "/reclamos",
    titulo: "La evidencia detrás",
    mostrar: "El módulo técnico de huecos y reclamos: reportes por barrio, tiempos de arreglo y pendientes.",
    decir: "Y si eres de la JAC, de la JAL o trabajas en una entidad, un clic te lleva al análisis completo: por barrio, por año y por estado.",
    segundos: "50–65",
  },
  {
    ruta: "/fuentes?f=huecos",
    titulo: "De dónde sale el dato",
    mostrar: "La ficha de la fuente: entidad, fecha, licencia y lo que el dato no permite concluir.",
    decir: "Cada cifra dice de dónde sale, de qué fecha es y qué no se puede concluir con ella. Nada inventado, nada escondido.",
    segundos: "65–78",
  },
  {
    ruta: "/accesibilidad",
    titulo: "Información para decidir",
    mostrar: "El módulo de accesibilidad: minutos caminando al Metro por barrio y su método.",
    decir: "Con la misma información se analiza cuánto camina la gente hasta el Metro o qué obra ayudaría a más personas. Herramientas para decidir con evidencia.",
    segundos: "78–95",
  },
  {
    ruta: "/propuesta",
    titulo: "Por qué importa OTEA",
    mostrar: "La propuesta de valor: dos experiencias, qué funciona hoy y qué falta.",
    decir: "OTEA convierte datos regados en algo que la comunidad entiende y los líderes pueden usar. Hoy funciona en Santa Cruz, y se puede llevar a otros territorios. Apóyanos para que crezca.",
    segundos: "95–115",
  },
];

const CLAVE = "observatorio-santa-cruz:recorrido";

function leer(): number | null {
  try {
    const v = sessionStorage.getItem(CLAVE);
    return v == null ? null : Math.min(PASOS.length - 1, Math.max(0, Number(v) || 0));
  } catch {
    return null;
  }
}

/** Paso actual del recorrido (null = no está activo). Vive en la pestaña, así se puede navegar libremente. */
export function useRecorrido() {
  const [paso, setPasoEstado] = useState<number | null>(leer);
  useEffect(() => {
    const f = () => setPasoEstado(leer());
    window.addEventListener("recorrido", f);
    return () => window.removeEventListener("recorrido", f);
  }, []);
  const setPaso = useCallback((n: number | null) => {
    try {
      if (n == null) sessionStorage.removeItem(CLAVE);
      else sessionStorage.setItem(CLAVE, String(n));
    } catch {
      /* sin almacenamiento: el recorrido dura mientras no se recargue */
    }
    setPasoEstado(n);
    window.dispatchEvent(new Event("recorrido"));
  }, []);
  return [paso, setPaso] as const;
}
