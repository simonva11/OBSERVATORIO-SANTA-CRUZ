"""
Último paso del pipeline: trazabilidad.

  - Completa frontend/public/data/fuentes.json con los metadatos de cada fuente (unidad espacial,
    periodo, sistema de coordenadas, campos usados, transformaciones, limitaciones y clase de dato).
  - Escribe frontend/public/data/metodologia.json: cada indicador con su fórmula, unidad, fuentes,
    año, método y si es dato oficial, cálculo derivado o estimación.
  - Escribe frontend/public/data/calidad.json (fuentes por verificar y notas de calidad).
  - Regenera docs/02_fuentes_de_datos.md con todo lo anterior. No se edita a mano.

Uso:
    python documentar_fuentes.py
"""
import json
from pathlib import Path

from fuentes import FUENTES, FUENTES_EXTRA, METADATOS, METADATOS_DEFECTO

RAIZ = Path(__file__).resolve().parent.parent
WEB = RAIZ / "frontend" / "public" / "data"
RAW = RAIZ / "data" / "raw"
DOC = RAIZ / "docs" / "02_fuentes_de_datos.md"

CRS = "Origen en el servicio (MAGNA-SIRGAS); se consulta en WGS84, EPSG:4326 (outSR=4326). Áreas y distancias en EPSG:9377"

# Clases de dato que pide la trazabilidad
CLASES = {
    "oficial_publicado": "Dato oficial publicado",
    "procesado": "Dato descargado y procesado",
    "derivado": "Cálculo derivado",
    "estimacion": "Estimación",
}

INDICADORES = [
    # id, nombre, término en inglés (EE. UU.), fórmula, unidad, fuentes, año, método, clase, limitaciones
    ("poblacion", "Población residente", "Resident population", "Σ personas de las manzanas del barrio o la comuna",
     "personas", ["manzanas_censo"], "2018", "Suma de manzanas asignadas por su punto interior", "procesado", "Censo 2018; posible subconteo"),
    ("densidad", "Densidad de población", "Population density", "Población ÷ área (ha)", "hab/ha", ["manzanas_censo", "barrios"], "2018",
     "Área en EPSG:9377", "derivado", "La comuna incluye el corredor del río, que baja la densidad"),
    ("espacio_publico_hab", "A. Espacio público por habitante", "Public open space per capita",
     "Área total de espacio público existente (m²) ÷ población residente", "m²/persona", ["espacio_publico", "manzanas_censo"],
     "Espacio: sin fecha de corte; población: 2018",
     "Se suman todas las categorías de la capa de espacio público existente dentro del barrio. El espacio proyectado por el POT NO se suma",
     "derivado", "No es el indicador oficial de espacio público efectivo"),
    ("tiempo_caminata", "Tiempo de caminata al destino más cercano", "Network-based walking time",
     "Σ (largo del tramo ÷ velocidad de Tobler según su pendiente) por la ruta más rápida", "minutos",
     ["vias", "osm_caminos", "puentes", "calzadas", "dem_terrarium"], "Datos vigentes a la descarga",
     "Dijkstra multi-origen en grafo dirigido (red.py); en el navegador, Dijkstra desde el punto elegido", "estimacion",
     "Velocidad teórica; no hay barreras, semáforos ni seguridad; red posiblemente incompleta"),
    ("poblacion_umbral", "Población dentro del umbral de acceso", "Population within access threshold",
     "Personas de manzanas con tiempo ≤ umbral ÷ personas del barrio × 100", "%", ["manzanas_censo", "vias", "osm_caminos"], "2018 (población)",
     "Umbrales de 5, 10 y 15 minutos", "estimacion", "Hereda los supuestos del tiempo de caminata"),
    ("rodeo", "Índice de rodeo a la estación", "Route directness (detour) index",
     "Distancia por la red ÷ distancia en línea recta a la estación más cercana", "veces", ["vias", "osm_caminos", "estaciones"], "Vigente",
     "Mediana de manzanas con línea recta mayor a 50 m", "derivado", "—"),
    ("andenes_angostos", "Andén más angosto que 1,2 m", "Share of narrow sidewalks",
     "Largo de andén con ancho < 1,2 m ÷ largo total de andén × 100", "% del largo", ["andenes"], "Sin fecha de corte",
     "1,2 m como umbral de referencia (confirmar norma técnica aplicable)", "derivado", "Solo tramos con ancho registrado"),
    ("ancho_andenes", "Ancho mediano de andén", "Median sidewalk width", "Mediana del campo ancho de los tramos", "m", ["andenes"], "Sin fecha de corte",
     "Tramos dentro de cada barrio", "derivado", "—"),
    ("atropellos_mil", "Atropellos por cada mil habitantes", "Pedestrian crashes per 1,000 residents",
     "Atropellos 2019–2025 en el barrio ÷ población 2018 × 1.000", "por mil habitantes (7 años)", ["siniestros_viales", "manzanas_censo"], "2019–2025",
     "Punto en polígono", "derivado", "Población de 2018; 2025 posiblemente incompleto"),
    ("amenaza_alta", "Área en amenaza alta por movimientos en masa", "High landslide hazard area share",
     "Área en amenaza alta ÷ área del barrio × 100", "%", ["amenaza_movimiento_masa", "barrios"], "POT 2014 (actualización 2026 en la capa)",
     "Intersección de polígonos en EPSG:9377", "derivado", "—"),
    ("prioridad", "Prioridad de la obra (modelo)", "Model-based works priority",
     "Puesto de la obra en cada indicador frente a las de su mismo tipo. Alta: tercio de arriba en 2 o más de 3 indicadores; media: en 1; baja: en ninguno",
     "Alta, media o baja", ["andenes", "espacio_publico_proyectado", "manzanas_censo"],
     "Varios", "Sin pesos ni puntaje 0–100. Espacio público y andenes no se mezclan porque sus personas cercanas se cuentan distinto (10 minutos caminando contra 100 m en línea recta)", "derivado",
     "Los datos de barrio se repiten en todas las obras del mismo barrio. No incluye costos. No prueba causalidad ni es una decisión oficial"),
    ("imcv", "Índice Multidimensional de Condiciones de Vida", "Multidimensional Living Conditions Index",
     "Publicado por la Alcaldía (Encuesta de Calidad de Vida)", "puntos (0–100)", ["indicadores_ecv"], "2014–2024", "Se toma tal cual",
     "oficial_publicado", "—"),
    ("precio_m2_oferta", "Mediana del precio pedido por m²", "Median asking price per square meter",
     "Mediana de precio ÷ área de anuncios de venta de vivienda", "COP/m²", ["oferta_inmobiliaria"], "2023",
     "Solo con 3 o más anuncios en el barrio", "derivado", "Precios pedidos, no avalúos"),
]

GLOSARIO = [
    ("Espacio público abierto", "Public open space"), ("Equipamientos públicos", "Public facilities"),
    ("Accesibilidad peatonal", "Pedestrian accessibility"), ("Andenes", "Sidewalks"), ("Escaleras peatonales", "Pedestrian stairs"),
    ("Ciclorrutas y vías ciclistas", "Bicycle lanes and bikeways"), ("Accesibilidad al transporte público", "Public transit accessibility"),
    ("Análisis de accesibilidad basado en redes", "Network-based accessibility analysis"), ("Costo por metro cuadrado", "Cost per square meter"),
    ("Costo por habitante beneficiado", "Cost per beneficiary"), ("Espacio público por habitante", "Public open space per capita"),
    ("Priorización de proyectos de infraestructura", "Infrastructure project prioritization"), ("Índice de rodeo", "Route directness index"),
]

POR_VERIFICAR = [
    ("OpenStreetMap vía Overpass API", "https://overpass-api.de/api/interpreter",
     "Atributos completos de los caminos (iluminación, rampas, barandas)",
     "Sin conexión desde el entorno de trabajo ni desde el equipo del proyecto. Se usaron las teselas de OpenFreeMap, que traen menos atributos."),
    ("Diccionario de códigos del inventario de andenes", "Secretaría de Infraestructura Física / Movilidad",
     "Saber qué significan los códigos de estado y material", "No publicado en el servicio. Solicitarlo a la Alcaldía."),
    ("Sedes de Buen Comienzo / hogares infantiles", "Por identificar (Secretaría de Educación, ICBF)", "Destinos de primera infancia",
     "La capa de equipamientos solo registra 1 en la comuna."),
    ("Red de salud (Metrosalud e IPS)", "Por identificar (Secretaría de Salud, REPS)", "Destinos de salud completos",
     "La capa de equipamientos registra pocos en la comuna."),
    ("Precios unitarios de obra", "Por identificar (licitaciones de la Alcaldía, SIF, EDU)", "Costos B, C y D",
     "No se encontró una fuente pública confiable; la plataforma permite registrarlos con su fuente."),
    ("Licencias de construcción", "https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri/VM_Licencias/MapServer",
     "Cambios en el territorio", "La consulta espacial respondió con error."),
    ("Avalúos catastrales por predio", "Subsecretaría de Catastro", "Valor oficial del suelo", "No son públicos por predio."),
]

NOTAS = [
    ("Población", "Censo Nacional de Población y Vivienda 2018 (DANE), el último dato oficial por manzana. Cada manzana se asigna al barrio que contiene su punto interior."),
    ("Equipamientos", "La capa oficial no trae el tipo de muchos equipamientos. El grupo (Educación, Salud, etc.) se asigna con una regla por palabras del nombre (procesar.py). Es una clasificación del equipo."),
    ("Espacio público", "Se suman todas las categorías de espacio público existente. No es el indicador oficial de espacio público efectivo."),
    ("Andenes", "El inventario oficial de andenes trae el ancho de cada tramo (unos 78 km en la comuna). Sus códigos de estado y material no tienen diccionario publicado, por eso no se usan."),
    ("Tiempos de caminata", "Son estimaciones con la velocidad de Tobler sobre la red de calles oficiales, caminos de OpenStreetMap y puentes peatonales. No se modelan semáforos, rejas ni seguridad."),
    ("Pendiente", "Donde hay calzada inventariada se usa la pendiente oficial; en el resto, un modelo de elevación de ~10 m que difiere de la oficial (ver la validación en Accesibilidad)."),
    ("Siniestros viales", "La clasificación cambia entre años y 2025 puede estar incompleto."),
    ("Oferta inmobiliaria (OIME)", "Precios pedidos en internet en 2023, no avalúos. Se excluyen teléfono, inmobiliaria y descripción."),
    ("Costos", "Ningún precio viene precargado. Los costos solo aparecen si alguien registra un precio unitario con su fuente."),
    ("Primera infancia y salud", "La capa de equipamientos registra muy pocos jardines infantiles y centros de salud en la comuna."),
]


def main():
    cat = json.loads((WEB / "fuentes.json").read_text(encoding="utf-8"))
    registro = json.loads((RAW / "_registro.json").read_text(encoding="utf-8")) if (RAW / "_registro.json").exists() else {}
    campos = {f["id"]: f.get("campos", []) for f in FUENTES}

    for f in cat:
        meta = {**METADATOS_DEFECTO, **METADATOS.get(f["id"], {})}
        f.update({
            "unidad_espacial": meta["unidad"], "periodo_referencia": meta["periodo"], "crs": CRS,
            "campos_usados": campos.get(f["id"], ["Todos (indicadores por comuna)"]),
            "transformaciones": meta["transformaciones"], "limitaciones": meta["limitaciones"],
            "clase": CLASES["procesado"] if f["tipo"] == "oficial" else CLASES["procesado"] + " (tercero)",
        })
    ids = {f["id"] for f in cat}
    for x in FUENTES_EXTRA:
        r = registro.get(x["id"], {})
        if x["id"] in ids:
            continue
        cat.append({
            "id": x["id"], "nombre": x["nombre"], "entidad": x["entidad"], "tipo": x["tipo"], "url_servicio": x["url_servicio"],
            "consulta": r.get("consulta"), "formato_origen": x["formato_origen"], "cobertura": x["cobertura"], "licencia": x["licencia"],
            "estado": r.get("estado", "ok" if x["id"] == "dem_terrarium" else "sin descargar"), "registros": r.get("registros", 0),
            "fecha_descarga": r.get("fecha_descarga"), "ultima_actualizacion_en_datos": None, "error": r.get("error"),
            "unidad_espacial": x["unidad"], "periodo_referencia": x["periodo"], "crs": "EPSG:4326 (Web Mercator en las teselas)",
            "campos_usados": ["class, subclass, surface, brunnel"] if x["id"] == "osm_caminos" else ["Altura codificada en RGB"],
            "transformaciones": x["transformaciones"], "limitaciones": x["limitaciones"], "clase": CLASES["procesado"] + " (tercero)",
        })
    (WEB / "fuentes.json").write_text(json.dumps(cat, ensure_ascii=False, indent=1), encoding="utf-8")

    metodologia = {
        "clases": CLASES,
        "indicadores": [
            {"id": i, "nombre": n, "nombre_en": en, "formula": fo, "unidad": u, "fuentes": fu, "anio": a, "metodo": m,
             "clase": CLASES[c], "limitaciones": li}
            for i, n, en, fo, u, fu, a, m, c, li in INDICADORES
        ],
        "glosario": [{"es": es, "en": en} for es, en in GLOSARIO],
    }
    (WEB / "metodologia.json").write_text(json.dumps(metodologia, ensure_ascii=False, indent=1), encoding="utf-8")
    calidad = {
        "por_verificar": [{"fuente": n, "donde": u, "para": p, "estado": e} for n, u, p, e in POR_VERIFICAR],
        "notas": [{"tema": t, "nota": n} for t, n in NOTAS],
    }
    (WEB / "calidad.json").write_text(json.dumps(calidad, ensure_ascii=False, indent=1), encoding="utf-8")

    l = ["# Fuentes, indicadores y trazabilidad\n",
         "Este archivo se genera con `data-pipeline/documentar_fuentes.py` a partir de lo que realmente se descargó y calculó. No se edita a mano.\n",
         "Clases de dato: **dato oficial publicado** (se usa tal cual), **dato descargado y procesado** (recortado o transformado), "
         "**cálculo derivado** (fórmula sobre datos) y **estimación** (depende de supuestos, como velocidades de caminata o precios).\n",
         "## Fuentes\n",
         "| Fuente | Entidad | Tipo | Registros | Unidad espacial | Periodo de referencia | Descargada | Estado |",
         "|---|---|---|---|---|---|---|---|"]
    for f in cat:
        l.append(f"| [{f['nombre']}]({f['url_servicio']}) | {f['entidad']} | {f['tipo']} | {f['registros']} | {f['unidad_espacial']} | "
                 f"{f['periodo_referencia']} | {(f['fecha_descarga'] or '')[:10]} | {f['estado']} |")
    l.append("\n### Detalle por fuente\n")
    for f in cat:
        l.append(f"**{f['nombre']}** (`{f['id']}`)  ")
        l.append(f"Cobertura: {f['cobertura']}. Sistema de coordenadas: {f['crs']}.  ")
        l.append(f"Campos usados: {', '.join(f['campos_usados'])}.  ")
        l.append(f"Transformaciones: {f['transformaciones']}.  ")
        l.append(f"Limitaciones: {f['limitaciones']}. Licencia: {f['licencia']}.  ")
        if f.get("consulta"):
            l.append(f"Consulta exacta: `{f['consulta']}`")
        l.append("")
    l.append("## Indicadores\n")
    l.append("| Indicador | Término (EE. UU.) | Fórmula | Unidad | Año | Clase | Limitaciones |")
    l.append("|---|---|---|---|---|---|---|")
    for x in metodologia["indicadores"]:
        l.append(f"| {x['nombre']} | {x['nombre_en']} | {x['formula']} | {x['unidad']} | {x['anio']} | {x['clase']} | {x['limitaciones']} |")
    l.append("\n## Glosario\n")
    for g in metodologia["glosario"]:
        l.append(f"- {g['es']}: *{g['en']}*")
    l.append("\n## Fuentes por verificar\n")
    l.append("| Fuente | Dónde | Para qué | Estado |")
    l.append("|---|---|---|---|")
    for n, u, p, e in POR_VERIFICAR:
        l.append(f"| {n} | {u} | {p} | {e} |")
    l.append("\n## Notas de calidad\n")
    for t, n in NOTAS:
        l.append(f"- **{t}:** {n}")
    l.append("\n**Condiciones de uso:** los geoportales de la Alcaldía de Medellín y del DANE son públicos, pero antes de publicar la plataforma en internet hay que confirmar con cada entidad las condiciones para redistribuir sus datos.")
    DOC.write_text("\n".join(l) + "\n", encoding="utf-8")
    print("Escrito", DOC, "y metodologia.json con", len(INDICADORES), "indicadores")


if __name__ == "__main__":
    main()
