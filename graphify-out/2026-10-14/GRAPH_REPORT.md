# Graph Report - observatorio-santa-cruz  (2026-10-10)

## Corpus Check
- 71 files · ~148,940 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .css 1)

## Summary
- 662 nodes · 1627 edges · 33 communities (25 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3ae92b52`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useDatos
- capas.ts
- PanelRuteo.tsx
- package.json
- main.py
- procesar.py
- MapaVivo.tsx
- infraestructura
- json
- App.tsx
- compilerOptions
- Observatorio Inmobiliario y Territorial Santa Cruz
- Identidad.tsx
- navegador.mjs
- Inicio.tsx
- Datos.tsx
- red.py
- cargar
- 03_modelo_de_datos.sql
- Mapa.tsx
- ControlesMapa.tsx
- main
- Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá
- transform
- Leyenda.tsx
- Plan: mapa inmersivo definitivo
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `useDatos()` - 37 edges
2. `num()` - 36 edges
3. `react` - 31 edges
4. `Mapa()` - 26 edges
5. `Cabecera()` - 25 edges
6. `Relacionados()` - 25 edges
7. `Revelar()` - 24 edges
8. `dec()` - 24 edges
9. `main()` - 23 edges
10. `IconoNav()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Decisiones` --references--> `MapaVivo()`  [INFERRED]
  plans/mapa-inmersivo-definitivo.md → frontend/src/components/mapa/MapaVivo.tsx
- `Detalle por fuente` --references--> `barrios()`  [INFERRED]
  docs/02_fuentes_de_datos.md → backend/app/main.py
- `Dónde está cada cosa (índice de código)` --references--> `DibujoComuna()`  [INFERRED]
  plans/inicio-ux-revamp.md → frontend/src/pages/Inicio.tsx
- `Fase 0. Lo que hay hoy (análisis con graph-indexer)` --references--> `TemaCuadro()`  [INFERRED]
  plans/mapa-inmersivo-definitivo.md → frontend/src/pages/Mapa.tsx
- `4. Diseño inicial de la base de datos` --references--> `barrio()`  [INFERRED]
  docs/01_diseno_tecnico.md → backend/app/main.py

## Import Cycles
- None detected.

## Communities (33 total, 8 thin omitted)

### Community 0 - "useDatos"
Cohesion: 0.05
Nodes (111): Cuenta(), Revelar(), useVisto(), ConDatos(), ESTILO_TIPO, EtiquetaTipo(), NOMBRE_TIPO, Barra() (+103 more)

### Community 1 - "capas.ts"
Cohesion: 0.12
Nodes (18): TRAZOS, FiltroSiniestros, Modo, ANIOS, Props, AMENAZA, CAPAS, COLOR (+10 more)

### Community 2 - "PanelRuteo.tsx"
Cohesion: 0.12
Nodes (30): Detalle(), minutos(), PanelRuteo(), metros(), distanciaM(), enAnillo(), enPoligono(), puntoEn() (+22 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (41): dependencies, leaflet, maplibre-gl, react, react-dom, react-leaflet, react-router-dom, recharts (+33 more)

### Community 4 - "main.py"
Cohesion: 0.06
Nodes (31): accesibilidad(), barrio(), barrios(), calidad(), _capas_disponibles(), corredor_49(), fuentes(), indicadores() (+23 more)

### Community 5 - "procesar.py"
Cohesion: 0.17
Nodes (18): a_feature(), fecha_ms(), grupo_equipamiento(), guardar(), ha(), leer(), limpio(), main() (+10 more)

### Community 6 - "MapaVivo.tsx"
Cohesion: 0.12
Nodes (27): ALTURA(), aplicarFiltroSiniestros(), aplicarNocheEdificios(), aplicarOpacidad(), aplicarSol(), cajaDe(), Capa, casar() (+19 more)

### Community 7 - "infraestructura"
Cohesion: 0.18
Nodes (4): Elevacion, h(), infraestructura(), leer()

### Community 8 - "json"
Cohesion: 0.08
Nodes (19): _c(), construir(), _json(), caja_comuna(), walk(), descargar_ecv(), descargar_fuente(), descargar_osm_caminos() (+11 more)

### Community 9 - "App.tsx"
Cohesion: 0.20
Nodes (16): Accesibilidad, App(), Barrio, Corredor49, Datos, Fuentes, Identidad, Indicadores (+8 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 11 - "Observatorio Inmobiliario y Territorial Santa Cruz"
Cohesion: 0.17
Nodes (11): 1. Ver la plataforma (lo más rápido), 2. Volver a descargar y procesar los datos, 3. API (opcional en esta fase), 4. Pruebas, Cómo correrlo, Estado, Estructura, Fuentes principales (+3 more)

### Community 12 - "Identidad.tsx"
Cohesion: 0.12
Nodes (29): IconoNav(), TRAZOS, BotonTema(), Layout(), LetraTamano(), Logo(), MODULOS, Navegacion() (+21 more)

### Community 19 - "Inicio.tsx"
Cohesion: 0.11
Nodes (22): useProyeccion(), Pulso, Resumen, useResumen(), Barra(), Cabecera(), CONTORNOS, DibujoComuna() (+14 more)

### Community 20 - "Datos.tsx"
Cohesion: 0.14
Nodes (23): coleccionMisDatos(), ConjuntoPropio, guardarConjuntos(), leerConjuntos(), leerCSV(), leerGeoJSON(), LIMITE_BYTES, NOMBRES_LAT (+15 more)

### Community 21 - "red.py"
Cohesion: 0.14
Nodes (4): cargar(), main(), cerca(), metros()

### Community 22 - "cargar"
Cohesion: 0.18
Nodes (16): Buscador(), Fuente, FUENTES_BUSQUEDA, normalizar(), Resultado, CapaGeo(), Opciones, Opciones (+8 more)

### Community 23 - "03_modelo_de_datos.sql"
Cohesion: 0.28
Nodes (16): apoyo_intervencion, barrio, comuna, equipamiento, espacio_publico, estacion_transporte, estado_reporte_historial, fuente (+8 more)

### Community 24 - "Mapa.tsx"
Cohesion: 0.27
Nodes (15): ErrorCarga(), Joystick(), Icono(), PanelCapas(), capaPorId(), horaColombia(), BotonTema(), Chulo() (+7 more)

### Community 25 - "ControlesMapa.tsx"
Cohesion: 0.26
Nodes (9): BotonesCamara(), Brujula(), capturarFoto(), fechaArchivo(), HoraSol(), ICONOS, useCamara(), textoHora() (+1 more)

### Community 26 - "main"
Cohesion: 0.24
Nodes (4): main(), enganchar(), tiempos_desde(), tobler_kmh()

### Community 27 - "Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá"
Cohesion: 0.22
Nodes (8): Lo que ya se sabe (verificado en los datos), Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá, Prompts de trabajo (los que se ejecutaron), Qué se construye, Ronda 3: Accesibilidad, backend de Inicio, armonía, Ronda 4: Radar y propuesta de valor, Ronda 5: identidad visual y modo noche, Verificación

### Community 28 - "transform"
Cohesion: 0.33
Nodes (4): areas_por_barrio(), distancia_lineal_estacion(), pct_comuna(), transform()

### Community 29 - "Leyenda.tsx"
Cohesion: 0.60
Nodes (4): BloqueLeyenda, Leyenda(), Muestra(), ItemLeyenda

### Community 30 - "Plan: mapa inmersivo definitivo"
Cohesion: 0.40
Nodes (4): Archivos a tocar, Decisiones, Plan: mapa inmersivo definitivo, Verificación

## Knowledge Gaps
- **8 isolated node(s):** `@types/geojson`, `@types/leaflet`, `@types/react`, `@types/react-dom`, `autoprefixer` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 243 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useDatos` to `PanelRuteo.tsx`, `package.json`, `MapaVivo.tsx`, `App.tsx`, `Identidad.tsx`, `Inicio.tsx`, `Datos.tsx`, `cargar`, `Mapa.tsx`, `ControlesMapa.tsx`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `@types/geojson`, `@types/leaflet`, `@types/react` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useDatos` be split into smaller, more focused modules?**
  _Cohesion score 0.05281007751937984 - nodes in this community are weakly interconnected._
- **Why does `useDatos()` connect `useDatos` to `PanelRuteo.tsx`, `Inicio.tsx`, `Datos.tsx`, `cargar`, `Mapa.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `capas.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11688311688311688 - nodes in this community are weakly interconnected._
- **Why does `num()` connect `useDatos` to `capas.ts`, `PanelRuteo.tsx`, `Inicio.tsx`, `Datos.tsx`, `Mapa.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `PanelRuteo.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11596638655462185 - nodes in this community are weakly interconnected._