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
python3 audio.py             # música y efectos (ver abajo)
```

Los MP4 quedan en `scripts/shorts/salida/` (no se suben al repo). Variables opcionales: `OTEA_URL` (otra dirección del sitio)
y `CHROMIUM_PATH` (otro navegador).

## Sonido

`python3 audio.py` le pone a cada video música original y efectos (toques, subtítulos, transiciones, el golpe final).
La música se compone en el script como MIDI y se toca con el banco libre FluidR3_GM, así que no hay canciones de nadie
ni problemas de derechos. El tempo se ajusta solo para que la batería entre cuando se quita la tarjeta de entrada y el
golpe final caiga en la tarjeta de cierre; los efectos salen de las marcas `salida/<nombre>.eventos.json` que deja el
grabador. Queda en unos −14 LUFS, el volumen normal de las redes.

```bash
sudo apt install fluidsynth fluid-soundfont-gm      # o SOUNDFONT=ruta/a/un/banco.sf2
pip install numpy scipy pretty_midi
python3 audio.py              # todos
python3 audio.py mi-minuto    # uno
```

No lleva voz. Si se agrega narración en el editor, bajarle unos 6 dB a la pista. Las fotos llevan su crédito en
pantalla; ver `docs/fotos.md`.
