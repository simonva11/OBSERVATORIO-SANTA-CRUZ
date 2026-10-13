/**
 * Plazos de un derecho de petición en días hábiles (sin sábados, domingos ni festivos de Colombia).
 * Ley 1755 de 2015, art. 14: 15 días para peticiones generales, 10 para pedir documentos y 30 para consultas.
 * El día de la radicación no cuenta: el día 1 es el siguiente día hábil.
 * shortcut: no contempla suspensiones ni prórrogas que la entidad avise por escrito (art. 14 par.); revise la respuesta de la entidad.
 */
export const TIPOS_PETICION = {
  general: { nombre: "Petición general", dias: 15 },
  documentos: { nombre: "Pedir documentos o copias", dias: 10 },
  consulta: { nombre: "Consulta", dias: 30 },
} as const;
export type TipoPeticion = keyof typeof TIPOS_PETICION;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sumar = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Ley Emiliani: el festivo se pasa al lunes siguiente (si ya es lunes, se queda). */
const alLunes = (d: Date) => sumar(d, (8 - d.getDay()) % 7);

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
function pascua(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mes - 1, dia);
}

const memo = new Map<number, Set<string>>();
export function festivos(y: number): Set<string> {
  const hit = memo.get(y);
  if (hit) return hit;
  const p = pascua(y);
  const f = [
    new Date(y, 0, 1), new Date(y, 4, 1), new Date(y, 6, 20), new Date(y, 7, 7), new Date(y, 11, 8), new Date(y, 11, 25), // fijos
    alLunes(new Date(y, 0, 6)), alLunes(new Date(y, 2, 19)), alLunes(new Date(y, 5, 29)), alLunes(new Date(y, 7, 15)),
    alLunes(new Date(y, 9, 12)), alLunes(new Date(y, 10, 1)), alLunes(new Date(y, 10, 11)), // trasladables
    sumar(p, -3), sumar(p, -2), // jueves y viernes santo
    sumar(p, 43), sumar(p, 64), sumar(p, 71), // Ascensión, Corpus Christi y Sagrado Corazón, ya pasados al lunes
  ].map(iso);
  const s = new Set(f);
  memo.set(y, s);
  return s;
}

const esHabil = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6 && !festivos(d.getFullYear()).has(iso(d));

/** Fecha límite (AAAA-MM-DD) contando `dias` días hábiles después de la radicación. */
export function vence(radicado: string, dias: number): string {
  let d = new Date(`${radicado}T00:00:00`);
  for (let n = 0; n < dias; ) {
    d = sumar(d, 1);
    if (esHabil(d)) n++;
  }
  return iso(d);
}

/** Días hábiles que faltan hasta la fecha límite: positivo = quedan, negativo = pasó. Hoy cuenta como 0. */
export function habilesHasta(limite: string, hoy = new Date()): number {
  let a = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const b = new Date(`${limite}T00:00:00`);
  const signo = a <= b ? 1 : -1;
  let n = 0;
  while (iso(a) !== iso(b)) {
    a = sumar(a, signo);
    if (signo === 1 ? esHabil(a) : esHabil(sumar(a, 1))) n += signo;
  }
  return n;
}
