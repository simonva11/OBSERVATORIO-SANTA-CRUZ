# Fase 1. Diseño técnico

**OTEA · Observatorio Inmobiliario y Territorial Santa Cruz**
Reto #4 de Territorio INN 2026. Línea 4 Físico espacial: espacios públicos, equipamientos y movilidad.

> Pregunta que guía todo el sistema: ¿cómo optimizar la infraestructura vial, peatonal y de acceso, facilitando la conexión interna de la comuna 2 Santa Cruz con el resto de Medellín?

Fecha de este diseño: 9 de octubre de 2026.

---

## 1. Cómo va a funcionar la plataforma

La plataforma tiene tres capas de trabajo, y cada una se apoya en la anterior.

1. **Datos.** Un proceso automático (el *pipeline*) descarga capas oficiales de la Alcaldía de Medellín y del DANE, las recorta a la Comuna 2 y calcula indicadores con fórmulas escritas en el código. Cada dato queda marcado con su fuente, su fecha y su tipo: oficial, de terceros, levantado en campo o demostrativo.
2. **Análisis.** Sobre esos datos se calculan los indicadores de cada barrio (población, equipamientos, espacio público, riesgo, siniestros viales, tratamientos del POT). En la Fase 3 se suma el tiempo de caminata por la red de calles y el puntaje para priorizar obras.
3. **Consulta.** Una aplicación web con un mapa en el centro. La persona activa capas, busca un barrio o un equipamiento y abre una ficha que muestra lo que se sabe de ese lugar, lo que todavía falta y de dónde sale cada cifra.

Lo que la plataforma **no** hace: no decide obras, no reemplaza estudios técnicos, no da avalúos oficiales y no inventa datos para llenar vacíos. Cuando falta un dato, lo dice.

### Hallazgos de la Fase 1 que cambian el diseño

- **Los datos oficiales sí están disponibles y son consultables por programa.** El geoportal de la Alcaldía (servicios ArcGIS REST) publica el límite de la comuna, sus 11 barrios, el POT (tratamientos, amenazas, riesgo, espacio público proyectado, jerarquía vial), equipamientos, sedes educativas, escenarios del INDER, estaciones, rutas de bus, malla vial y siniestros viales. Ya se descargaron y se verificaron.
- **El DANE publica la población del Censo 2018 por manzana.** Con eso se puede saber cuántas personas viven en cada barrio y, más adelante, cuántas se benefician con cada obra. Resultado: 108.252 personas en la comuna según el censo.
- **Ya existe un Observatorio Inmobiliario de Medellín (OIME)**, de la Subsecretaría de Catastro. Publica ofertas de vivienda tomadas de portales en internet. Esto es importante para el proyecto: no conviene presentarse como "el observatorio inmobiliario" de la ciudad, sino como una herramienta territorial que **usa** los datos del OIME y los cruza con movilidad, equipamientos y POT a escala de barrio. Para Santa Cruz el OIME tiene solo 41 ofertas, todas de 2023.
- **La Alcaldía sí publica un inventario de andenes.** Está en el servicio de infraestructura de transporte (VC_Infraest_Gestion_Transporte) con ancho, estado y obstáculos, junto con calzadas con pendiente, paradas de bus, red ciclista, puentes y red peatonal del POT. En Santa Cruz suma casi 78 km de andén, con un ancho típico de 1,3 m. Lo que falta es saber qué significan algunos códigos de estado y validarlo en campo.
- **OpenStreetMap se consulta por teselas vectoriales de OpenFreeMap**, porque el servicio Overpass no respondió. De ahí salen las escaleras y senderos peatonales que la malla oficial no tiene.

---

## 2. Arquitectura técnica recomendada

Se elige una arquitectura que se pueda correr en un computador de estudiante y crecer sin rehacerse.

```
   Servicios públicos                 Pipeline (Python)                  Aplicación
 ┌──────────────────────┐      ┌───────────────────────────┐      ┌──────────────────────────┐
 │ Geoportal Alcaldía   │      │ descargar.py              │      │ Frontend React + TS      │
 │ (ArcGIS REST)        │ ───► │  guarda data/raw/         │      │  Leaflet (mapa)          │
 │ Geoportal DANE       │      │ procesar.py               │ ───► │  Recharts (gráficas)     │
 │ (OIME, ECV, POT...)  │      │  recorta, calcula,        │      │  Tailwind (estilos)      │
 └──────────────────────┘      │  escribe GeoJSON + JSON   │      │  lee /data/*.geojson     │
                               │ accesibilidad.py (Fase 3) │      └────────────┬─────────────┘
                               └─────────────┬─────────────┘                   │
                                             │                    ┌────────────▼─────────────┐
                                             └──────────────────► │ Backend FastAPI          │
                                                                  │  /api/capas, /api/barrios│
                                                                  │  /api/reportes (Fase 4)  │
                                                                  │  PostgreSQL + PostGIS    │
                                                                  │  (cuando crezca)         │
                                                                  └──────────────────────────┘
```

| Pieza | Tecnología | Por qué |
|---|---|---|
| Interfaz | React 18 + TypeScript + Vite | Tipado, rápido de compilar, fácil de desplegar como sitio estático |
| Estilos | Tailwind CSS 3 | Diseño consistente sin hojas de estilo enormes |
| Mapa | Leaflet + react-leaflet, mapa base de OpenStreetMap/CARTO | Libre, liviano, funciona bien en celular |
| Gráficas | Recharts | Se integra con React y es suficiente para barras y series |
| Datos | Python: shapely, pyproj, networkx | Recortes, áreas en metros (MAGNA-SIRGAS Origen Nacional, EPSG:9377) y rutas por red |
| API | FastAPI | Documentación automática, sencilla de probar |
| Base de datos | Archivos GeoJSON en el prototipo. PostgreSQL + PostGIS cuando haya reportes ciudadanos y varias comunas | Evita instalar una base de datos antes de necesitarla |

**Decisión clave:** en el prototipo la aplicación lee archivos ya procesados. Así se puede mostrar funcionando sin servidor. El backend existe desde ya con las mismas rutas, para que el paso a PostGIS (Fase 4) no obligue a cambiar la interfaz.

**Escalabilidad:** el código de la comuna (`02`) es un parámetro. Para otra comuna se cambia el filtro en `fuentes.py` y se vuelve a correr el pipeline.

---

## 3. Estructura de carpetas

```
observatorio-santa-cruz/
├── README.md                      Cómo instalar y correr todo
├── docs/
│   ├── 01_diseno_tecnico.md       Este documento
│   ├── 02_fuentes_de_datos.md     Catálogo de fuentes verificadas y por verificar
│   └── 03_modelo_de_datos.sql     Esquema PostGIS para cuando el proyecto crezca
├── data-pipeline/
│   ├── requirements.txt
│   ├── fuentes.py                 Catálogo de capas (URL, filtro, campos, licencia, tipo)
│   ├── descargar.py               Descarga a data/raw/ y registra el estado de cada fuente
│   ├── procesar.py                Recorta, calcula indicadores y escribe para la web
│   ├── red.py                     Red peatonal, tiempos de caminata y escenarios
│   └── documentar_fuentes.py      Trazabilidad: fuentes, metodología y calidad
├── data/
│   └── raw/                       Descargas originales (no se editan a mano)
├── frontend/
│   ├── public/data/               GeoJSON y JSON listos para el mapa
│   └── src/
│       ├── lib/                   Carga de datos, catálogo de capas, formatos
│       ├── components/            Mapa, fichas, tarjetas, estados de carga
│       └── pages/                 Inicio, Mapa, Indicadores, Accesibilidad,
│                                  Prioridades, Participación, Fuentes
└── backend/
    ├── requirements.txt
    ├── app/main.py                API FastAPI
    └── tests/                     Pruebas de la API
```

---

## 4. Diseño inicial de la base de datos

El esquema completo está en `03_modelo_de_datos.sql`. Resumen de las tablas:

| Tabla | Qué guarda | Geometría |
|---|---|---|
| `fuente` | Cada fuente de datos: entidad, URL, licencia, tipo (oficial, tercero, campo, demostrativo), fechas | No |
| `barrio` | Los 11 barrios con su código oficial | Polígono |
| `manzana` | Manzanas del censo con personas, viviendas y grupos de edad | Polígono |
| `equipamiento` | Colegios, salud, deporte, cultura, seguridad, etc., con grupo y fuente | Punto o polígono |
| `espacio_publico` | Existente y proyectado por el POT | Polígono |
| `estacion_transporte` | Metro, Metrocable, Metroplús | Punto |
| `tramo_red` | Tramos de la red peatonal y vial, con pendiente, ancho de andén y estado cuando se conozcan | Línea |
| `zona_pot` | Tratamientos, amenazas, riesgo e instrumentos del POT | Polígono |
| `siniestro_vial` | Siniestros con clase, gravedad y año | Punto |
| `oferta_inmobiliaria` | Ofertas observadas (sin datos personales), con fecha y fuente | Punto |
| `intervencion` | Obras candidatas: tipo, ubicación, origen (POT, comunidad, análisis) | Punto, línea o polígono |
| `puntaje_intervencion` | Puntaje por criterio y versión del modelo, para que sea explicable | No |
| `reporte_ciudadano` | Categoría, descripción, ubicación, fecha y estado | Punto |
| `apoyo_intervencion` | Votos o apoyos, sin guardar identidad visible | No |
| `estado_reporte_historial` | Cambios de estado: recibido, en revisión, validado, atendido | No |

Principios del modelo:

- Toda fila con datos territoriales tiene `fuente_id` y `tipo_dato`, para que nunca se mezcle lo oficial con lo demostrativo.
- Las geometrías se guardan en EPSG:4326 para la web y se calculan áreas y distancias en EPSG:9377.
- Los reportes ciudadanos no guardan nombre, cédula ni teléfono. Si en el futuro se pide registro, se guarda un identificador cifrado aparte.

---

## 5. Fuentes oficiales que se deben comprobar

El detalle está en `02_fuentes_de_datos.md`. Estado al 9 de octubre de 2026:

**Verificadas y descargadas (21):** límite de comuna, barrios, estaciones, líneas del Metro, rutas de bus, malla vial, jerarquía vial del POT, equipamientos, sedes educativas, escenarios del INDER, bibliotecas, espacio público existente y proyectado, tratamientos urbanísticos, instrumentos de planificación, amenaza por movimientos en masa, zonas de riesgo no mitigable, siniestros viales, manzanas con población del Censo 2018, oferta inmobiliaria del OIME e indicadores de la Encuesta de Calidad de Vida.

**Por verificar:**

| Fuente | Para qué | Estado |
|---|---|---|
| Modelo digital de elevación (Alcaldía o terrain tiles abiertos) | Pendiente de cada tramo para el tiempo de caminata | El servicio abierto de terrain tiles respondió; falta procesarlo |
| OpenStreetMap (Overpass) | Senderos, escaleras y caminos peatonales que no están en la malla vial | Conexión rechazada desde el entorno de desarrollo; probar desde otro equipo o con un extracto descargado |
| Sedes de Buen Comienzo y guarderías | Destinos de primera infancia | La capa de equipamientos solo tiene 1 en la comuna; hace falta otra fuente |
| Centros de salud (Metrosalud, IPS privadas) | Destinos de salud completos | Solo hay 3 en la capa de equipamientos |
| Paraderos de bus | Acceso al transporte colectivo | No se encontró capa de paraderos |
| Licencias de construcción (Curadurías / DAP) | Cambios en el territorio y presión inmobiliaria | La capa existe pero la consulta espacial falló; revisar |
| Avalúos catastrales | Valor oficial del suelo | No son públicos por predio; consultar con Catastro |
| Condiciones de uso de los geoportales | Redistribuir los datos | Confirmar con el DAP y el DANE |

---

## 6. Qué se puede hacer desde ya y qué depende de más datos

**Se puede implementar desde el comienzo (con datos verificados):**

- Mapa de la comuna y sus 11 barrios con capas oficiales activables.
- Ficha de cada barrio: población 2018, densidad, equipamientos por grupo, espacio público por habitante, tratamientos del POT, amenaza y riesgo, siniestros viales, estación más cercana en línea recta (marcada como referencia) y oferta inmobiliaria observada.
- Ficha de cada elemento del mapa con sus atributos y su fuente.
- Indicadores de comuna y comparación entre barrios.
- Serie histórica de siniestros viales y de los índices de calidad de vida.
- Catálogo de fuentes con estado, fechas y licencias.
- Lista de espacios públicos proyectados por el POT dentro de la comuna (posibles intervenciones ya identificadas por el plan).

**Depende de datos adicionales:**

| Funcionalidad | Qué falta |
|---|---|
| Accesibilidad universal | Rampas y estado de escaleras, que no están en ninguna capa pública |
| Puntaje de priorización completo | Accesibilidad calculada, lista de obras candidatas y reportes de la comunidad |
| Valorización asociada a obras | Serie de precios en el tiempo (el OIME para la comuna tiene pocos registros y de un solo año) |
| Reportes ciudadanos compartidos | Base de datos en servidor, moderación y política de privacidad |

---

## 7. Plan de desarrollo por pasos

Ordenado por impacto y dificultad. Cada paso deja algo funcionando.

| # | Paso | Fase | Impacto | Dificultad | Resultado |
|---|---|---|---|---|---|
| 1 | Pipeline de descarga con catálogo de fuentes | 1 | Alto | Baja | **Hecho.** 21 fuentes oficiales descargadas |
| 2 | Mapa con capas, búsqueda y fichas de barrio | 2 | Alto | Media | **Hecho** en el prototipo |
| 3 | Tablero de indicadores básicos | 2 | Alto | Baja | **Hecho** en el prototipo |
| 4 | Página de fuentes y calidad de datos | 2 | Medio | Baja | **Hecho** en el prototipo |
| 5 | Red de caminata con la malla vial oficial + elevación | 3 | Muy alto | Media | Tiempo a Metro, colegio, salud y parque por manzana |
| 6 | Levantamiento piloto de andenes y escaleras en 1 o 2 barrios | 3 | Muy alto | Alta (trabajo de campo) | Primer inventario peatonal real |
| 7 | Priorización multicriterio con pesos visibles | 3 | Alto | Media | Ranking explicable de obras candidatas |
| 8 | Reportes ciudadanos con servidor y moderación | 4 | Alto | Media | Participación real y tablero de seguimiento |
| 9 | Migrar a PostgreSQL + PostGIS | 4 | Medio | Media | Varios usuarios y más comunas |
| 10 | Pruebas de cálculo, rendimiento y celular | 5 | Medio | Baja | Validación documentada |
| 11 | Presentación académica | 6 | Alto | Baja | Metodología, resultados y límites |

### Fórmulas previstas para la Fase 3

**Tiempo de caminata** por tramo, con la función de Tobler (velocidad según pendiente):

```
velocidad_km_h = 6 × e^(−3,5 × |pendiente + 0,05|)
tiempo_min     = longitud_m / (velocidad_km_h × 1000 / 60)
```

En plano da cerca de 5 km/h. Subiendo una pendiente del 15 % baja a unos 3 km/h. Con `networkx` se calcula la ruta más corta desde cada manzana hasta el destino más cercano de cada tipo.

**Puntaje de priorización** (todo normalizado de 0 a 1, pesos editables y visibles):

```
puntaje = 0,25·personas_beneficiadas + 0,20·déficit_accesibilidad + 0,15·minutos_ahorrados
        + 0,10·cercanía_servicios + 0,10·pendiente_y_accesibilidad_universal
        + 0,10·riesgo_o_siniestralidad + 0,05·reportes_comunidad + 0,05·compatibilidad_POT
```

Si con el tiempo se reúnen suficientes casos (obras hechas y su efecto), se puede probar un modelo de aprendizaje automático. Mientras tanto, el puntaje multicriterio es más honesto y más fácil de explicar.
