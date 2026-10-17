// Guiones de los shorts. Todo lo que aparece con el chip verde es la página real de OTEA funcionando.
// Lo que aún no existe solo aparece en el short «con-tu-voto», con el chip amarillo «Próximamente con tu voto».
import { grabar, BASE } from "./grabador.mjs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CIERRE = (extra = {}) => ({
  foto: "calle", ojo: "Territorio INN 2026 · Reto 4", titulo: "OTEA: tu barrio, en <em>minutos</em>.",
  texto: "Ya funciona en Santa Cruz. Con tu voto, crece para toda la comuna.", cta: "Vota por OTEA", credito: "Foto: David Castaño / MDE Ciudad Inteligente · CC BY-NC-SA 2.0", ms: 3600, ...extra,
});
const REAL = "Grabación real de OTEA";
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DESCARGAS = path.join(AQUI, "salida");

const GUIONES = {
  // 1 ------------------------------------------------------------------------------------------- portada
  async "1-tu-barrio"(h) {
    await h.tarjeta({ foto: "laderas", ojo: "Santa Cruz · Comuna 2 · Medellín", titulo: "11 barrios. 108.252 personas. <em>Muchas historias.</em>", credito: "Foto: Omar Uran · CC BY 2.0", ms: 3000 });
    await h.quitarTarjeta();
    await h.chip(REAL);
    await h.sub("Así vivimos Santa Cruz", "La portada de OTEA, con fotos reales del barrio", 2200);
    await h.sinSub();
    await h.bajar("#problemas", { ms: 1500, margen: 60 });
    await h.sub("Lo que vivimos todos los días", "Moverse, las basuras, los huecos, el espacio", 2200);
    await h.bajar(380, { ms: 1400 });
    await h.esperar(600);
    await h.tocar(".gh-c .ciu-enlace-cubre", { ms: 300 });
    await h.esperar(900);
    await h.sub("Cada problema, contado en sencillo", "", 1900);
    await h.bajar("#h-datos", { ms: 1600, margen: 50 });
    await h.sub("<mark>3.336</mark> reportes de huecos desde 2020", "Dato de la Alcaldía, explicado por OTEA", 2400);
    await h.bajar(".viz", { ms: 1200, margen: 90 });
    await h.sub("¿Cuántos se arreglaron? ¿Cuántos siguen?", "Y cuánto se demoran", 2600);
    await h.bajar("#h-compartir", { ms: 1700, margen: 60 });
    await h.sub("Y se comparte por WhatsApp", "Con la cifra y su fuente", 900);
    await h.tocar("a.ciu-wa", { clic: false, ms: 1500 });
    await h.sinSub();
    await h.tarjeta(CIERRE());
  },

  // 2 ------------------------------------------------------------------------------------------- mi cuadra, mi minuto
  async "2-mi-minuto"(h) {
    await h.tarjeta({ foto: "aniversario", ojo: "Santa Cruz · Comuna 2", titulo: "¿Cuántos minutos camina tu mamá hasta el <em>Metro</em>?", credito: "Foto: David Castaño / MDE Ciudad Inteligente · CC BY-NC-SA 2.0", ms: 3200 });
    await h.ir("/mi-lugar", 1500);
    await h.quitarTarjeta();
    await h.chip(REAL);
    await h.sub("Toca tu cuadra en el mapa", "Cada una de las 523 manzanas tiene su cálculo", 1800);
    await h.bajar(".lugar-mapa", { ms: 1100, margen: 8 });
    await h.esperar(500);
    await h.tocar('path[data-m="0500110000000002030330"]', { ms: 700 });
    await h.sub("Una cuadra de La Francia", "", 1200);
    await h.bajar(".lugar-tarjeta", { ms: 1300, margen: 20 });
    await h.sub("<mark>18 minutos</mark> a pie hasta el Metro", "Subiendo y bajando la ladera", 2600);
    await h.sub("El camino real es <mark>3 veces</mark> la línea recta", "Un mapa común no lo ve. OTEA sí.", 2900);
    await h.bajar(".lugar-fila:last-child", { ms: 1300, margen: 260 });
    await h.sub("Colegio, salud, parque, biblioteca…", "Todo en minutos, desde tu cuadra", 2400);
    await h.sinSub();
    const descarga = h.p.waitForEvent("download");
    await h.tocar("button:has-text('Guardar como imagen')", { ms: 300 });
    const d = await descarga;
    const archivo = path.join(DESCARGAS, "tarjeta-mi-cuadra.png");
    await d.saveAs(archivo);
    await h.mostrarImagen(archivo, "Tu tarjeta, lista para compartir", 3000);
    await h.sub("Mándala por WhatsApp", "Que todos sepan cuánto camina su barrio", 800);
    await h.tocar("a.ciu-wa", { clic: false, ms: 1400 });
    await h.sinSub();
    await h.tarjeta(CIERRE());
  },

  // 3 ------------------------------------------------------------------------------------------- antes de arrendar
  async "3-antes-de-arrendar"(h) {
    await h.tarjeta({ foto: "callejon-tierra", ojo: "Arriendo · compra · trasteo", titulo: "¿Vas a arrendar en la comuna? <em>Mira la cuadra primero.</em>", credito: "Foto: David Castaño / MDE Ciudad Inteligente · CC BY-NC-SA 2.0", ms: 3200 });
    await h.ir("/mi-lugar?modo=arrendar", 1500);
    await h.quitarTarjeta();
    await h.chip(REAL);
    await h.sub("Antes de arrendar", "Toca la cuadra del lugar que te ofrecen", 1800);
    await h.bajar(".lugar-mapa", { ms: 1100, margen: 8 });
    await h.tocar('path[data-m="0500110000000002040111"]', { ms: 600 });
    await h.bajar(".lugar-ficha", { ms: 1300, margen: 20 });
    await h.sub("Cuadra A · Villa del Socorro", "A 2 minutos del Metro · amenaza baja", 2800);
    await h.bajar(".lugar-mapa", { ms: 1100, margen: 8 });
    await h.tocar('path[data-m="0500110000000002040113"]', { ms: 600 });
    await h.bajar(".lugar-ficha", { ms: 1300, margen: 20 });
    await h.sub("Cuadra B, muy cerca", "Pero en <mark>amenaza alta</mark> y zona con riesgo, según el POT", 3200);
    await h.bajar(".lugar-dl > div:nth-child(4)", { ms: 1200, margen: 160 });
    await h.sub("Minutos al Metro, colegio y salud", "Y cuánta gente vive en la manzana", 2600);
    await h.bajar(".lugar-ficha p.rounded-xl", { ms: 1000, margen: 260 });
    await h.sub("Con datos oficiales y sin letra menuda", "Es una guía; el estudio técnico lo hace la Alcaldía", 2600);
    await h.sinSub();
    await h.tarjeta(CIERRE({ titulo: "Información para decidir dónde <em>vivir</em>.", texto: "Gratis para cualquier vecino. Ya funciona en OTEA." }));
  },

  // 4 ------------------------------------------------------------------------------------------- huecos y evidencia
  async "4-huecos"(h) {
    await h.tarjeta({ foto: "callejon-tierra", ojo: "Calles y andenes", titulo: "Reportamos el hueco. ¿Y <em>después</em> qué?", credito: "Foto: David Castaño / MDE Ciudad Inteligente · CC BY-NC-SA 2.0", ms: 3000 });
    await h.ir("/historias/huecos", 1400);
    await h.quitarTarjeta();
    await h.chip(REAL);
    await h.sub("La historia de los huecos", "Con foto, cifra y fuente", 1800);
    await h.bajar(".viz", { ms: 2000, margen: 80 });
    await h.sub("<mark>231</mark> reportes siguen pendientes", "Según la base de la Alcaldía", 2600);
    await h.sub("La mitad se arregló en <mark>12 días</mark>", "Pero 1 de cada 10 tardó más de 185", 2800);
    await h.sinSub();
    await h.tarjeta({ ojo: "OTEA para vecinos", titulo: "Ahora, en el <em>mapa</em> de tu barrio.", ms: 400 });
    await h.ir("/mapa-vecinos?pregunta=huecos", 300);
    await h.p.waitForFunction(() => !document.body.innerText.includes("Preparando el mapa"), null, { timeout: 20000 }).catch(() => {});
    await h.esperar(1400);
    await h.quitarTarjeta();
    await h.sub("Míralos en el mapa de tu barrio", "Una pregunta, sin capas ni enredos", 3400);
    await h.ir("/reclamos", 1500);
    await h.sub("Y la evidencia para la JAC", "Por barrio, por año y por estado", 2000);
    await h.bajar(700, { ms: 2200 });
    await h.esperar(1200);
    await h.sinSub();
    await h.tarjeta(CIERRE({ titulo: "Del reclamo a la <em>evidencia</em>.", texto: "Lo que el barrio reporta, ahora se puede ver y pedir con datos." }));
  },

  // 5 ------------------------------------------------------------------------------------------- líderes
  async "5-lideres"(h) {
    await h.tarjeta({ foto: "pasaje", ojo: "Para la JAC y la JAL", titulo: "La carta a la Alcaldía, <em>con cifras</em>, en segundos.", credito: "Foto: David Castaño / MDE Ciudad Inteligente · CC BY-NC-SA 2.0", ms: 3000 });
    await h.ir("/lideres", 1500);
    await h.quitarTarjeta();
    await h.chip(REAL);
    await h.sub("Kit para líderes", "Elige tu barrio y las cifras se llenan solas", 1600);
    await h.bajar('[aria-label="Elegir barrio"]', { ms: 1000, margen: 120 });
    await h.tocar('[aria-label="Elegir barrio"] button:has-text("La Francia")', { ms: 900 });
    await h.bajar("#t-l-resumen", { ms: 1500, margen: 40 });
    await h.sub("Tres frases con cifra", "Para leer en la reunión de la JAC", 2600);
    await h.sinSub();
    await h.bajar('[aria-label="Tema de la petición"]', { ms: 1700, margen: 230 });
    await h.tocar('[aria-label="Tema de la petición"] button:has-text("seguridad vial")', { ms: 500 });
    await h.sub("Derecho de petición", "Escoges el tema y la carta cambia", 1600);
    await h.bajar("#t-l-carta pre", { ms: 1500, margen: 80 });
    await h.sub("La carta sale con los datos del barrio", "Lista para revisar y radicar", 2400);
    await h.bajar(320, { ms: 2000 });
    await h.sub("Copiar, descargar o imprimir", "", 600);
    await h.tocar("button:has-text('Copiar carta')", { ms: 1500 });
    await h.sinSub();
    await h.tarjeta(CIERRE({ titulo: "Los líderes, con <em>evidencia</em> en la mano.", texto: "Cifras, cartas y plazos. Ya funciona en OTEA." }));
  },
};

// 6 ------------------------------------------------------------------------------------------- con tu voto (ideas, no la app)
// Es una pieza animada aparte (voto.html) y lleva el chip amarillo «Próximamente con tu voto» en cada idea.
const VOTO = pathToFileURL(path.join(AQUI, "voto.html")).href + "?base=" + encodeURIComponent(BASE);
GUIONES["6-con-tu-voto"] = async (h) => { await h.p.evaluate(() => window.__play()); await h.esperar(300); };
const OPCIONES = { "6-con-tu-voto": { inicio: VOTO }, "4-huecos": { calentar: ["/mapa-vecinos?pregunta=huecos"] } };

const pedidos = process.argv.slice(2);
for (const [nombre, guion] of Object.entries(GUIONES)) {
  if (pedidos.length && !pedidos.some((x) => nombre.includes(x))) continue;
  await grabar(nombre, guion, OPCIONES[nombre]);
}
