# Shorts de OTEA (1080 × 1920)

Graba la página real de OTEA como video vertical para redes: toques visibles, subtítulos, tarjeta de entrada y de cierre.
Lo que sale con el chip verde «Grabación real de OTEA» es la app funcionando, sin trucos. Las ideas que todavía no existen
solo aparecen en `6-con-tu-voto` (pieza animada aparte, `voto.html`), con el chip amarillo «Próximamente con tu voto».

| Short | Qué muestra |
|---|---|
| `1-tu-barrio` | Portada, «Lo que vivimos», historia de los huecos y compartir por WhatsApp |
| `2-mi-minuto` | `/mi-lugar`: tocar una cuadra de La Francia, minutos al Metro y la tarjeta para compartir |
| `3-antes-de-arrendar` | `/mi-lugar?modo=arrendar`: dos cuadras de Villa del Socorro, amenaza baja contra amenaza alta |
| `4-huecos` | Historia de los huecos, mapa para vecinos y la evidencia en `/reclamos` |
| `5-lideres` | Kit para líderes: resumen del barrio y carta de derecho de petición |
| `6-con-tu-voto` | Ideas para la siguiente etapa, marcadas como ejemplo de diseño |

## Cómo grabar

Requisitos: Node 18+, `ffmpeg` en el PATH y Chromium de Playwright.

```bash
cd frontend && npm run build && npx vite preview --port 4173 --host 127.0.0.1   # en otra terminal
cd scripts/shorts && npm init -y && npm i playwright && npx playwright install chromium
node videos.mjs              # los seis
node videos.mjs mi-minuto    # solo los que contengan ese texto
```

Los MP4 quedan en `scripts/shorts/salida/` (no se suben al repo). Variables opcionales: `OTEA_URL` (otra dirección del sitio)
y `CHROMIUM_PATH` (otro navegador).

Los videos salen sin sonido: la música y la voz se ponen en el editor (CapCut, por ejemplo). Las fotos llevan su crédito
en pantalla; ver `docs/fotos.md`.
