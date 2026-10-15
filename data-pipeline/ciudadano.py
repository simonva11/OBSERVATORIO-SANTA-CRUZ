"""
Cifras por barrio para la vista ciudadana de OTEA ("Así vivimos Santa Cruz").

Uso (desde data-pipeline, no necesita internet ni librerías externas):
    python ciudadano.py

No descarga nada: junta en un solo archivo pequeño (ciudadano.json) lo que otros scripts ya dejaron en
frontend/public/data, para que la portada cargue rápido en un celular y para que cada número se pueda repetir:
  - manzanas.geojson          personas de 60 años o más y minutos caminando a Metro/Metrocable/Metroplús (Censo 2018 + red de OTEA)
  - indicadores.json          población por barrio, espacio público por habitante y andenes angostos
  - residuos/residuos.json    toneladas al mes por barrio (entregadas por Emvarias y EPM; solo toneladas)
  - reclamos.json             reportes de huecos del Sistema de Gestión Vial
  - solicitudes_quebradas     solicitudes sobre quebradas (cuántas son por basuras o escombros)

Escribe frontend/public/data/ciudadano.json. No contiene nada por debajo de la escala de barrio.
"""
import json
import sys
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "frontend" / "public" / "data"

UMBRAL_METRO_MIN = (10, 15)  # minutos caminando a una estación


def clave(nombre):
    """Nombre de barrio sin tildes, espacios ni puntos: 'Moscú No. 1' y 'Moscú No.1' son el mismo."""
    t = unicodedata.normalize("NFD", nombre or "")
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return "".join(c for c in t.lower() if c.isalnum())


def leer(ruta):
    return json.loads((DATOS / ruta).read_text(encoding="utf-8"))


def construir():
    ind = leer("indicadores.json")
    manzanas = [f["properties"] for f in leer("manzanas.geojson")["features"]]
    residuos = leer("residuos/residuos.json")
    reclamos = leer("reclamos.json")["huecos"]
    quebradas = [f["properties"] for f in leer("solicitudes_quebradas.geojson")["features"]]

    barrios = {}
    for b in ind["barrios"]:
        barrios[clave(b["nombre"])] = {
            "codigo": b["codigo"],
            "nombre": b["nombre"],
            "personas": b["poblacion_2018"],
            "mayores_60": b["mayores_60_2018"],
            "menores_10": b["menores_10_2018"],
            "espacio_m2_hab": b["espacio_publico_m2_hab"],
        }

    # Personas mayores y tiempo caminando al transporte masivo (por manzana del Censo 2018)
    for k, b in barrios.items():
        b.update({"mayores_lejos_10": 0, "mayores_lejos_15": 0, "_suma_min": 0.0, "_mayores_manzanas": 0})
    for m in manzanas:
        b = barrios.get(clave(m.get("barrio")))
        t, may = m.get("t_transporte_masivo"), m.get("mayores_60") or 0
        if b is None or t is None:
            continue
        b["_mayores_manzanas"] += may
        b["_suma_min"] += may * t
        if t > UMBRAL_METRO_MIN[0]:
            b["mayores_lejos_10"] += may
        if t > UMBRAL_METRO_MIN[1]:
            b["mayores_lejos_15"] += may
    for b in barrios.values():
        n = b.pop("_mayores_manzanas")
        b["min_metro_mayores"] = round(b.pop("_suma_min") / n, 1) if n else None

    # Residuos: solo toneladas por mes por barrio
    for r in residuos["barrios"]:
        b = barrios.get(clave(r["nombre"]))
        if b is not None:
            b["residuos_t_mes"] = round(r["t_mes"], 1)
            b["residuos_kg_persona_dia"] = round(r["t_mes"] * 1000 / b["personas"] / 30.4375, 2) if b["personas"] else None

    # Huecos reportados
    for r in reclamos["por_barrio"]:
        b = barrios.get(clave(r["barrio"]))
        if b is not None:
            b["huecos_total"] = r["total"]
            b["huecos_arreglados"] = r["arreglados"]
            b["huecos_pendientes"] = r["pendientes"]

    # Andenes angostos (inventario de andenes de la Secretaría de Movilidad)
    for a in ind["infraestructura"]["andenes"]["barrios"]:
        b = barrios.get(clave(a["barrio"]))
        if b is not None:
            b["andenes_angostos_pct"] = a["andenes_angostos_pct"]

    # Basuras o escombros en quebradas (solicitudes ciudadanas, SIRO)
    for b in barrios.values():
        b["basuras_quebradas"] = 0
    for q in quebradas:
        b = barrios.get(clave(q.get("barrio")))
        if b is not None and q.get("basura"):
            b["basuras_quebradas"] += 1

    lista = sorted(barrios.values(), key=lambda b: b["codigo"])
    personas = sum(b["personas"] for b in lista)
    mayores = sum(b["mayores_60"] for b in lista)
    dias_huecos = (date.fromisoformat(reclamos["hasta"]) - date.fromisoformat(reclamos["desde"])).days + 1
    desde_q = min(q["fecha"] for q in quebradas if q.get("fecha"))

    comuna = {
        "personas": personas,
        "mayores_60": mayores,
        "menores_10": sum(b["menores_10"] for b in lista),
        "mayores_lejos_10": sum(b["mayores_lejos_10"] for b in lista),
        "mayores_lejos_15": sum(b["mayores_lejos_15"] for b in lista),
        "metro_10min_pct_todos": ind["accesibilidad"]["comuna"]["transporte_masivo_10min_pct"],
        "metro_promedio_min_todos": ind["accesibilidad"]["comuna"]["transporte_masivo_promedio_min"],
        "espacio_m2_hab": ind["comuna"]["espacio_publico_m2_hab"],
        "residuos_t_mes": round(residuos["t_mes_comuna"], 1),
        "residuos_t_dia": round(residuos["t_mes_comuna"] / 30.4375, 1),
        "residuos_kg_persona_dia": round(residuos["t_mes_comuna"] * 1000 / personas / 30.4375, 2),
        "residuos_periodo": residuos["periodo"],
        "huecos": {
            "total": reclamos["reportes_total"],
            "arreglados": reclamos["arreglados"],
            "pendientes": reclamos["pendientes"],
            "descartados": reclamos["descartados"],
            "duplicados": reclamos["duplicados"],
            "dias_mediana": reclamos["dias_mediana"],
            "dias_p90": reclamos["dias_p90"],
            "desde": reclamos["desde"],
            "hasta": reclamos["hasta"],
            "por_dia": round(reclamos["reportes_total"] / dias_huecos, 2),
        },
        "andenes": {
            "km": ind["infraestructura"]["andenes"]["km"],
            "angostos_pct": ind["infraestructura"]["andenes"]["angostos_pct"],
            "umbral_m": ind["infraestructura"]["andenes"]["umbral_angosto_m"],
        },
        "quebradas": {"total": len(quebradas), "basuras": sum(1 for q in quebradas if q.get("basura")), "desde": desde_q},
    }
    return {
        "generado": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "nota": "Cifras por barrio calculadas por OTEA a partir de otros archivos del proyecto. Ninguna baja de la escala de barrio.",
        "comuna": comuna,
        "barrios": lista,
    }


def probar(d):
    """Comprobaciones internas: los totales por barrio deben cuadrar con los de la comuna."""
    c, bs = d["comuna"], d["barrios"]
    assert len(bs) == 11, "deben ser 11 barrios"
    assert sum(b["mayores_60"] for b in bs) == c["mayores_60"]
    assert abs(sum(b["residuos_t_mes"] for b in bs) - c["residuos_t_mes"]) < 0.6, "las toneladas por barrio deben sumar la comuna"
    assert sum(b["huecos_total"] for b in bs) <= c["huecos"]["total"]
    assert c["huecos"]["arreglados"] + c["huecos"]["pendientes"] + c["huecos"]["descartados"] + c["huecos"]["duplicados"] == c["huecos"]["total"]
    assert all(0 <= b["mayores_lejos_15"] <= b["mayores_lejos_10"] <= b["mayores_60"] for b in bs)
    assert sum(b["basuras_quebradas"] for b in bs) <= c["quebradas"]["basuras"]
    print("Comprobaciones internas: bien")


if __name__ == "__main__":
    datos = construir()
    probar(datos)
    if "--prueba" not in sys.argv:
        (DATOS / "ciudadano.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
        print("Escrito ciudadano.json con", len(datos["barrios"]), "barrios")
