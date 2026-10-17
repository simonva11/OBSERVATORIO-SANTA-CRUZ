# Graph Report - otea  (2026-10-17)

## Corpus Check
- 124 files · ~292,131 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 1, .toml 1)

## Summary
- 1089 nodes · 2805 edges · 72 communities (62 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1c95ded7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Pagina.tsx
- capas.ts
- PanelRuteo.tsx
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
- videos.mjs
- Corredor49.tsx
- Datos.tsx
- eje49.py
- Coleccion
- react
- Mapa.tsx
- riesgo.py
- ciudadano.py
- Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá
- ConDatos
- Leyenda.tsx
- Plan: mapa inmersivo definitivo
- CLAUDE.md
- Prioridades.tsx
- Reclamos.tsx
- useDatos
- Lideres.tsx
- UI polish
- Relacionados
- reclamos.py
- main.py
- votos.py
- ControlesMapa.tsx
- Indicadores.tsx
- radar.py
- residuos.py
- devDependencies
- Surfaces
- Fuentes, indicadores y trazabilidad
- Participacion.tsx
- resumen.py
- PanelCapas.tsx
- Enter animations
- dependencies
- Animations
- num
- Icons
- Icon transitions
- scripts
- main.tsx
- Ponytail, lazy senior dev mode
- vite.config.ts
- Fotos de OTEA
- Guion del video de OTEA (≈ 1 min 55 s)
- cargar
- tipos.ts
- MiLugar.tsx
- Propuesta.tsx
- FichaElemento.tsx
- Shorts de OTEA (1080 × 1920)

## God Nodes (most connected - your core abstractions)
1. `num()` - 67 edges
2. `useDatos()` - 64 edges
3. `react` - 49 edges
4. `Cabecera()` - 41 edges
5. `ConDatos()` - 39 edges
6. `Seccion()` - 37 edges
7. `Relacionados()` - 37 edges
8. `dec()` - 37 edges
9. `Fuente()` - 36 edges
10. `App()` - 31 edges

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

## Communities (72 total, 10 thin omitted)

### Community 0 - "Pagina.tsx"
Cohesion: 0.14
Nodes (28): Aviso(), CLASE, ClaseDato, claseDeFuente(), EtiquetaClase(), FuenteCat, Kpi(), Metodo() (+20 more)

### Community 1 - "capas.ts"
Cohesion: 0.11
Nodes (17): TRAZOS, AMENAZA, COLOR, COLOR_HUECO_ARREGLADO, COLOR_HUECO_PENDIENTE, COLOR_OBRA_OTRO, dias(), DOMINIOS_OBRA (+9 more)

### Community 2 - "PanelRuteo.tsx"
Cohesion: 0.21
Nodes (18): Detalle(), minutos(), PanelRuteo(), metros(), distanciaM(), cargarRed(), DESTINOS_RUTEO, destinosCercanos() (+10 more)

### Community 3 - "package.json"
Cohesion: 0.12
Nodes (15): description, name, private, type, version, autoprefixer, postcss, recharts (+7 more)

### Community 4 - "Fase 1. Diseño técnico"
Cohesion: 0.18
Nodes (10): 1. Cómo va a funcionar la plataforma, 2. Arquitectura técnica recomendada, 3. Estructura de carpetas, 4. Diseño inicial de la base de datos, 5. Fuentes oficiales que se deben comprobar, 6. Qué se puede hacer desde ya y qué depende de más datos, 7. Plan de desarrollo por pasos, Fase 1. Diseño técnico (+2 more)

### Community 5 - "procesar.py"
Cohesion: 0.11
Nodes (26): Performance, Transition only what changes, Use will-change sparingly, Name the animated property in will-change, a_feature(), fecha_ms(), grupo_equipamiento(), guardar() (+18 more)

### Community 6 - "MapaVivo.tsx"
Cohesion: 0.10
Nodes (33): ALTURA(), aplicarFiltroHuecos(), aplicarFiltroSiniestros(), aplicarNocheEdificios(), aplicarOpacidad(), aplicarSol(), cajaDe(), Capa (+25 more)

### Community 7 - "red.py"
Cohesion: 0.10
Nodes (8): Elevacion, h(), infraestructura(), leer(), main(), enganchar(), tiempos_desde(), tobler_kmh()

### Community 8 - "json"
Cohesion: 0.18
Nodes (9): caja_comuna(), walk(), descargar_ecv(), descargar_fuente(), descargar_osm_caminos(), _get_json(), main(), parametros_espaciales() (+1 more)

### Community 9 - "App.tsx"
Cohesion: 0.09
Nodes (35): Accesibilidad, App(), Barrio, Corredor49, Datos, Fuentes, Historia, Historias (+27 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 11 - "OTEA"
Cohesion: 0.14
Nodes (13): 1. Ver la plataforma (lo más rápido), 2. Volver a descargar y procesar los datos, 3. API (opcional en esta fase), 4. Pruebas, Aseo y residuos (Servicios públicos), Cómo correrlo, Dos experiencias, una plataforma, Estado (+5 more)

### Community 12 - "Layout.tsx"
Cohesion: 0.07
Nodes (51): MenuCiudadano(), IconoNav(), TRAZOS, BarraModulos(), BotonPie(), BotonTema(), IndicePagina(), ItemMenu() (+43 more)

### Community 13 - "videos.mjs"
Cohesion: 0.12
Nodes (11): errores, mapa, BASE, grabar(), instalarCapa(), SALIDA, AQUI, DESCARGAS (+3 more)

### Community 19 - "Corredor49.tsx"
Cohesion: 0.15
Nodes (21): Cuenta(), useVisto(), ValorAnimado(), dec(), Barra(), colorExtra(), Contenido(), Corredor49() (+13 more)

### Community 20 - "Datos.tsx"
Cohesion: 0.16
Nodes (19): coleccionMisDatos(), ConjuntoPropio, guardarConjuntos(), leerConjuntos(), leerCSV(), leerGeoJSON(), LIMITE_BYTES, NOMBRES_LAT (+11 more)

### Community 21 - "eje49.py"
Cohesion: 0.18
Nodes (4): cargar(), main(), cerca(), metros()

### Community 22 - "Coleccion"
Cohesion: 0.29
Nodes (9): Buscador(), Fuente, FUENTES_BUSQUEDA, normalizar(), Resultado, Opciones, Props, Coleccion (+1 more)

### Community 23 - "react"
Cohesion: 0.07
Nodes (54): AtlasBarrios(), Compartir(), urlDe(), Foto(), InfoFoto(), CORTO, LeyendaMapa(), MapaBarrios() (+46 more)

### Community 24 - "Mapa.tsx"
Cohesion: 0.16
Nodes (23): useNocheActiva(), HoraSol(), Icono(), PanelCapas(), capaPorId(), historiaPorId(), IdHistoria, PreguntaMapa (+15 more)

### Community 25 - "riesgo.py"
Cohesion: 0.31
Nodes (5): a_metros(), fraccion(), leer(), main(), union_de()

### Community 26 - "ciudadano.py"
Cohesion: 0.24
Nodes (5): clave(), construir(), leer(), probar(), nodo()

### Community 27 - "Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá"
Cohesion: 0.22
Nodes (8): Lo que ya se sabe (verificado en los datos), Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá, Prompts de trabajo (los que se ejecutaron), Qué se construye, Ronda 3: Accesibilidad, backend de Inicio, armonía, Ronda 4: Radar y propuesta de valor, Ronda 5: identidad visual y modo noche, Verificación

### Community 28 - "ConDatos"
Cohesion: 0.12
Nodes (19): ConDatos(), ErrorCarga(), ESTILO_TIPO, NOMBRE_TIPO, cache, Estado, TipoDato, Capa (+11 more)

### Community 29 - "Leyenda.tsx"
Cohesion: 0.60
Nodes (4): BloqueLeyenda, Leyenda(), Muestra(), ItemLeyenda

### Community 30 - "Plan: mapa inmersivo definitivo"
Cohesion: 0.40
Nodes (4): Archivos a tocar, Decisiones, Plan: mapa inmersivo definitivo, Verificación

### Community 33 - "Prioridades.tsx"
Cohesion: 0.10
Nodes (29): celda(), csvBarrios(), descargar(), calcularIndice(), Componente, Fila, Puntaje, calcular() (+21 more)

### Community 34 - "Reclamos.tsx"
Cohesion: 0.33
Nodes (8): BotonCabecera(), Barra(), BarrioHuecos, Contenido(), DOMINIO, Lista(), PuntoHueco, Reclamos

### Community 35 - "useDatos"
Cohesion: 0.16
Nodes (24): Anillo, Barrios, Geom, MiniMapaBarrios(), sin(), Cabecera(), Fuente(), useDatos() (+16 more)

### Community 36 - "Lideres.tsx"
Cohesion: 0.16
Nodes (23): DIRECTORIO, Entrada, GrupoAcudir, alLunes(), esHabil(), festivos(), habilesHasta(), iso() (+15 more)

### Community 37 - "UI polish"
Cohesion: 0.09
Nodes (22): Align optically where geometry looks off, Before you finish, Contain scroll inside overlays, Cross-fade contextual icons with exact values, Exact values, optional polish, Exits are shorter and smaller than enters, Gate motion behind the reduced-motion preference, High-frequency interactions get no animation (+14 more)

### Community 38 - "Relacionados"
Cohesion: 0.27
Nodes (12): Revelar(), Relacionados(), Accesibilidad(), Calculadora(), COLOR_BARRA(), Contenido(), DESTINOS, Fila (+4 more)

### Community 39 - "reclamos.py"
Cohesion: 0.20
Nodes (16): colecciones(), dias_entre(), escribir(), feature(), fecha_iso(), foto_ok(), fuente(), huecos() (+8 more)

### Community 40 - "main.py"
Cohesion: 0.23
Nodes (15): accesibilidad(), barrio(), barrios(), calidad(), _capas_disponibles(), corredor_49(), fuentes(), indicadores() (+7 more)

### Community 41 - "votos.py"
Cohesion: 0.16
Nodes (6): _conexion(), _ruta_db(), _totales(), ver_votos(), votar(), Voto

### Community 42 - "ControlesMapa.tsx"
Cohesion: 0.27
Nodes (8): BotonesCamara(), Brujula(), capturarFoto(), fechaArchivo(), ICONOS, useCamara(), textoHora(), maplibre-gl

### Community 43 - "Indicadores.tsx"
Cohesion: 0.12
Nodes (24): Barra(), Dato(), FichaBarrio(), Seccion(), senales(), cop(), dec2(), nf (+16 more)

### Community 44 - "radar.py"
Cohesion: 0.27
Nodes (7): bajar(), es_sensible(), main(), norm(), relevante(), _rx(), temas()

### Community 45 - "residuos.py"
Cohesion: 0.32
Nodes (8): a_geojson(), atribuible(), cuantiles(), escribir(), meses_del_periodo(), principal(), prueba(), redondear()

### Community 46 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, postcss, tailwindcss, @types/geojson, @types/leaflet, @types/react, @types/react-dom (+5 more)

### Community 47 - "Surfaces"
Cohesion: 0.17
Nodes (11): Asymmetric icons, Buttons with text and an icon, Concentric border radius, Dark mode, Image outlines, Light mode, Optical alignment, Play button triangles (+3 more)

### Community 48 - "Fuentes, indicadores y trazabilidad"
Cohesion: 0.25
Nodes (7): Detalle por fuente, Fuentes, Fuentes, indicadores y trazabilidad, Fuentes por verificar, Glosario, Indicadores, Notas de calidad

### Community 49 - "Participacion.tsx"
Cohesion: 0.18
Nodes (18): fotoValida(), limpiarTexto(), procesarFoto(), revisarDescripcion(), Revision, TIPOS, CAJA, CATEGORIAS (+10 more)

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

### Community 56 - "num"
Cohesion: 0.54
Nodes (7): num(), colorEscala(), Contenido(), Fila, MapaBarrios(), norm(), Residuos

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

### Community 64 - "Fotos de OTEA"
Cohesion: 0.40
Nodes (4): Cómo agregar una foto, Fotos de OTEA, Fotos que faltan (para tomar en terreno), Las que hay hoy

### Community 65 - "Guion del video de OTEA (≈ 1 min 55 s)"
Cohesion: 0.40
Nodes (4): Guion del video de OTEA (≈ 1 min 55 s), Notas para que el video sea honesto, Shorts verticales (para redes y la campaña de votación), Tomas sugeridas

### Community 66 - "cargar"
Cohesion: 0.24
Nodes (10): codigo(), leerMis(), TEMAS, Totales, Votacion(), cargar(), API, Pulso (+2 more)

### Community 67 - "tipos.ts"
Cohesion: 0.18
Nodes (9): LINEAS_METRO, Calidad, FichaBarrio, IndicadorMetodo, Metodologia, SerieECV, PARA_QUIEN, PASOS (+1 more)

### Community 68 - "MiLugar.tsx"
Cohesion: 0.31
Nodes (9): enAnillo(), enPoligono(), puntoEn(), centroide(), DESTINOS, limpio(), Manzana, MiLugar() (+1 more)

### Community 69 - "Propuesta.tsx"
Cohesion: 0.22
Nodes (10): Indicadores, CAPACIDADES, Chip(), CLASE, Contenido(), Estado, NIVELES, PARA_QUIEN (+2 more)

### Community 70 - "FichaElemento.tsx"
Cohesion: 0.39
Nodes (7): EtiquetaTipo(), FichaElemento(), Foto(), DefCapa, texto(), Fuente, Props

## Knowledge Gaps
- **9 isolated node(s):** `@types/geojson`, `@types/leaflet`, `@types/react`, `@types/react-dom`, `autoprefixer` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 415 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Pagina.tsx`, `PanelRuteo.tsx`, `package.json`, `MapaVivo.tsx`, `App.tsx`, `Layout.tsx`, `Corredor49.tsx`, `Datos.tsx`, `Coleccion`, `Mapa.tsx`, `ConDatos`, `Prioridades.tsx`, `Reclamos.tsx`, `useDatos`, `Lideres.tsx`, `Relacionados`, `ControlesMapa.tsx`, `Indicadores.tsx`, `Participacion.tsx`, `num`, `main.tsx`, `cargar`, `tipos.ts`, `MiLugar.tsx`, `Propuesta.tsx`, `FichaElemento.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `@types/geojson`, `@types/leaflet`, `@types/react` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Pagina.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1350806451612903 - nodes in this community are weakly interconnected._
- **Why does `useDatos()` connect `useDatos` to `Pagina.tsx`, `App.tsx`, `Corredor49.tsx`, `Datos.tsx`, `react`, `Mapa.tsx`, `ConDatos`, `Prioridades.tsx`, `Reclamos.tsx`, `Lideres.tsx`, `Relacionados`, `Indicadores.tsx`, `Participacion.tsx`, `num`, `cargar`, `tipos.ts`, `MiLugar.tsx`, `Propuesta.tsx`, `FichaElemento.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `capas.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `react-router-dom` connect `Corredor49.tsx` to `Pagina.tsx`, `Prioridades.tsx`, `Reclamos.tsx`, `package.json`, `useDatos`, `MiLugar.tsx`, `Relacionados`, `Propuesta.tsx`, `tipos.ts`, `App.tsx`, `Indicadores.tsx`, `Layout.tsx`, `Datos.tsx`, `react`, `Mapa.tsx`, `ConDatos`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._