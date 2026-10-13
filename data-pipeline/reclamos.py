"""
Reclamos de la ciudadanía en la Comuna 2: huecos, solicitudes de obra y basuras en quebradas.

Uso (desde data-pipeline, necesita internet):
    python reclamos.py            # descarga y escribe los archivos
    python reclamos.py --prueba   # solo corre las comprobaciones internas, sin internet

Fuentes (servicios públicos de GeoMedellín, Alcaldía de Medellín):
  - VA_SGV_Baches        Sistema de Gestión Vial: reportes de huecos (ReportesMED y otros canales)
  - VA_Solicitudes_pqrs  SIRO, Secretaría de Infraestructura Física: solicitudes de obra (capa 2) y de quebradas (capa 3)

Escribe en frontend/public/data: huecos.geojson, solicitudes_obras.geojson, solicitudes_quebradas.geojson,
reclamos.json (resumen para las páginas) y agrega las tres fuentes a fuentes.json.

PRIVACIDAD: estos servicios traen nombre, teléfono y correo de quien reportó, y el nombre de funcionarios.
Aquí NUNCA se piden esos campos: solo se listan abajo los que sí se descargan. Tampoco se guarda el texto libre
de las solicitudes (puede incluir datos personales) ni la dirección.
"""
import json
import statistics
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "frontend" / "public" / "data"
BASE = "https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri"
UA = "Mozilla/5.0 (ObservatorioSantaCruz; prototipo academico Territorio INN 2026)"
PREFIJO_FOTO = "https://www.medellin.gov.co/api-imagenes/"  # solo se aceptan fotos de este sitio

# Campos que SÍ se descargan (nada de nombre, telefono, email, observacion, direccion, servidor, asunto)
CAMPOS_BACHES = "id_bache,estado,prioridad,fecha_reporte,fecha_ejecucion,barrio,origen,valor_total,url_1,url_2,url_3"
CAMPOS_OBRAS = "id_solicitud,tipo_solicitud,nombre_dominio,estado,origen,fecha_solicitud,fecha,nombre_barrio"
CAMPOS_QUEBRADAS = "objectid,quebrada,problema__peticion,estado,fecha_solicitud,fecha,nombre_barrio"

CAPAS_BACHES = {0: "Aceptado", 1: "Descartado", 2: "Duplicado", 3: "Ejecutado", 4: "Ejecutado externo", 5: "Reportado"}
# Estado simple para el mapa. Descartados y duplicados no se dibujan (son ruido), pero sí se cuentan.
ESTADO_SIMPLE = {"Ejecutado": "Arreglado", "Ejecutado externo": "Arreglado", "Reportado": "Pendiente", "Aceptado": "Pendiente"}
DONDE = "comuna like '%Santa Cruz%'"


def get(url, params, intentos=3):
    full = url + "?" + urllib.parse.urlencode(params)
    for i in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(full, headers={"User-Agent": UA}), timeout=120) as r:
                d = json.load(r)
            if isinstance(d, dict) and d.get("error"):
                raise RuntimeError(d["error"])
            return d
        except Exception:
            if i == intentos - 1:
                raise
            time.sleep(2 * (i + 1))


def traer(servicio, capa, donde, campos):
    """Todos los registros de una capa (el servicio entrega máximo 1.000 por vez)."""
    url = f"{BASE}/{servicio}/MapServer/{capa}/query"
    n = get(url, {"where": donde, "returnCountOnly": "true", "f": "json"})["count"]
    filas, desde = [], 0
    while desde < n:
        d = get(url, {"where": donde, "outFields": campos, "returnGeometry": "true", "outSR": "4326", "resultOffset": desde, "resultRecordCount": 1000, "f": "json"})
        if not d["features"]:
            break
        filas += d["features"]
        desde += len(d["features"])
    return filas


def fecha_iso(v):
    """Las fechas llegan como 'dd/mm/aaaa', 'aaaa-mm-dd' o milisegundos. Devuelve 'aaaa-mm-dd' o None."""
    if v in (None, ""):
        return None
    if isinstance(v, (int, float)):
        return datetime.fromtimestamp(v / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
    s = str(v).strip()[:10]
    for f in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            d = datetime.strptime(s, f)
            return d.strftime("%Y-%m-%d") if 2000 <= d.year <= date.today().year + 1 else None
        except ValueError:
            pass
    return None


def dias_entre(a, b):
    try:
        d = (date.fromisoformat(b) - date.fromisoformat(a)).days
        return d if 0 <= d <= 3650 else None
    except (TypeError, ValueError):
        return None


def foto_ok(u):
    return u if isinstance(u, str) and u.startswith(PREFIJO_FOTO) else None


def punto(f):
    g = f.get("geometry") or {}
    if "x" not in g or "y" not in g:
        return None
    return {"type": "Point", "coordinates": [round(g["x"], 6), round(g["y"], 6)]}


def mediana(xs):
    return round(statistics.median(xs)) if xs else None


def p90(xs):
    s = sorted(xs)
    return s[int(len(s) * 0.9)] if s else None


def feature(geo, props):
    return {"type": "Feature", "geometry": geo, "properties": {k: v for k, v in props.items() if v is not None}}


def colecciones(coleccion):
    return {"type": "FeatureCollection", "features": coleccion}


# ---------------------------------------------------------------- huecos
def huecos(filas_por_capa, hoy):
    """filas_por_capa: {nombre_de_capa: [features ArcGIS]}. Devuelve (features para el mapa, resumen)."""
    mapa, conteo = [], Counter()
    por_barrio = {}
    for capa, filas in filas_por_capa.items():
        conteo[capa] += len(filas)
        simple = ESTADO_SIMPLE.get(capa)
        for f in filas:
            a, geo = f["attributes"], punto(f)
            rep, eje = fecha_iso(a.get("fecha_reporte")), fecha_iso(a.get("fecha_ejecucion"))
            b = por_barrio.setdefault(a.get("barrio") or "Sin barrio", {"total": 0, "arreglados": 0, "pendientes": 0, "dias": []})
            b["total"] += 1
            if simple is None or geo is None:
                continue
            dias = dias_entre(rep, eje) if simple == "Arreglado" else None
            espera = dias_entre(rep, hoy.isoformat()) if simple == "Pendiente" else None
            b["arreglados" if simple == "Arreglado" else "pendientes"] += 1
            if dias is not None:
                b["dias"].append(dias)
            costo = a.get("valor_total")
            try:
                costo = round(float(costo)) if costo and float(costo) > 0 and simple == "Arreglado" else None
            except (TypeError, ValueError):
                costo = None
            mapa.append(feature(geo, {
                "id": a.get("id_bache"), "estado": simple, "estado_original": capa, "barrio": a.get("barrio"),
                "prioridad": a.get("prioridad") if a.get("prioridad") != "No registra" else None,
                "origen": a.get("origen"), "anio": int(rep[:4]) if rep else None, "reportado": rep,
                "arreglado": eje if simple == "Arreglado" else None, "dias": dias, "espera": espera, "costo_cop": costo,
                "foto": foto_ok(a.get("url_1")), "foto2": foto_ok(a.get("url_2")), "foto3": foto_ok(a.get("url_3")),
            }))
    ar = [m["properties"]["dias"] for m in mapa if m["properties"].get("dias") is not None]
    anios = Counter(m["properties"]["anio"] for m in mapa if m["properties"].get("anio"))
    fechas = sorted(m["properties"]["reportado"] for m in mapa if m["properties"].get("reportado"))
    resumen = {
        "reportes_total": sum(conteo.values()),
        "arreglados": conteo["Ejecutado"] + conteo["Ejecutado externo"],
        "pendientes": conteo["Reportado"] + conteo["Aceptado"],
        "descartados": conteo["Descartado"],
        "duplicados": conteo["Duplicado"],
        "con_foto": sum(1 for m in mapa if m["properties"].get("foto")),
        "dias_mediana": mediana(ar), "dias_p90": p90(ar), "dias_n": len(ar),
        "desde": fechas[0] if fechas else None, "hasta": fechas[-1] if fechas else None,
        "por_anio": {str(k): v for k, v in sorted(anios.items())},
        "por_barrio": sorted(
            [{"barrio": k, "total": v["total"], "arreglados": v["arreglados"], "pendientes": v["pendientes"], "dias_mediana": mediana(v["dias"])} for k, v in por_barrio.items()],
            key=lambda x: -x["total"]),
    }
    return mapa, resumen


# ---------------------------------------------------------------- solicitudes de obra y quebradas
def obras(filas):
    mapa, tipos, dominios, estados, barrios = [], Counter(), Counter(), Counter(), Counter()
    for f in filas:
        a, geo = f["attributes"], punto(f)
        if geo is None:
            continue
        fe = fecha_iso(a.get("fecha_solicitud")) or fecha_iso(a.get("fecha"))
        tipos[a.get("tipo_solicitud") or "Sin tipo"] += 1
        dominios[a.get("nombre_dominio") or "Sin dominio"] += 1
        estados[a.get("estado") or "Sin estado"] += 1
        barrios[a.get("nombre_barrio") or "Sin barrio"] += 1
        mapa.append(feature(geo, {"tipo": a.get("tipo_solicitud"), "dominio": a.get("nombre_dominio"), "estado": a.get("estado"),
                                  "origen": a.get("origen") or None, "barrio": a.get("nombre_barrio"), "fecha": fe, "anio": int(fe[:4]) if fe else None}))
    return mapa, {"total": len(mapa), "por_dominio": dict(dominios.most_common()), "por_tipo": dict(tipos.most_common(12)),
                  "por_estado": dict(estados.most_common()), "por_barrio": dict(barrios.most_common())}


def quebradas(filas):
    mapa, problemas, quebs, barrios = [], Counter(), Counter(), Counter()
    for f in filas:
        a, geo = f["attributes"], punto(f)
        if geo is None:
            continue
        fe = fecha_iso(a.get("fecha_solicitud")) or fecha_iso(a.get("fecha"))
        p = (a.get("problema__peticion") or "Sin dato").strip()
        basura = "basura" in p.lower() or "escombro" in p.lower()
        problemas[p] += 1
        quebs[a.get("quebrada") or "Sin quebrada"] += 1
        barrios[a.get("nombre_barrio") or "Sin barrio"] += 1
        mapa.append(feature(geo, {"quebrada": a.get("quebrada"), "problema": p, "basura": basura, "estado": a.get("estado"),
                                  "barrio": a.get("nombre_barrio"), "fecha": fe, "anio": int(fe[:4]) if fe else None}))
    n_basura = sum(1 for m in mapa if m["properties"]["basura"])
    por_q = {}
    for m in mapa:
        q = m["properties"].get("quebrada") or "Sin quebrada"
        d = por_q.setdefault(q, {"total": 0, "basuras": 0})
        d["total"] += 1
        d["basuras"] += 1 if m["properties"]["basura"] else 0
    return mapa, {"total": len(mapa), "basuras": n_basura, "por_problema": dict(problemas.most_common()),
                  "por_quebrada": [{"quebrada": k, **v} for k, v in sorted(por_q.items(), key=lambda kv: -kv[1]["total"])],
                  "por_barrio": dict(barrios.most_common())}


# ---------------------------------------------------------------- fuentes.json
def fuente(id_, nombre, servicio, capas, donde, registros, hasta):
    return {
        "id": id_, "nombre": nombre,
        "entidad": "Alcaldía de Medellín (GeoMedellín): " + ("Sistema de Gestión Vial" if "SGV" in servicio else "Secretaría de Infraestructura Física, sistema SIRO"),
        "tipo": "oficial", "url_servicio": f"{BASE}/{servicio}/MapServer", "consulta": f"{BASE}/{servicio}/MapServer/{capas}/query?where={urllib.parse.quote(donde)}&f=json",
        "formato_origen": "ArcGIS REST (JSON)", "cobertura": f"Filtro: {donde}",
        "licencia": "Publicada en GeoMedellín. Condiciones de uso por confirmar con MEData (medata@medellin.gov.co) antes de redistribuir. No se descargan nombres, teléfonos ni correos.",
        "estado": "ok", "registros": registros, "fecha_descarga": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "ultima_actualizacion_en_datos": hasta, "error": None,
    }


def escribir(nombre, datos):
    (SALIDA / nombre).write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def principal():
    hoy = date.today()
    por_capa = {}
    for capa, nombre in CAPAS_BACHES.items():
        por_capa[nombre] = traer("VA_SGV_Baches", capa, DONDE, CAMPOS_BACHES)
        print(f"huecos {nombre}: {len(por_capa[nombre])}")
    f_h, r_h = huecos(por_capa, hoy)
    f_o, r_o = obras(traer("VA_Solicitudes_pqrs", 2, "nombre_comuna like '%Santa Cruz%'", CAMPOS_OBRAS))
    f_q, r_q = quebradas(traer("VA_Solicitudes_pqrs", 3, "nombre_comuna like '%Santa Cruz%'", CAMPOS_QUEBRADAS))
    print(f"obras: {r_o['total']}  quebradas: {r_q['total']} (basuras {r_q['basuras']})")

    escribir("huecos.geojson", colecciones(f_h))
    escribir("solicitudes_obras.geojson", colecciones(f_o))
    escribir("solicitudes_quebradas.geojson", colecciones(f_q))
    escribir("reclamos.json", {"generado": hoy.isoformat(), "huecos": r_h, "obras": r_o, "quebradas": r_q})

    ruta = SALIDA / "fuentes.json"
    cat = json.loads(ruta.read_text(encoding="utf-8"))
    nuevas = [
        fuente("huecos", "Reportes de huecos (Sistema de Gestión Vial)", "VA_SGV_Baches", "0 a 5", DONDE, len(f_h), r_h["hasta"]),
        fuente("solicitudes_obras", "Solicitudes de obra a Infraestructura Física (SIRO)", "VA_Solicitudes_pqrs", 2, "nombre_comuna like '%Santa Cruz%'", len(f_o), None),
        fuente("solicitudes_quebradas", "Solicitudes sobre quebradas (SIRO)", "VA_Solicitudes_pqrs", 3, "nombre_comuna like '%Santa Cruz%'", len(f_q), None),
    ]
    ids = {n["id"] for n in nuevas}
    ruta.write_text(json.dumps([x for x in cat if x["id"] not in ids] + nuevas, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Listo.")


def prueba():
    assert fecha_iso("16/07/2020") == "2020-07-16" and fecha_iso("2023-01-12") == "2023-01-12" and fecha_iso("0005-12-23") is None and fecha_iso(None) is None
    assert dias_entre("2024-01-01", "2024-01-13") == 12 and dias_entre("2024-02-01", "2024-01-01") is None
    assert foto_ok(PREFIJO_FOTO + "a.jpg") and not foto_ok("https://otro.sitio/a.jpg")
    fila = lambda **k: {"attributes": {"id_bache": 1, "barrio": "La Isla", "fecha_reporte": "01/01/2024", "fecha_ejecucion": "13/01/2024", "valor_total": "1000", **k},
                        "geometry": {"x": -75.55, "y": 6.3}}
    # un campo personal que llegara por error no debe salir
    f = fila(nombre="PERSONA", telefono="300", email="a@b.c")
    mapa, res = huecos({"Ejecutado": [f], "Reportado": [fila(fecha_ejecucion=None)], "Duplicado": [fila()]}, date(2024, 2, 1))
    assert res["arreglados"] == 1 and res["pendientes"] == 1 and res["duplicados"] == 1 and len(mapa) == 2 and res["dias_mediana"] == 12
    assert "PERSONA" not in json.dumps(mapa) and "telefono" not in json.dumps(mapa) and mapa[1]["properties"]["espera"] == 31
    _, rq = quebradas([{"attributes": {"quebrada": "Q. X", "problema__peticion": "Presencia de basuras o escombros", "fecha_solicitud": "2023-05-01"}, "geometry": {"x": -75.5, "y": 6.3}}])
    assert rq["basuras"] == 1
    print("Comprobaciones internas: bien.")


if __name__ == "__main__":
    prueba() if "--prueba" in sys.argv else (prueba(), principal())
