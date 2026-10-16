# Guion del video de OTEA (≈ 1 min 55 s)

Video corto para presentar OTEA en Territorio INN 2026 (reto 4). Todo lo que aparece en pantalla existe hoy en el sitio.
Para grabar, abra `/recorrido`, pulse «Empezar el recorrido» y avance con el botón «Siguiente» o con **Mayús + →**.
«Ocultar» deja la barra del recorrido como un botón pequeño para que no salga en la grabación.

**Mensajes clave (si solo recuerdan tres cosas):**
1. Santa Cruz tiene problemas que se viven todos los días, pero la información para entenderlos está regada y es difícil de leer.
2. OTEA la junta, la pone en el mapa del barrio y la cuenta en sencillo, con su fuente.
3. La misma información sirve a un vecino para entender y a una JAC, una JAL o una entidad para decidir.

**Tres momentos que tienen que verse bien:** la portada con la calle de Santa Cruz, la historia de los huecos y el paso de esa historia al análisis técnico.

---

| Tiempo | Qué se ve (pantalla) | Narración |
|---|---|---|
| **0:00 – 0:15** · Portada | `/` en pantalla completa. La foto de la calle con banderines; el título «Tu barrio tiene mucho que contar». Bajar despacio hasta las cuatro fotos de «Lo que vivimos todos los días». | «Esta es Santa Cruz, la Comuna 2 de Medellín. Once barrios, más de cien mil personas y muchas cosas que vivimos todos los días: subir al Metro, las basuras, los huecos, los pocos parques.» |
| **0:15 – 0:35** · Una historia | Clic en «Calles y andenes en mal estado» (`/historias/huecos`). Se ve la foto, luego la cifra de reportes y la barra de qué pasó con ellos (arreglados, pendientes, descartados, repetidos). | «Un hueco lo ve todo el barrio. Pero, ¿qué pasa después de reportarlo? OTEA cuenta cuántos se han reportado desde 2020, cuántos se arreglaron, cuántos siguen pendientes y cuánto se demoran. Dicho en sencillo y con la fuente al lado.» |
| **0:35 – 0:50** · Del relato al mapa | Botón «Ver los huecos reportados en el mapa del barrio» (`/mapa-vecinos?pregunta=huecos`). Mostrar la lista de preguntas a la izquierda y tocar un punto para abrir su ficha. | «La misma historia en el mapa. Un vecino elige una pregunta, “¿dónde han reportado huecos?”, y ve dónde pasa. Sin saber de mapas ni de capas.» |
| **0:50 – 1:05** · La evidencia | Volver a la historia y pulsar «Ver los datos que respaldan este problema» (`/reclamos`). Mostrar los reportes por barrio y los tiempos de arreglo. | «Y si usted es de la JAC, de la JAL o trabaja en una entidad, un clic lo lleva al análisis completo: por barrio, por año y por estado.» |
| **1:05 – 1:18** · De dónde sale | Clic en «Ver ficha» de la fuente (`/fuentes?f=huecos`). Se ve la entidad, la fecha, la licencia y los límites del dato. | «Cada cifra dice de dónde sale, de qué fecha es y qué no se puede concluir con ella. Nada inventado y nada escondido.» |
| **1:18 – 1:35** · Para decidir | `/accesibilidad`: minutos caminando al Metro por barrio y su método. Opcional: un vistazo a `/prioridades`. | «Con la misma información se puede ver cuánto camina la gente hasta el Metro o qué obra ayudaría a más personas. Son cálculos para decidir con evidencia, no obras aprobadas.» |
| **1:35 – 1:55** · Cierre | `/propuesta`: «Una plataforma, dos experiencias» y la tabla de lo que funciona hoy. Terminar volviendo a la portada (`/`) con la foto de la calle. | «OTEA convierte datos regados en algo que la comunidad entiende y que los líderes pueden usar. Hoy funciona en Santa Cruz y se puede llevar a otros barrios. Si le parece que vale la pena, apóyenos en Territorio INN.» |

---

## Notas para que el video sea honesto

- **No decir** que OTEA arregla huecos, recibe reportes oficiales o envía solicitudes a la Alcaldía. Los reportes oficiales se hacen en ReportesMED.
- **No mostrar** Participación ni Votación como si funcionaran: son prototipos que guardan solo en el navegador.
- **Prioridad de obras** es un cálculo; no es una lista de obras aprobadas.
- **Las fotos** son de 2015 (Alcaldía, licencia CC BY-NC-SA) y la panorámica de Omar Uran (CC BY). Si se ven en el video, los créditos deben salir al final: «Fotos: David Castaño / MDE Ciudad Inteligente (CC BY-NC-SA 2.0) y Omar Uran (CC BY 2.0)».
- **El llamado a apoyar** solo tiene sentido con el enlace oficial del reto. Cuando el equipo lo tenga, se pega en `frontend/src/lib/reto.ts` y aparece el botón en la portada.
- Las cifras de la narración («más de cien mil personas», «desde 2020») salen de los datos del sitio; si se actualizan los datos, revisar que sigan siendo ciertas.

## Tomas sugeridas

- Grabar en 1920 × 1080 con el navegador en pantalla completa (F11) y la letra en tamaño normal.
- Modo día para la portada y las historias; el mapa se ve bien en ambos modos.
- Si se graba en celular: 390 px de ancho, la portada y una historia se ven muy bien en vertical.
- Pausas de un segundo en cada cifra grande antes de seguir hablando.
