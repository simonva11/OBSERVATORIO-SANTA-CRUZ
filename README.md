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

- **Inicio:** el reto, un mapa de los 11 barrios y lo que ya muestran los datos.
- **Mapa territorial (MapLibre, 2D y 3D):** dos vistas, *Santa Cruz* (la comuna resaltada y el resto de la ciudad difuminado) y *Toda Medellín* (las 16 comunas y 5 corregimientos con los mismos ítems: estaciones, colegios, equipamientos, parques, canchas y bibliotecas, y una ficha por comuna para comparar). Botón *Ver en 3D* con el relieve real de la ladera y los edificios, manzanas que suben según cuánta gente vive en ellas, y un *Recorrido* que gira la cámara alrededor de la comuna (útil para el video). Botones grandes por tema, búsqueda, letra grande y ayuda la primera vez, pensados para que un adulto mayor lo pueda usar.
- **Indicadores:** cifras de la comuna, comparación entre barrios, siniestros por año, calidad de vida y tabla por barrio.
- **Accesibilidad y Prioridad de obras:** el método de la Fase 3, qué datos hay, qué falta, y la lista de espacios públicos que ya propone el POT.
- **Participación:** formulario con validaciones, ubicación en el mapa y detección de duplicados. En esta versión guarda solo en el navegador.
- **Fuentes y calidad:** de dónde sale cada dato, cuándo se descargó y qué falta verificar.

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
