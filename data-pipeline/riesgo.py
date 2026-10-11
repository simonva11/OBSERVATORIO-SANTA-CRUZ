"""
Riesgo por movimientos en masa: cuánta gente y cuántas viviendas de cada barrio quedan en zonas de amenaza.

Cruza las manzanas del Censo 2018 (personas y viviendas por manzana) con los polígonos oficiales del POT:
  - Amenaza por movimientos en masa (grados Alta, Media y Baja).
  - Zonas con condición de riesgo alto no mitigable.

Método:
  1. Todo se pasa a metros (EPSG:9377) para medir áreas.
  2. Para cada manzana se calcula qué fracción de su área cae dentro de cada zona (Alta, Media, no mitigable).
  3. Las personas y viviendas de la manzana se reparten según esa fracción. Es un supuesto: se asume que
     viven repartidas de forma pareja dentro de la manzana, porque el Censo no dice dónde está cada vivienda.
     Por eso los resultados son estimaciones y se redondean.
  4. Se suma por barrio (el barrio es el que trae la manzana en el Censo).

No es una predicción: solo cruza datos oficiales. Si una manzana queda partida entre dos zonas, cuenta en ambas
según su fracción.

Salida: frontend/public/data/riesgo.json
Uso:    python riesgo.py   (necesita shapely y pyproj, ver requirements.txt)
Antes necesita haber corrido procesar.py, que genera manzanas.geojson y las capas del POT.
"""
import json
from collections import defaultdict
from datetime import date
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform, unary_union

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "frontend" / "public" / "data"
A_METROS = Transformer.from_crs(4326, 9377, always_xy=True).transform


def leer(nombre: str) -> list[dict]:
    return json.loads((DATOS / f"{nombre}.geojson").read_text(encoding="utf-8"))["features"]


def a_metros(geom):
    g = transform(A_METROS, shape(geom))
    return g if g.is_valid else g.buffer(0)


def union_de(features: list[dict], filtro=lambda p: True):
    gs = [a_metros(f["geometry"]) for f in features if f.get("geometry") and filtro(f["properties"])]
    return unary_union(gs) if gs else None


def fraccion(manzana, zona) -> float:
    """Parte del área de la manzana que cae dentro de la zona (0 a 1)."""
    if zona is None or manzana.area <= 0:
        return 0.0
    return max(0.0, min(1.0, manzana.intersection(zona).area / manzana.area))


def main() -> None:
    amenaza = leer("amenaza_movimiento_masa")
    zonas = {
        "alta": union_de(amenaza, lambda p: p.get("grado") == "Alta"),
        "media": union_de(amenaza, lambda p: p.get("grado") == "Media"),
        "rnm": union_de(leer("riesgo_no_mitigable")),
    }

    barrios: dict[str, dict] = defaultdict(lambda: defaultdict(float))
    for f in leer("manzanas"):
        p = f["properties"]
        nombre = p.get("barrio") or "Sin barrio"
        personas, viviendas = float(p.get("personas") or 0), float(p.get("viviendas") or 0)
        m = a_metros(f["geometry"])
        b = barrios[nombre]
        b["personas"] += personas
        b["viviendas"] += viviendas
        b["manzanas"] += 1
        for clave, zona in zonas.items():
            fr = fraccion(m, zona)
            b[f"personas_{clave}"] += personas * fr
            b[f"viviendas_{clave}"] += viviendas * fr
            if fr > 0:
                b[f"manzanas_{clave}"] += 1
            if fr >= 0.5:
                b[f"manzanas_mayormente_{clave}"] += 1

    def fila(nombre: str, b: dict) -> dict:
        r = {"nombre": nombre, "personas": int(b["personas"]), "viviendas": int(b["viviendas"]), "manzanas": int(b["manzanas"])}
        for clave in zonas:
            r[f"personas_{clave}"] = round(b[f"personas_{clave}"])
            r[f"viviendas_{clave}"] = round(b[f"viviendas_{clave}"])
            r[f"manzanas_{clave}"] = int(b[f"manzanas_{clave}"])
            r[f"manzanas_mayormente_{clave}"] = int(b[f"manzanas_mayormente_{clave}"])
            r[f"pct_personas_{clave}"] = round(100 * b[f"personas_{clave}"] / b["personas"], 1) if b["personas"] else 0.0
        return r

    lista = sorted((fila(n, b) for n, b in barrios.items()), key=lambda r: -r["personas_alta"])
    total: dict[str, float] = defaultdict(float)
    for b in barrios.values():
        for k, v in b.items():
            total[k] += v

    salida = {
        "generado": date.today().isoformat(),
        "metodo": (
            "Se cruzaron las manzanas del Censo 2018 con los polígonos oficiales del POT. Las personas y viviendas de cada "
            "manzana se reparten según la parte de su área que cae en cada zona, suponiendo que viven repartidas de forma pareja. "
            "Son estimaciones, no conteos exactos, y no son una predicción."
        ),
        "fuentes": ["manzanas", "amenaza_movimiento_masa", "riesgo_no_mitigable"],
        "comuna": fila("Comuna 2 Santa Cruz", total),
        "barrios": lista,
    }
    (DATOS / "riesgo.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    c = salida["comuna"]
    print(f"riesgo.json: {len(lista)} barrios | amenaza alta: {c['personas_alta']:,} personas ({c['pct_personas_alta']} %), "
          f"{c['viviendas_alta']:,} viviendas | riesgo no mitigable: {c['personas_rnm']:,} personas")


if __name__ == "__main__":
    main()
