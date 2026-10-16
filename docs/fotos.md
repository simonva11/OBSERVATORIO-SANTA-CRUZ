# Fotos de OTEA

Las fotos que usa el sitio están en `frontend/public/fotos/` y su ficha completa en `frontend/src/lib/fotos.ts`.
El sitio **no tiene ninguna foto de banco de imágenes**: todas son de Santa Cruz o de la ladera de las comunas 1 y 2,
según el título que les puso quien las publicó.

## Las que hay hoy

| Archivo | Qué muestra | Autor y publicación | Licencia | Lugar conocido |
|---|---|---|---|---|
| `calle` | Calle comercial con banderines; un aviso menciona la unidad intermedia de Santa Cruz | David Castaño, MDE Ciudad Inteligente (Alcaldía), Flickr, 2015 | CC BY-NC-SA 2.0 | Comuna 2 · Santa Cruz (calle sin confirmar) |
| `aniversario` | Calle en pendiente decorada para un aniversario | David Castaño, MDE Ciudad Inteligente, 2015 | CC BY-NC-SA 2.0 | Comuna 2 · Santa Cruz (calle sin confirmar) |
| `callejon-tierra` | Calle sin pavimentar entre casas de ladrillo | David Castaño, MDE Ciudad Inteligente, 2015 | CC BY-NC-SA 2.0 | Comuna 2 · Santa Cruz (calle sin confirmar) |
| `pasaje` | Pasaje peatonal con contenedor de basura | David Castaño, MDE Ciudad Inteligente, 2015 | CC BY-NC-SA 2.0 | Comuna 2 · Santa Cruz (pasaje sin confirmar) |
| `rio` | Orilla del río Medellín con residuos | David Castaño, MDE Ciudad Inteligente, 2015 | CC BY-NC-SA 2.0 | Río Medellín, publicada como Comuna 2 (punto sin confirmar) |
| `laderas` | Panorámica de la ladera nororiental | Omar Uran, Flickr, 2007 | CC BY 2.0 | Comunas 1 y 2, según el título del autor |

Originales: álbum «Comuna 2 - Santa Cruz» de MDE Ciudad Inteligente en Flickr y la foto «Valle de Aburra - Medellin - Comunas 1 y 2» de Omar Uran. Los enlaces exactos están en `lib/fotos.ts`.

**Cambios hechos por OTEA:** placas de vehículos y caras de personas difuminadas (sobre todo niños) y tamaño reducido. La licencia CC BY-NC-SA exige decirlo y compartir las versiones modificadas con la misma licencia.

**Ojo con la licencia NC (no comercial):** sirve mientras OTEA sea un proyecto sin ánimo de lucro. Si OTEA se ofrece como servicio pago, hay que reemplazar esas fotos por fotos propias o pedir permiso a la Alcaldía.

## Fotos que faltan (para tomar en terreno)

Las fotos actuales son de 2015 y no muestran un lugar exacto. Lo ideal es reemplazarlas por fotos propias, recientes y con lugar confirmado:

- Escaleras o una calle empinada camino a la estación Andalucía o a un paradero.
- Un punto donde se acumulen residuos (sin casas identificables).
- Un hueco o un andén dañado, con algo que dé la escala.
- Un parque, una cancha o una plazoleta del barrio en uso.
- Una panorámica de la comuna desde un punto alto.

Reglas: solo Santa Cruz; sin caras reconocibles (menos de niños), sin placas ni números de casa; pedir permiso si aparece alguien; anotar fecha y lugar exacto.

## Cómo agregar una foto

1. Optimizarla en `.webp` a 640 y 1280 px de ancho (y 1600 si va a ancho completo), con calidad ~75.
2. Copiarla a `frontend/public/fotos/` como `<id>-<ancho>.webp` (por ejemplo `escaleras-640.webp`).
3. Agregar su ficha en `frontend/src/lib/fotos.ts` (autor, fecha, licencia, lugar y si está confirmado, alt, cambios).
4. Usarla con `<Foto id="escaleras" />` o asignarla a una historia en `frontend/src/lib/ciudadano.ts`.
