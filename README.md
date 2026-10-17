# OTEA

Observatorio inmobiliario y territorial de Santa Cruz (Comuna 2, Medellín). *OTEA*, del verbo otear: observar desde lo alto, como se mira la ciudad desde la ladera.

Plataforma web para entender qué tan bien conectados están los barrios de la Comuna 2 (Santa Cruz) de Medellín, dónde faltan andenes, escaleras, equipamientos y espacio público, y qué obras beneficiarían a más personas.

Propuesta para el **Reto #4 de Territorio INN 2026** (Línea 4 Físico espacial: espacios públicos, equipamientos y movilidad).

> ¿Cómo optimizar la infraestructura vial, peatonal y de acceso, facilitando la conexión interna de la comuna 2 Santa Cruz con el resto de Medellín?

## Qué hace diferente a este proyecto

Lo que pidió la coordinación: mostrar por qué este proyecto se destaca frente a los demás. Estos son los puntos a explotar en la presentación y el video:

- **Funciona hoy y con datos oficiales reales.** No es una maqueta: 21 fuentes de la Alcaldía y del DANE, cada cifra con su fuente y su fecha.
- **Honestidad como valor.** La plataforma dice lo que no se sabe (por ejemplo, que no hay precios unitarios oficiales para estimar costos de obra) en vez de inventarlo.
- **Pensado para Santa Cruz.** Mide la caminata con pendiente, porque en una comuna de ladera la distancia en línea recta engaña.
- **Une lo que nadie une.** Movilidad, equipamientos, POT, riesgo, siniestros y vivienda en un mismo mapa y en una sola ficha por barrio.
- **La comunidad participa.** Los reportes y votos llegan con datos al Presupuesto Participativo.
- **Escalable.** Cambiando el código de la comuna sirve para cualquier otra comuna de Medellín.

## Estado

| Fase | Qué incluye | Estado |
|---|---|---|
| 1. Diseño técnico | Arquitectura, carpetas, modelo de datos, fuentes, plan | Hecha: ver `docs/` |
| 2. Prototipo | Mapa con capas oficiales, fichas de barrio, indicadores, fuentes | **Funcionando** |
| 3. Datos y análisis | Tiempo de caminata con pendiente, priorización de obras | Diseñada, falta implementar |
| 4. Participación | Reportes ciudadanos con servidor y moderación | Hay una prueba local en el navegador |
| 5 y 6 | Validación y presentación | Pendiente |

**Regla del proyecto:** no se inventan datos. Todo lo que muestra el prototipo viene de la Alcaldía de Medellín o del DANE, con su fuente y fecha. Lo que todavía no se sabe aparece como pendiente.

## Cómo correrlo

Necesita **Node.js 18 o más reciente**. Para actualizar los datos o usar la API también necesita **Python 3.10 o más reciente**.

### 1. Ver la plataforma (lo más rápido)

Los datos ya procesados vienen incluidos en `frontend/public/data`, así que basta con esto:

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173 en el navegador. El mapa de fondo se descarga de OpenStreetMap, así que se necesita internet.

Para generar la versión final (sitio estático en `frontend/dist`):

```bash
npm run build
npm run preview      # la sirve en http://localhost:4173
```

### 2. Volver a descargar y procesar los datos

```bash
cd data-pipeline
pip install -r requirements.txt        # en Windows: py -m pip install -r requirements.txt
python descargar.py                    # descarga de los geoportales a data/raw/ (unos 2 minutos)
python procesar.py                     # recorta, calcula y escribe frontend/public/data/
python red.py                          # red peatonal, tiempos caminando y escenarios de obra
python riesgo.py                        # personas y viviendas en amenaza por movimientos en masa, por barrio
python documentar_fuentes.py           # trazabilidad: fuentes.json, metodologia.json y docs/02
```

`descargar.py` deja un registro en `data/raw/_registro.json` con la consulta exacta, la fecha y el número de registros de cada fuente. Si una fuente falla, queda marcada como error y el resto sigue.

### 3. API (opcional en esta fase)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva en http://localhost:8000/docs. Rutas: `/api/salud`, `/api/capas`, `/api/capas/{id}`, `/api/indicadores`, `/api/barrios`, `/api/barrios/{codigo}`, `/api/fuentes`, `/api/calidad`.

### 4. Pruebas

```bash
cd backend && python -m pytest                 # pruebas de la API y coherencia de los indicadores
cd frontend && npm run typecheck               # revisión de tipos
cd frontend && node pruebas/navegador.mjs      # pruebas en navegador (requiere Playwright, ver el archivo)
```

## Qué hay en la plataforma

- **OTEA Ciudadano (`/`, portada «Así vivimos Santa Cruz»):** para vecinos. Portada con fotos reales de Santa Cruz, cuatro historias (`/historias/movilidad-mayores`, `basuras`, `huecos`, `espacio-publico`) con la escena, una cifra explicada en sencillo, una visualización propia por tema, qué se puede hacer, lo que no se sabe, la evidencia técnica y compartir por WhatsApp. Atlas de los 11 barrios, mapa sencillo por tema y mapa completo por preguntas (`/mapa-vecinos`). Menú «Explorar» con los temas y su foto.
- **Mi cuadra, mi minuto (`/mi-lugar`):** el vecino toca su manzana en el mapa y ve cuántos minutos camina de verdad hasta el Metro, el colegio, el centro de salud, el parque y la biblioteca, cuánto rodeo le impone la ladera, y se lleva una tarjeta en imagen o por WhatsApp. Con `?modo=arrendar` muestra la *ficha antes de arrendar*: amenaza por movimiento en masa y tratamiento del POT, minutos a lo básico y gente en la manzana (es una guía, no un concepto técnico ni un avalúo).
- **Shorts para redes (`scripts/shorts/`):** grabador de videos verticales de la app real, con subtítulos y toques visibles. Ver su README.
- **Recorrido de presentación (`/recorrido`):** siete paradas por páginas reales, con una barra guía (Mayús + → para avanzar) para presentar en vivo o grabar el video. Guion en `docs/guion-video.md`.
- **OTEA Técnico (`/tecnico`):** el inicio para JAC, JAL, entidades y analistas, con todos los módulos de abajo.
- **Mapa territorial (MapLibre, 2D y 3D):** dos vistas, *Santa Cruz* (la comuna resaltada y el resto de la ciudad difuminado) y *Toda Medellín* (las 16 comunas y 5 corregimientos con los mismos ítems: estaciones, colegios, equipamientos, parques, canchas y bibliotecas, y una ficha por comuna para comparar). Botón *Ver en 3D* con el relieve real de la ladera y los edificios, manzanas que suben según cuánta gente vive en ellas, y un *Recorrido* que gira la cámara alrededor de la comuna (útil para el video). Botones grandes por tema, búsqueda, letra grande y ayuda la primera vez, pensados para que un adulto mayor lo pueda usar.
- **Indicadores:** cifras de la comuna, comparación entre barrios, siniestros por año, calidad de vida y tabla por barrio.
- **Accesibilidad y Prioridad de obras:** el método de la Fase 3, qué datos hay, qué falta, y la lista de espacios públicos que ya propone el POT.
- **Participación:** formulario con validaciones, ubicación en el mapa y detección de duplicados. En esta versión guarda solo en el navegador.
- **Fuentes y calidad:** de dónde sale cada dato, cuándo se descargó y qué falta verificar.

## Dos experiencias, una plataforma

La misma app y los mismos datos se ven de dos maneras según la ruta: `/`, `/historias`, `/participacion`, `/barrios`, `/mapa-vecinos`, `/recorrido` y `/mi-lugar` usan la cabecera ciudadana (tres enlaces, letra grande a la vista); el resto usa la cabecera técnica, con un botón «Vista ciudadana» para volver. Ningún enlace anterior cambió, salvo que el inicio técnico ahora es `/tecnico`.

- **Cifras de la vista ciudadana:** salen de `frontend/public/data/ciudadano.json`, que arma `python data-pipeline/ciudadano.py` con los archivos que ya usa el sitio (no descarga nada y no baja de la escala de barrio). Los textos y equivalencias están en `frontend/src/lib/ciudadano.ts`.
- **Fotos:** seis fotos reales con licencia Creative Commons (cinco de MDE Ciudad Inteligente de la Alcaldía, 2015, y una panorámica de Omar Uran, 2007), optimizadas en `frontend/public/fotos/` y con su ficha (autor, licencia, lugar conocido, cambios) en `frontend/src/lib/fotos.ts`. Placas y caras de niños difuminadas. Cómo agregar fotos propias y cuáles faltan: `docs/fotos.md`.
- **Apoyo al reto:** el botón «Apoya el proyecto» solo aparece cuando se pegue el enlace oficial en `frontend/src/lib/reto.ts`. No hay votación ni contador propio.
- **Menú técnico por tareas:** Explorar, Accesibilidad, Problemáticas, Riesgo y norma, Datos, Líderes y OTEA (`frontend/src/lib/menu.ts`).

## Aseo y residuos (Servicios públicos)

Módulo `/residuos`: **solo toneladas de residuos al mes por barrio** (mapa de los 11 barrios, ranking y kg por persona con el Censo 2018).

- **Política de datos:** los datos de Emvarias y EPM fueron entregados al proyecto y no son abiertos. Solo se publica la tonelada agregada por barrio. NO se publican rutas, polígonos de macrorutas, calles, horarios, códigos de ruta, conteos de instalaciones, direcciones ni placas.
- **Regenerar:** `python data-pipeline/residuos.py "<ruta a Proyecto_grado.gdb>"` (necesita geopandas y pyogrio). Escribe solo `frontend/public/data/residuos/residuos.json` y registra la fuente en `fuentes.json`.

## Estructura

```
docs/            Diseño técnico (Fase 1), catálogo de fuentes y esquema PostGIS
data-pipeline/   Descarga y procesamiento de datos (Python)
data/raw/        Descargas originales (se generan con descargar.py)
frontend/        Aplicación web (React + TypeScript + Vite + Tailwind + Leaflet + Recharts)
backend/         API (FastAPI)
```

## Fuentes principales

Geoportal de la Alcaldía de Medellín (servicios ArcGIS REST de cartografía base, POT Acuerdo 48 de 2014, Movilidad, Educación, INDER, Bibliotecas, Observatorio Inmobiliario de Medellín y Encuesta de Calidad de Vida) y Geoportal del DANE (Censo Nacional de Población y Vivienda 2018 por manzana). El detalle está en `docs/02_fuentes_de_datos.md`. Antes de publicar la plataforma en internet hay que confirmar las condiciones de uso de cada entidad.
