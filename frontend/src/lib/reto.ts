/**
 * Datos del reto (Territorio INN 2026, reto 4) para los llamados a la acción.
 *
 * `urlApoyo` va vacío a propósito: el botón «Apoya el proyecto» solo aparece cuando el equipo pegue aquí el enlace
 * oficial donde la gente puede apoyar o votar. Mientras esté vacío, el sitio no muestra ningún botón de votar ni
 * ningún contador: no existe un mecanismo de apoyo propio de OTEA.
 */
export const RETO = {
  nombre: "Territorio INN 2026",
  reto: "Reto 4",
  /** Enlace oficial para apoyar el proyecto. Vacío = no se muestra el botón. */
  urlApoyo: "",
  /** Texto del botón cuando haya enlace. */
  textoApoyo: "Apoya el proyecto en Territorio INN",
};

export const hayApoyo = () => RETO.urlApoyo.trim().length > 0;
