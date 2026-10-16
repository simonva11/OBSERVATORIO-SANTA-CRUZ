# Graph Report - otea  (2026-10-14)

## Corpus Check
- 111 files · ~193,752 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 1, .toml 1)

## Summary
- 1013 nodes · 2600 edges · 65 communities (54 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4995e643`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Cabecera
- capas.ts
- Participacion.tsx
- package.json
- Fase 1. Diseño técnico
- procesar.py
- MapaVivo.tsx
- red.py
- json
- App.tsx
- compilerOptions
- OTEA
- Layout.tsx
- navegador.mjs
- useDatos
- Datos.tsx
- eje49.py
- cargar
- react
- Mapa.tsx
- ControlesMapa.tsx
- ciudadano.py
- Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá
- transform
- Leyenda.tsx
- Plan: mapa inmersivo definitivo
- CLAUDE.md
- Prioridades.tsx
- datos.ts
- Barrio.tsx
- Lideres.tsx
- UI polish
- Accesibilidad.tsx
- reclamos.py
- main.py
- votos.py
- num
- Indicadores.tsx
- radar.py
- residuos.py
- devDependencies
- Surfaces
- riesgo.py
- Inmobiliario.tsx
- resumen.py
- PanelCapas.tsx
- Enter animations
- dependencies
- Animations
- Residuos.tsx
- Icons
- Icon transitions
- scripts
- main.tsx
- Ponytail, lazy senior dev mode
- vite.config.ts
- Fotos de Santa Cruz

## God Nodes (most connected - your core abstractions)
1. `useDatos()` - 60 edges
2. `num()` - 57 edges
3. `react` - 45 edges
4. `Cabecera()` - 40 edges
5. `ConDatos()` - 39 edges
6. `Seccion()` - 37 edges
7. `Relacionados()` - 37 edges
8. `Fuente()` - 34 edges
9. `dec()` - 32 edges
10. `App()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Detalle por fuente` --references--> `barrios()`  [INFERRED]
  docs/02_fuentes_de_datos.md → backend/app/main.py
- `CSS, both icons in the DOM` --references--> `transform()`  [INFERRED]
  .agents/skills/better-ui/icon-transitions.md → data-pipeline/procesar.py
- `Qué hay en la plataforma` --references--> `huecos()`  [INFERRED]
  README.md → data-pipeline/reclamos.py
- `Decisiones` --references--> `MapaVivo()`  [INFERRED]
  plans/mapa-inmersivo-definitivo.md → frontend/src/components/mapa/MapaVivo.tsx
- `4. Diseño inicial de la base de datos` --references--> `barrio()`  [INFERRED]
  docs/01_diseno_tecnico.md → backend/app/main.py

## Import Cycles
- None detected.

## Communities (65 total, 11 thin omitted)

### Community 0 - "Cabecera"
Cohesion: 0.12
Nodes (26): ConDatos(), BotonCabecera(), Cabecera(), Relacionados(), ubicacion(), Contenido(), Eje, Problema (+18 more)

### Community 1 - "capas.ts"
Cohesion: 0.10
Nodes (19): TRAZOS, AMENAZA, COLOR, COLOR_HUECO_ARREGLADO, COLOR_HUECO_PENDIENTE, COLOR_OBRA_OTRO, DefCapa, dias() (+11 more)

### Community 2 - "Participacion.tsx"
Cohesion: 0.08
Nodes (42): Detalle(), minutos(), PanelRuteo(), codigo(), leerMis(), TEMAS, Totales, Votacion() (+34 more)

### Community 3 - "package.json"
Cohesion: 0.12
Nodes (16): description, name, private, type, version, autoprefixer, postcss, react-leaflet (+8 more)

### Community 4 - "Fase 1. Diseño técnico"
Cohesion: 0.10
Nodes (17): 1. Cómo va a funcionar la plataforma, 2. Arquitectura técnica recomendada, 3. Estructura de carpetas, 4. Diseño inicial de la base de datos, 5. Fuentes oficiales que se deben comprobar, 6. Qué se puede hacer desde ya y qué depende de más datos, 7. Plan de desarrollo por pasos, Fase 1. Diseño técnico (+9 more)

### Community 5 - "procesar.py"
Cohesion: 0.17
Nodes (18): a_feature(), fecha_ms(), grupo_equipamiento(), guardar(), ha(), leer(), limpio(), main() (+10 more)

### Community 6 - "MapaVivo.tsx"
Cohesion: 0.10
Nodes (34): ALTURA(), aplicarFiltroHuecos(), aplicarFiltroSiniestros(), aplicarNocheEdificios(), aplicarOpacidad(), aplicarSol(), cajaDe(), Capa (+26 more)

### Community 7 - "red.py"
Cohesion: 0.11
Nodes (8): Elevacion, h(), infraestructura(), leer(), main(), enganchar(), tiempos_desde(), tobler_kmh()

### Community 8 - "json"
Cohesion: 0.18
Nodes (9): caja_comuna(), walk(), descargar_ecv(), descargar_fuente(), descargar_osm_caminos(), _get_json(), main(), parametros_espaciales() (+1 more)

### Community 9 - "App.tsx"
Cohesion: 0.07
Nodes (42): Accesibilidad, App(), Barrio, Corredor49, Datos, Fuentes, Historia, Historias (+34 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 11 - "OTEA"
Cohesion: 0.14
Nodes (13): 1. Ver la plataforma (lo más rápido), 2. Volver a descargar y procesar los datos, 3. API (opcional en esta fase), 4. Pruebas, Aseo y residuos (Servicios públicos), Cómo correrlo, Dos experiencias, una plataforma, Estado (+5 more)

### Community 12 - "Layout.tsx"
Cohesion: 0.07
Nodes (48): IconoNav(), TRAZOS, BarraModulos(), BotonPie(), BotonTema(), IndicePagina(), ItemMenu(), Layout() (+40 more)

### Community 19 - "useDatos"
Cohesion: 0.16
Nodes (22): Cuenta(), Revelar(), useVisto(), CLASE, FuenteCat, Metodo(), RELACIONES, Seccion() (+14 more)

### Community 20 - "Datos.tsx"
Cohesion: 0.15
Nodes (21): ConjuntoPropio, guardarConjuntos(), leerConjuntos(), leerCSV(), leerGeoJSON(), LIMITE_BYTES, NOMBRES_LAT, NOMBRES_LON (+13 more)

### Community 21 - "eje49.py"
Cohesion: 0.19
Nodes (4): cargar(), main(), cerca(), metros()

### Community 22 - "cargar"
Cohesion: 0.27
Nodes (10): Buscador(), Fuente, FUENTES_BUSQUEDA, normalizar(), Resultado, Opciones, Props, cargar() (+2 more)

### Community 23 - "react"
Cohesion: 0.12
Nodes (33): Compartir(), urlDe(), AvisoFotos(), Foto(), Ilustracion(), CORTO, LeyendaMapa(), MapaBarrios() (+25 more)

### Community 24 - "Mapa.tsx"
Cohesion: 0.22
Nodes (17): ErrorCarga(), useNocheActiva(), HoraSol(), Icono(), PanelCapas(), capaPorId(), horaColombia(), BotonTema() (+9 more)

### Community 25 - "ControlesMapa.tsx"
Cohesion: 0.27
Nodes (8): BotonesCamara(), Brujula(), capturarFoto(), fechaArchivo(), ICONOS, useCamara(), textoHora(), maplibre-gl

### Community 26 - "ciudadano.py"
Cohesion: 0.28
Nodes (5): clave(), construir(), leer(), probar(), nodo()

### Community 27 - "Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá"
Cohesion: 0.22
Nodes (8): Lo que ya se sabe (verificado en los datos), Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá, Prompts de trabajo (los que se ejecutaron), Qué se construye, Ronda 3: Accesibilidad, backend de Inicio, armonía, Ronda 4: Radar y propuesta de valor, Ronda 5: identidad visual y modo noche, Verificación

### Community 28 - "transform"
Cohesion: 0.20
Nodes (8): Performance, Transition only what changes, Use will-change sparingly, Name the animated property in will-change, areas_por_barrio(), distancia_lineal_estacion(), pct_comuna(), transform()

### Community 29 - "Leyenda.tsx"
Cohesion: 0.60
Nodes (4): BloqueLeyenda, Leyenda(), Muestra(), ItemLeyenda

### Community 30 - "Plan: mapa inmersivo definitivo"
Cohesion: 0.40
Nodes (4): Archivos a tocar, Decisiones, Plan: mapa inmersivo definitivo, Verificación

### Community 33 - "Prioridades.tsx"
Cohesion: 0.10
Nodes (30): celda(), csvBarrios(), descargar(), calcularIndice(), Componente, Fila, Puntaje, calcular() (+22 more)

### Community 34 - "datos.ts"
Cohesion: 0.13
Nodes (21): ESTILO_TIPO, EtiquetaTipo(), NOMBRE_TIPO, FichaElemento(), Foto(), cache, Estado, fecha() (+13 more)

### Community 35 - "Barrio.tsx"
Cohesion: 0.14
Nodes (23): Anillo, Barrios, Geom, MiniMapaBarrios(), sin(), Aviso(), Fuente(), Barrio() (+15 more)

### Community 36 - "Lideres.tsx"
Cohesion: 0.16
Nodes (23): DIRECTORIO, Entrada, GrupoAcudir, alLunes(), esHabil(), festivos(), habilesHasta(), iso() (+15 more)

### Community 37 - "UI polish"
Cohesion: 0.09
Nodes (22): Align optically where geometry looks off, Before you finish, Contain scroll inside overlays, Cross-fade contextual icons with exact values, Exact values, optional polish, Exits are shorter and smaller than enters, Gate motion behind the reduced-motion preference, High-frequency interactions get no animation (+14 more)

### Community 38 - "Accesibilidad.tsx"
Cohesion: 0.19
Nodes (20): Barra(), Dato(), FichaBarrio(), Seccion(), senales(), cop(), dec(), dec2() (+12 more)

### Community 39 - "reclamos.py"
Cohesion: 0.21
Nodes (16): colecciones(), dias_entre(), escribir(), feature(), fecha_iso(), foto_ok(), fuente(), huecos() (+8 more)

### Community 40 - "main.py"
Cohesion: 0.23
Nodes (15): accesibilidad(), barrio(), barrios(), calidad(), _capas_disponibles(), corredor_49(), fuentes(), indicadores() (+7 more)

### Community 41 - "votos.py"
Cohesion: 0.16
Nodes (6): _conexion(), _ruta_db(), _totales(), ver_votos(), votar(), Voto

### Community 42 - "num"
Cohesion: 0.21
Nodes (15): claseDeFuente(), EtiquetaClase(), num(), Calidad, FichaBarrio, Fuente, Indicadores, IndicadorMetodo (+7 more)

### Community 43 - "Indicadores.tsx"
Cohesion: 0.16
Nodes (13): ClaseDato, C, claseDe(), CLASES_SINIESTRO, Contenido(), Def, DEFS, estiloTooltip (+5 more)

### Community 44 - "radar.py"
Cohesion: 0.27
Nodes (7): bajar(), es_sensible(), main(), norm(), relevante(), _rx(), temas()

### Community 45 - "residuos.py"
Cohesion: 0.28
Nodes (8): a_geojson(), atribuible(), cuantiles(), escribir(), meses_del_periodo(), principal(), prueba(), redondear()

### Community 46 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, postcss, tailwindcss, @types/geojson, @types/leaflet, @types/react, @types/react-dom (+5 more)

### Community 47 - "Surfaces"
Cohesion: 0.17
Nodes (11): Asymmetric icons, Buttons with text and an icon, Concentric border radius, Dark mode, Image outlines, Light mode, Optical alignment, Play button triangles (+3 more)

### Community 48 - "riesgo.py"
Cohesion: 0.24
Nodes (5): a_metros(), fraccion(), leer(), main(), union_de()

### Community 49 - "Inmobiliario.tsx"
Cohesion: 0.21
Nodes (11): Capa, Centralidad, Contenido(), cop(), Corredor, GAMA, Inmobiliario(), Instrumento (+3 more)

### Community 51 - "resumen.py"
Cohesion: 0.27
Nodes (3): _c(), construir(), _json()

### Community 52 - "PanelCapas.tsx"
Cohesion: 0.27
Nodes (9): FiltroHuecos, FiltroSiniestros, Modo, ANIOS, ANIOS_HUECOS, Props, CAPAS, COLORES_BARRIO (+1 more)

### Community 53 - "Enter animations"
Cohesion: 0.22
Nodes (9): CSS, Enter and exit animations, Enter animations, Entering from display: none, Exit animations, Full exit, Good and bad, Motion (+1 more)

### Community 54 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, @fontsource-variable/inter, leaflet, maplibre-gl, react, react-dom, react-leaflet, react-router-dom (+1 more)

### Community 55 - "Animations"
Cohesion: 0.25
Nodes (8): Animations, High-frequency motion, Interruptible animations, Reduced-motion fallback, Scale on press, Skip animation on page load, Static prop pattern, Suppress transitions on theme switch

### Community 56 - "Residuos.tsx"
Cohesion: 0.50
Nodes (7): Kpi(), colorEscala(), Contenido(), Fila, MapaBarrios(), norm(), Residuos

### Community 57 - "Icons"
Cohesion: 0.33
Nodes (6): Design at render size, Icons, Icons in RTL, Match icon stroke to text weight, One SVG, recolored per state, Outline default, fill active

### Community 59 - "Icon transitions"
Cohesion: 0.40
Nodes (5): CSS, both icons in the DOM, Icon transitions, Motion, Which icons animate, Which library

### Community 60 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, typecheck

### Community 61 - "main.tsx"
Cohesion: 0.40
Nodes (3): @fontsource-variable/inter, leaflet, react-dom

### Community 62 - "Ponytail, lazy senior dev mode"
Cohesion: 0.50
Nodes (3): Before you write, Ponytail, lazy senior dev mode, The smallest complete change

### Community 63 - "vite.config.ts"
Cohesion: 0.50
Nodes (3): vite, vite-plugin-pwa, @vitejs/plugin-react

## Knowledge Gaps
- **9 isolated node(s):** `@types/geojson`, `@types/leaflet`, `@types/react`, `@types/react-dom`, `autoprefixer` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 387 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Cabecera`, `Participacion.tsx`, `package.json`, `MapaVivo.tsx`, `App.tsx`, `Layout.tsx`, `useDatos`, `Datos.tsx`, `cargar`, `Mapa.tsx`, `ControlesMapa.tsx`, `Prioridades.tsx`, `datos.ts`, `Barrio.tsx`, `Lideres.tsx`, `Accesibilidad.tsx`, `num`, `Indicadores.tsx`, `Inmobiliario.tsx`, `Residuos.tsx`, `main.tsx`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `@types/geojson`, `@types/leaflet`, `@types/react` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cabecera` be split into smaller, more focused modules?**
  _Cohesion score 0.1206896551724138 - nodes in this community are weakly interconnected._
- **Why does `transform()` connect `transform` to `riesgo.py`, `procesar.py`, `Icon transitions`, `eje49.py`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `capas.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09956709956709957 - nodes in this community are weakly interconnected._
- **Why does `react-router-dom` connect `react` to `Cabecera`, `Prioridades.tsx`, `datos.ts`, `package.json`, `Barrio.tsx`, `Accesibilidad.tsx`, `App.tsx`, `num`, `Indicadores.tsx`, `Layout.tsx`, `Inmobiliario.tsx`, `useDatos`, `Datos.tsx`, `Mapa.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `Participacion.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08081632653061224 - nodes in this community are weakly interconnected._