/**
 * Revisión de un reporte ciudadano y tratamiento de la foto.
 * shortcut: todo corre en el navegador, así que sirve para filtrar basura y descuidos pero NO es una defensa real:
 * cuando exista servidor (Fase 4) estas mismas reglas se repiten allá, porque el navegador lo puede saltar cualquiera.
 * El texto nunca se pinta como HTML (React lo escapa), y la foto se vuelve a dibujar en un canvas.
 */

/** Quita caracteres de control y etiquetas, y junta los espacios. Lo que se guarda es texto plano. */
export function limpiarTexto(t: string): string {
  return t
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮]/g, "")
    .replace(/<[^>]*>?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Cosas que no son una queja sino código o enlaces. Si aparecen, se rechaza el reporte.
const CODIGO = /(javascript:|data:text|on\w+\s*=|<\s*\/?\s*(script|iframe|img|svg|style)|\bunion\s+select\b|\bdrop\s+table\b|\bdelete\s+from\b|\binsert\s+into\b|--\s|;\s*(rm|curl|wget|powershell|cmd)\b|\$\(|`|\{\{|\bsudo\b|\.\.\/)/i;
const ENLACE = /(https?:\/\/|www\.|\b\w+\.(com|net|org|co|xyz|ru|io)\b)/i;
const PERSONAL = /\b\d{7,10}\b|@\w/;
// Lista corta a propósito; la revisión humana de la Fase 4 hace el resto.
const GROSERIAS = /\b(hijueputa|hp|malparid[oa]|gonorrea|puta|mierda|marica)\b/i;

export type Revision = { ok: true; texto: string } | { ok: false; motivo: string };

export function revisarDescripcion(crudo: string): Revision {
  if (CODIGO.test(crudo)) return { ok: false, motivo: "Parece código y no una descripción. Cuente el problema con sus palabras." };
  const texto = limpiarTexto(crudo);
  if (texto.length < 20) return { ok: false, motivo: "Cuente un poco más (al menos 20 caracteres): qué pasa y a quién afecta." };
  if (texto.length > 1000) return { ok: false, motivo: "La descripción puede tener máximo 1.000 caracteres." };
  if (ENLACE.test(texto)) return { ok: false, motivo: "No incluya enlaces. Para eso use la foto o el mapa." };
  if (PERSONAL.test(texto)) return { ok: false, motivo: "No escriba teléfonos ni correos. El reporte no necesita datos personales." };
  if (GROSERIAS.test(texto)) return { ok: false, motivo: "Reescriba sin groserías para que el reporte se pueda tomar en serio." };
  const letras = (texto.match(/\p{L}/gu) ?? []).length;
  const palabras = new Set(texto.toLowerCase().match(/\p{L}{2,}/gu) ?? []);
  if (letras / texto.length < 0.6 || palabras.size < 4 || /(.)\1{5,}/.test(texto))
    return { ok: false, motivo: "Eso no parece una descripción. Escriba con frases sobre lo que ocurre." };
  return { ok: true, texto };
}

const MAX_LADO = 1280;
const MAX_ENTRADA = 10 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Valida la foto y la dibuja de nuevo en un JPEG de máximo 1280 px. Al redibujar se pierden los metadatos
 * (ubicación GPS, modelo del celular) y cualquier cosa escondida en el archivo. Devuelve un data URL.
 */
export async function procesarFoto(archivo: File): Promise<string> {
  if (!TIPOS.includes(archivo.type)) throw new Error("La foto debe ser JPG, PNG o WebP.");
  if (archivo.size > MAX_ENTRADA) throw new Error("La foto pesa más de 10 MB.");
  const bmp = await createImageBitmap(archivo).catch(() => {
    throw new Error("No se pudo leer la foto. Pruebe con otra.");
  });
  const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL("image/jpeg", 0.72);
}

/** Solo se pintan fotos que salieron de procesarFoto. */
export const fotoValida = (f: unknown): f is string => typeof f === "string" && f.startsWith("data:image/jpeg;base64,") && f.length < 1_500_000;
