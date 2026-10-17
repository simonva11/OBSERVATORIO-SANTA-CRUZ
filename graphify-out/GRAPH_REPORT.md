# Graph Report - otea  (2026-10-17)

## Corpus Check
- 125 files · ~294,290 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 1, .toml 1)

## Summary
- 1115 nodes · 2873 edges · 71 communities (61 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3a04b436`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Seccion
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
- videos.mjs
- Pagina.tsx
- Datos.tsx
- eje49.py
- audio.py
- Ciudadano.tsx
- Mapa.tsx
- Lideres.tsx
- ciudadano.py
- Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá
- Inmobiliario.tsx
- Leyenda.tsx
- Plan: mapa inmersivo definitivo
- CLAUDE.md
- Prioridades.tsx
- ConDatos
- num
- plazos.ts
- UI polish
- Plan: rediseño de la página de Inicio
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
- acudir.ts
- resumen.py
- PanelCapas.tsx
- Enter animations
- dependencies
- Animations
- Cabecera
- Icons
- Icon transitions
- scripts
- main.tsx
- Ponytail, lazy senior dev mode
- vite.config.ts
- Fotos de OTEA
- Guion del video de OTEA (≈ 1 min 55 s)
- FondoPagina.tsx
- useDatos
- Propuesta.tsx
- tipos.ts
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
- `Dónde está cada cosa (índice de código)` --references--> `DibujoComuna()`  [INFERRED]
  plans/inicio-ux-revamp.md → frontend/src/pages/Tecnico.tsx

## Import Cycles
- None detected.

## Communities (71 total, 10 thin omitted)

### Community 0 - "Seccion"
Cohesion: 0.20
Nodes (21): Aviso(), claseDeFuente(), EtiquetaClase(), Fuente(), Metodo(), Seccion(), fecha(), Catalogo() (+13 more)

### Community 1 - "capas.ts"
Cohesion: 0.10
Nodes (24): Barra(), Dato(), FichaBarrio(), Seccion(), senales(), TRAZOS, AMENAZA, COLOR (+16 more)

### Community 2 - "Participacion.tsx"
Cohesion: 0.07
Nodes (48): Detalle(), minutos(), PanelRuteo(), codigo(), leerMis(), TEMAS, Totales, Votacion() (+40 more)

### Community 3 - "package.json"
Cohesion: 0.12
Nodes (16): description, name, private, type, version, autoprefixer, postcss, react-leaflet (+8 more)

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
Cohesion: 0.11
Nodes (8): Elevacion, h(), infraestructura(), leer(), main(), enganchar(), tiempos_desde(), tobler_kmh()

### Community 8 - "json"
Cohesion: 0.18
Nodes (9): caja_comuna(), walk(), descargar_ecv(), descargar_fuente(), descargar_osm_caminos(), _get_json(), main(), parametros_espaciales() (+1 more)

### Community 9 - "App.tsx"
Cohesion: 0.13
Nodes (27): Accesibilidad, App(), Barrio, Corredor49, Datos, Fuentes, Historia, Historias (+19 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 11 - "OTEA"
Cohesion: 0.14
Nodes (13): 1. Ver la plataforma (lo más rápido), 2. Volver a descargar y procesar los datos, 3. API (opcional en esta fase), 4. Pruebas, Aseo y residuos (Servicios públicos), Cómo correrlo, Dos experiencias, una plataforma, Estado (+5 more)

### Community 12 - "Layout.tsx"
Cohesion: 0.06
Nodes (49): MenuCiudadano(), BarraModulos(), BotonPie(), BotonTema(), IndicePagina(), ItemMenu(), Layout(), LetraCompacta() (+41 more)

### Community 13 - "videos.mjs"
Cohesion: 0.12
Nodes (11): errores, mapa, BASE, grabar(), instalarCapa(), SALIDA, AQUI, DESCARGAS (+3 more)

### Community 19 - "Pagina.tsx"
Cohesion: 0.13
Nodes (29): Cuenta(), Revelar(), useVisto(), IconoNav(), TRAZOS, CLASE, FuenteCat, Relacionados() (+21 more)

### Community 20 - "Datos.tsx"
Cohesion: 0.10
Nodes (28): Buscador(), Fuente, FUENTES_BUSQUEDA, normalizar(), Resultado, Opciones, Props, coleccionMisDatos() (+20 more)

### Community 21 - "eje49.py"
Cohesion: 0.12
Nodes (9): cargar(), main(), cerca(), metros(), a_metros(), fraccion(), leer(), main() (+1 more)

### Community 22 - "audio.py"
Cohesion: 0.19
Nodes (14): _banda(), campana(), componer(), duracion(), efectos(), impacto(), obturador(), rms_db() (+6 more)

### Community 23 - "Ciudadano.tsx"
Cohesion: 0.07
Nodes (53): AtlasBarrios(), Compartir(), urlDe(), Foto(), InfoFoto(), CORTO, LeyendaMapa(), MapaBarrios() (+45 more)

### Community 24 - "Mapa.tsx"
Cohesion: 0.16
Nodes (22): useNocheActiva(), HoraSol(), Icono(), PanelCapas(), capaPorId(), IdHistoria, PreguntaMapa, preguntaPorId() (+14 more)

### Community 25 - "Lideres.tsx"
Cohesion: 0.36
Nodes (8): Actores(), Contenido(), Fila, hechos(), leer(), Lideres(), limite(), TEMAS

### Community 26 - "ciudadano.py"
Cohesion: 0.24
Nodes (5): clave(), construir(), leer(), probar(), nodo()

### Community 27 - "Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá"
Cohesion: 0.22
Nodes (8): Lo que ya se sabe (verificado en los datos), Plan: rutas por la Carrera 49, más datos, problemáticas reales y escalado al Valle de Aburrá, Prompts de trabajo (los que se ejecutaron), Qué se construye, Ronda 3: Accesibilidad, backend de Inicio, armonía, Ronda 4: Radar y propuesta de valor, Ronda 5: identidad visual y modo noche, Verificación

### Community 28 - "Inmobiliario.tsx"
Cohesion: 0.21
Nodes (12): BotonCabecera(), Capa, Centralidad, Contenido(), cop(), Corredor, GAMA, Inmobiliario() (+4 more)

### Community 29 - "Leyenda.tsx"
Cohesion: 0.60
Nodes (4): BloqueLeyenda, Leyenda(), Muestra(), ItemLeyenda

### Community 30 - "Plan: mapa inmersivo definitivo"
Cohesion: 0.40
Nodes (4): Archivos a tocar, Decisiones, Plan: mapa inmersivo definitivo, Verificación

### Community 33 - "Prioridades.tsx"
Cohesion: 0.10
Nodes (30): celda(), csvBarrios(), descargar(), calcularIndice(), Componente, Fila, Puntaje, calcular() (+22 more)

### Community 34 - "ConDatos"
Cohesion: 0.16
Nodes (13): ConDatos(), ErrorCarga(), ESTILO_TIPO, NOMBRE_TIPO, cache, Estado, TipoDato, Barra() (+5 more)

### Community 35 - "num"
Cohesion: 0.11
Nodes (33): Anillo, Barrios, Geom, MiniMapaBarrios(), sin(), dec(), nf, nf1 (+25 more)

### Community 36 - "plazos.ts"
Cohesion: 0.32
Nodes (12): alLunes(), esHabil(), festivos(), habilesHasta(), iso(), memo, pascua(), sumar() (+4 more)

### Community 37 - "UI polish"
Cohesion: 0.09
Nodes (22): Align optically where geometry looks off, Before you finish, Contain scroll inside overlays, Cross-fade contextual icons with exact values, Exact values, optional polish, Exits are shorter and smaller than enters, Gate motion behind the reduced-motion preference, High-frequency interactions get no animation (+14 more)

### Community 38 - "Plan: rediseño de la página de Inicio"
Cohesion: 0.29
Nodes (6): Archivos a tocar, Cifras: se usan las reales, Decisiones, Dónde está cada cosa (índice de código), Plan: rediseño de la página de Inicio, Verificación

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
Cohesion: 0.16
Nodes (13): ClaseDato, C, claseDe(), CLASES_SINIESTRO, Contenido(), Def, DEFS, estiloTooltip (+5 more)

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

### Community 49 - "acudir.ts"
Cohesion: 0.50
Nodes (3): DIRECTORIO, Entrada, GrupoAcudir

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

### Community 56 - "Cabecera"
Cohesion: 0.20
Nodes (16): Cabecera(), Kpi(), ubicacion(), COLOR_TEMA, Contenido(), MESES, nombreMes(), Noticia (+8 more)

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

### Community 68 - "useDatos"
Cohesion: 0.26
Nodes (12): useDatos(), useProyeccion(), colorExtra(), MapaEje(), centroide(), DESTINOS, limpio(), Manzana (+4 more)

### Community 69 - "Propuesta.tsx"
Cohesion: 0.22
Nodes (10): Indicadores, CAPACIDADES, Chip(), CLASE, Contenido(), Estado, NIVELES, PARA_QUIEN (+2 more)

### Community 70 - "tipos.ts"
Cohesion: 0.21
Nodes (12): EtiquetaTipo(), FichaElemento(), Foto(), DefCapa, texto(), Calidad, FichaBarrio, Fuente (+4 more)

### Community 71 - "Shorts de OTEA (1080 × 1920)"
Cohesion: 0.50
Nodes (3): Cómo grabar, Shorts de OTEA (1080 × 1920), Sonido

## Knowledge Gaps
- **9 isolated node(s):** `@types/geojson`, `@types/leaflet`, `@types/react`, `@types/react-dom`, `autoprefixer` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 421 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Pagina.tsx` to `Seccion`, `capas.ts`, `Participacion.tsx`, `package.json`, `MapaVivo.tsx`, `App.tsx`, `Layout.tsx`, `Datos.tsx`, `Ciudadano.tsx`, `Mapa.tsx`, `Lideres.tsx`, `Inmobiliario.tsx`, `Prioridades.tsx`, `ConDatos`, `num`, `ControlesMapa.tsx`, `Indicadores.tsx`, `Cabecera`, `main.tsx`, `FondoPagina.tsx`, `useDatos`, `Propuesta.tsx`, `tipos.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `@types/geojson`, `@types/leaflet`, `@types/react` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `capas.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09788359788359788 - nodes in this community are weakly interconnected._
- **Why does `useDatos()` connect `useDatos` to `Seccion`, `capas.ts`, `Participacion.tsx`, `num`, `ConDatos`, `Prioridades.tsx`, `tipos.ts`, `Propuesta.tsx`, `Indicadores.tsx`, `Pagina.tsx`, `Datos.tsx`, `Ciudadano.tsx`, `Mapa.tsx`, `Lideres.tsx`, `Cabecera`, `Inmobiliario.tsx`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `Participacion.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07080200501253132 - nodes in this community are weakly interconnected._
- **Why does `transform()` connect `procesar.py` to `Icon transitions`, `eje49.py`, `red.py`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._