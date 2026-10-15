"""
Aseo y residuos sólidos de la Comuna 2: rutas de recolección de Emvarias, pesajes en báscula e instalaciones de EPM.

Uso (desde data-pipeline, necesita geopandas y pyogrio):
    python residuos.py "C:/ruta/Proyecto_grado.gdb"
    python residuos.py --prueba        # solo comprobaciones internas, sin la geodatabase

Lee de la geodatabase Proyecto_grado.gdb estas capas:
  - z1                 polígonos de macrorutas de la Zona 1 (días, horario, datos de planeación de Emvarias)
  - Zonas_Merge        líneas de ruteo (RECOLECCION / NORECOLECCION)
  - Instalaciones      puntos de EPM con su ruta asignada (1,18 millones en toda la ciudad)
  - Tickets_Ruta       pesajes en báscula (peso neto en kg, fecha y hora del pesaje)

Escribe en frontend/public/data/residuos SOLO residuos.json: toneladas al mes por barrio (nada de rutas, polígonos,
calles ni horarios, que no se pueden publicar), y agrega la fuente a fuentes.json.

PRIVACIDAD: de las instalaciones solo se usan estrato, estado, ruta, barrio EPM y coordenadas, y se publican
únicamente conteos por celda de 100 m y por barrio. NO se leen ni se guardan la nomenclatura (dirección), la
matrícula inmobiliaria ni el código catastral. De los pesajes se descartan la placa, el número de ticket y el
texto libre: solo quedan toneladas por ruta, por día y por hora.
"""
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "frontend" / "public" / "data"
SALIDA = DATOS / "residuos"

INICIO, FIN = "2025-01-01", "2026-03-09"  # periodo de los pesajes
CRS_M = 3116  # MAGNA-SIRGAS Bogotá, solo para medir metros
DIAS = {"WS": "Miércoles y sábado", "LJ": "Lunes y jueves", "MV": "Martes y viernes", "APOYO": "Ruta de refuerzo"}
CELDA_M = 100
PREFIJO_C2 = "170050100100002"  # código de barrio EPM de la Comuna 2: 1700501001000020XX


def meses_del_periodo():
    return ((date.fromisoformat(FIN) - date.fromisoformat(INICIO)).days + 1) / 30.4375


def cuantiles(valores, n=5):
    """Cortes de n clases por cuantiles (para la leyenda). Devuelve n-1 umbrales crecientes."""
    v = sorted(x for x in valores if x is not None)
    if not v:
        return []
    return [v[min(len(v) - 1, int(len(v) * k / n))] for k in range(1, n)]


def atribuible(t_mes, pct):
    """Toneladas al mes de una ruta que le tocan a la comuna: se reparten por la proporción de instalaciones."""
    return round(t_mes * pct / 100, 2)


def redondear(coords, d=5):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], d), round(coords[1], d)]
    return [redondear(c, d) for c in coords]


def a_geojson(gdf, columnas):
    feats = []
    for _, f in gdf.iterrows():
        g = json.loads(json.dumps(f.geometry.__geo_interface__))
        g["coordinates"] = redondear(g["coordinates"])
        props = {}
        for c in columnas:
            v = f[c]
            if v is None or (isinstance(v, float) and v != v):
                v = None
            elif hasattr(v, "item"):
                v = v.item()
            props[c] = v
        feats.append({"type": "Feature", "properties": props, "geometry": g})
    return {"type": "FeatureCollection", "features": feats}


def escribir(nombre, datos):
    SALIDA.mkdir(parents=True, exist_ok=True)
    (SALIDA / nombre).write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def principal(gdb):
    import geopandas as gpd
    import numpy as np
    import pandas as pd
    import pyogrio
    from shapely.geometry import box

    com = gpd.read_file(DATOS / "comuna.geojson").to_crs(4326)
    com_union = com.union_all()
    barrios = gpd.read_file(DATOS / "barrios.geojson").to_crs(4326)[["codigo", "nombre", "geometry"]]

    # ---------------------------------------------------------------- instalaciones (sin direcciones)
    ins = pyogrio.read_dataframe(
        gdb, layer="Instalaciones", bbox=tuple(com.total_bounds),
        columns=["ESTRATO", "ESTADO", "COD_RUTA", "BLOQUE_FRE", "HORARIO_MA", "DIV_TERRITORIAL6"],
    ).to_crs(4326)
    ins = ins[ins.within(com_union)].copy()
    ins["estrato"] = pd.to_numeric(ins["ESTRATO"], errors="coerce")
    ins["barrio_epm"] = ins["DIV_TERRITORIAL6"]
    print("instalaciones en la comuna:", len(ins))
    rutas = sorted(ins["COD_RUTA"].dropna().unique())
    todas = pyogrio.read_dataframe(gdb, layer="Instalaciones", columns=["COD_RUTA"], read_geometry=False)
    total_ruta = todas["COD_RUTA"].value_counts()
    del todas

    # ---------------------------------------------------------------- pesajes por ruta
    t = pyogrio.read_dataframe(gdb, layer="Tickets_Ruta", read_geometry=False)
    col_veh = next(c for c in t.columns if c.startswith("Veh"))
    t = t[t["Ruta"].isin(rutas)].copy()
    ext = t["Comentario"].map(lambda s: json.loads(s) if isinstance(s, str) and s.startswith("{") else {})
    t["hora_bascula"] = pd.to_datetime(ext.map(lambda d: d.get("datetime")), errors="coerce").dt.hour
    t["kg"] = t["Valor"].astype(float)
    t["fecha"] = pd.to_datetime(t["Fecha"]).dt.date
    t = t[(t["fecha"] >= date.fromisoformat(INICIO)) & (t["fecha"] <= date.fromisoformat(FIN))]
    print("pesajes de rutas de la comuna:", len(t), "toneladas:", round(t["kg"].sum() / 1000))
    meses = meses_del_periodo()

    est_ruta = {}
    for r, g in t.groupby("Ruta"):
        n_comuna = int((ins["COD_RUTA"] == r).sum())
        n_total = int(total_ruta.get(r, 0)) or n_comuna
        t_mes = g["kg"].sum() / 1000 / meses
        pct = 100 * n_comuna / n_total if n_total else 0
        est_ruta[r] = {
            "t_mes": round(t_mes, 1), "viajes": int(len(g)), "vehiculos": int(g[col_veh].nunique()),
            "kg_viaje": round(g["kg"].mean()), "instalaciones_ruta": n_total, "instalaciones_comuna": n_comuna,
            "pct_ruta_en_comuna2": round(pct, 1), "kg_inst_mes": round(t_mes * 1000 / n_total, 1) if n_total else None,
            "t_mes_atribuible_comuna2": atribuible(t_mes, pct),
        }
    for r in rutas:  # ruta sin pesajes en el periodo
        est_ruta.setdefault(r, {"t_mes": None, "viajes": 0, "vehiculos": 0, "kg_viaje": None, "instalaciones_ruta": int(total_ruta.get(r, 0)),
                                "instalaciones_comuna": int((ins["COD_RUTA"] == r).sum()), "pct_ruta_en_comuna2": None,
                                "kg_inst_mes": None, "t_mes_atribuible_comuna2": None})

    # ---------------------------------------------------------------- macrorutas (polígonos)
    z = gpd.read_file(gdb, layer="z1").to_crs(4326)
    z_m = z.to_crs(CRS_M)
    com_m = com.to_crs(CRS_M).union_all()
    z["solape_m2"] = [g.intersection(com_m).area for g in z_m.geometry]
    z = z[z["solape_m2"] > 200].copy()
    z["apoyo"] = z["BLOQUE_FRE"].eq("APOYO")
    for k in ["t_mes", "viajes", "vehiculos", "kg_viaje", "instalaciones_ruta", "instalaciones_comuna", "pct_ruta_en_comuna2", "kg_inst_mes", "t_mes_atribuible_comuna2"]:
        z[k] = z["COD_RUTA"].map(lambda r, k=k: est_ruta.get(r, {}).get(k))
    z["dias"] = z["BLOQUE_FRE"].map(lambda b: DIAS.get(b, b))
    z["geometry"] = z.geometry.simplify(0.00002)
    print("macrorutas que tocan la comuna:", len(z), "de apoyo:", int(z["apoyo"].sum()))
    cols_z = ["COD_RUTA", "DENO_RUTA", "BLOQUE_FRE", "dias", "HORARIO_MA", "apoyo", "t_mes", "kg_inst_mes", "kg_viaje", "vehiculos", "viajes",
              "instalaciones_comuna", "instalaciones_ruta", "pct_ruta_en_comuna2", "t_mes_atribuible_comuna2", "TON_TEORIC", "TON1ERAFRE"]

    # ---------------------------------------------------------------- ruteo (líneas)
    lin = gpd.read_file(gdb, layer="Zonas_Merge").to_crs(4326)
    lin = gpd.clip(lin[lin["COD_RUTA"].isin(rutas) | lin.intersects(com_union)], com_union)
    lin = lin.explode(index_parts=False)
    lin = lin[lin.geometry.type == "LineString"].copy()
    lin["long_m"] = lin.to_crs(CRS_M).length.round(0)
    lin = lin[lin["long_m"] >= 1]
    lin["RECOLEC"] = lin["RECOLEC"].astype(str).str.upper().str.replace(" ", "")
    lin["geometry"] = lin.geometry.simplify(0.000005)
    km = lin.groupby("RECOLEC")["long_m"].sum() / 1000
    print("tramos de calle:", len(lin), km.round(1).to_dict())

    # ---------------------------------------------------------------- celdas de 100 m con el conteo de instalaciones
    pm = ins.to_crs(CRS_M)
    ins["cx"] = np.floor(pm.geometry.x / CELDA_M).astype(int)
    ins["cy"] = np.floor(pm.geometry.y / CELDA_M).astype(int)
    ins["kg"] = ins["COD_RUTA"].map(lambda r: est_ruta.get(r, {}).get("kg_inst_mes") or 0)
    g = ins.groupby(["cx", "cy"]).agg(n=("estrato", "size"), estrato_prom=("estrato", "mean"), kg_mes=("kg", "sum")).reset_index()
    celdas = gpd.GeoDataFrame(
        g, geometry=[box(r.cx * CELDA_M, r.cy * CELDA_M, (r.cx + 1) * CELDA_M, (r.cy + 1) * CELDA_M) for r in g.itertuples()], crs=CRS_M,
    ).to_crs(4326)
    celdas["estrato_prom"] = celdas["estrato_prom"].round(1)
    celdas["t_mes_est"] = (celdas["kg_mes"] / 1000).round(3)
    print("celdas:", len(celdas), "máximo de instalaciones en una celda:", int(celdas["n"].max()))

    # ---------------------------------------------------------------- barrios (código EPM + nombre por cruce espacial)
    cruce = gpd.sjoin(ins[["barrio_epm", "geometry"]], barrios, how="left", predicate="within")
    filas = []
    for cod, g in ins.groupby("barrio_epm"):
        sub = cruce.loc[g.index]
        nombre = sub["nombre"].mode()
        fr = sub["nombre"].value_counts(normalize=True)
        rp = g["COD_RUTA"].value_counts()
        filas.append({
            "cod_barrio_epm": cod, "en_comuna2": str(cod).startswith(PREFIJO_C2),
            "nombre": nombre.iloc[0] if len(nombre) else None, "pct_en_barrio": round(100 * float(fr.iloc[0]), 0) if len(fr) else None,
            "instalaciones": int(len(g)), "estrato_prom": round(float(g["estrato"].mean()), 2),
            "t_mes_estimadas": round(float(g["kg"].sum()) / 1000, 1), "ruta_principal": rp.index[0], "n_rutas": int(len(rp)),
            "lat": round(float(g.geometry.y.median()), 5), "lon": round(float(g.geometry.x.median()), 5),
        })
    fuera_epm = sum(f["instalaciones"] for f in filas if not f["en_comuna2"])
    filas = [f for f in filas if f["en_comuna2"]]  # los demás códigos son de otras comunas que tocan el límite
    filas.sort(key=lambda r: -r["instalaciones"])
    print("barrios EPM:", [(f["cod_barrio_epm"][-3:], f["nombre"], f["instalaciones"]) for f in filas])

    # ---------------------------------------------------------------- series de pesajes (atribuidas a la comuna)
    peso = t["Ruta"].map(lambda r: (est_ruta[r]["pct_ruta_en_comuna2"] or 0) / 100)
    t["kg_c2"] = t["kg"] * peso
    diaria = t.groupby("fecha")["kg_c2"].sum() / 1000
    dia_sem = pd.to_datetime(diaria.index).dayofweek
    nombres = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    por_dia = [{"dia": nombres[i], "t_total": round(float(diaria[dia_sem == i].sum()), 1), "t_promedio": round(float(diaria[dia_sem == i].mean()), 1) if (dia_sem == i).any() else 0,
                "dias_con_dato": int((dia_sem == i).sum())} for i in range(7)]
    horas = t.dropna(subset=["hora_bascula"]).groupby("hora_bascula")["kg_c2"].agg(["size", "sum"])
    por_hora = [{"hora": h, "pesajes": int(horas["size"].get(h, 0)), "t": round(float(horas["sum"].get(h, 0)) / 1000, 1)} for h in range(24)]
    mensual = (t.assign(mes=pd.to_datetime(t["fecha"]).dt.strftime("%Y-%m")).groupby("mes")["kg_c2"].sum() / 1000).round(1)
    serie = [{"fecha": str(d), "t": round(float(v), 2)} for d, v in diaria.items()]

    # ---------------------------------------------------------------- resumen
    por_ruta = []
    for r in rutas:
        fila = z[z["COD_RUTA"] == r]
        s = est_ruta[r]
        por_ruta.append({"cod_ruta": r, "denominacion": fila["DENO_RUTA"].iloc[0] if len(fila) else None, "bloque": fila["BLOQUE_FRE"].iloc[0] if len(fila) else None,
                         "dias": fila["dias"].iloc[0] if len(fila) else None, "horario": fila["HORARIO_MA"].iloc[0] if len(fila) else None,
                         "planeacion_emvarias": {"ton_teoric": float(fila["TON_TEORIC"].iloc[0]) if len(fila) and fila["TON_TEORIC"].iloc[0] == fila["TON_TEORIC"].iloc[0] else None,
                                                 "ton_1era_frecuencia": float(fila["TON1ERAFRE"].iloc[0]) if len(fila) and fila["TON1ERAFRE"].iloc[0] == fila["TON1ERAFRE"].iloc[0] else None},
                         **s})
    por_ruta.sort(key=lambda r: -(r["t_mes_atribuible_comuna2"] or 0))
    t_attr = sum(r["t_mes_atribuible_comuna2"] or 0 for r in por_ruta)
    bloques = ins["BLOQUE_FRE"].value_counts()
    horarios = ins["HORARIO_MA"].value_counts()
    resumen = {
        "generado": date.today().isoformat(), "periodo": {"desde": INICIO, "hasta": FIN, "meses": round(meses, 2)},
        "kpis": {
            "t_mes_comuna": round(t_attr), "t_mes_rutas_completas": round(sum(r["t_mes"] or 0 for r in por_ruta)),
            "instalaciones": int(len(ins)), "kg_inst_mes": round(t_attr * 1000 / len(ins), 1), "rutas": len(rutas),
            "bloque_predominante": bloques.index[0], "dias_predominante": DIAS.get(bloques.index[0], bloques.index[0]),
            "pct_instalaciones_bloque": round(100 * bloques.iloc[0] / len(ins), 1), "horario_predominante": horarios.index[0],
            "pct_instalaciones_horario": round(100 * horarios.iloc[0] / len(ins), 1),
            "km_recoleccion": round(float(km.get("RECOLECCION", 0)), 1), "km_sin_recoleccion": round(float(km.get("NORECOLECCION", 0)), 1),
            "pesajes": int(len(t)), "instalaciones_otros_barrios_epm": int(fuera_epm), "estrato_prom": round(float(ins["estrato"].mean()), 2),
        },
        "cortes": {  # umbrales de las 5 clases de cada variable del mapa
            "t_mes": cuantiles([f["properties"]["t_mes"] for f in a_geojson(z, cols_z)["features"] if not f["properties"]["apoyo"]]),
            "kg_inst_mes": cuantiles([r["kg_inst_mes"] for r in por_ruta]), "vehiculos": cuantiles([r["vehiculos"] for r in por_ruta]),
        },
        "rutas": por_ruta, "barrios": filas, "serie_diaria": serie, "por_dia_semana": por_dia, "por_hora": por_hora,
        "mensual": [{"mes": m, "t": float(v)} for m, v in mensual.items()],
    }
    # POLÍTICA DE DATOS: solo se publican toneladas por barrio. Nada de rutas, polígonos, calles, horarios ni conteos de instalaciones.
    barrios_t = sorted(({"nombre": f["nombre"], "t_mes": f["t_mes_estimadas"]} for f in filas if f["nombre"]), key=lambda b: -b["t_mes"])
    escribir("residuos.json", {"generado": resumen["generado"], "periodo": resumen["periodo"],
                               "t_mes_comuna": round(sum(b["t_mes"] for b in barrios_t), 1), "barrios": barrios_t})

    ruta_f = DATOS / "fuentes.json"
    cat = json.loads(ruta_f.read_text(encoding="utf-8"))
    base = {"tipo": "oficial", "url_servicio": "", "consulta": None, "estado": "ok", "error": None,
            "fecha_descarga": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "licencia": "Datos entregados al proyecto por Emvarias y EPM, no son datos abiertos. Solo se publican toneladas por mes agregadas por barrio, sin rutas, calles, horarios ni direcciones."}
    nuevas = [
        {**base, "id": "residuos_toneladas_barrio", "nombre": "Toneladas de residuos por barrio (estimación mensual)", "entidad": "Emvarias y EPM",
         "formato_origen": "Geodatabase de Esri", "cobertura": f"Barrios de la Comuna 2, {INICIO} a {FIN}", "registros": len(barrios_t), "ultima_actualizacion_en_datos": FIN},
    ]
    ids = {n["id"] for n in nuevas}
    ruta_f.write_text(json.dumps([x for x in cat if x["id"] not in ids] + nuevas, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Listo. Toneladas/mes atribuibles:", round(t_attr), "| kg por instalación al mes:", resumen["kpis"]["kg_inst_mes"])


def prueba():
    assert abs(meses_del_periodo() - 14.22) < 0.05
    assert atribuible(100, 50) == 50.0
    assert cuantiles(list(range(10)), 5) == [2, 4, 6, 8]
    assert redondear([[1.123456789, 2.1]], 5) == [[1.12346, 2.1]]
    print("Comprobaciones internas: bien.")


if __name__ == "__main__":
    if "--prueba" in sys.argv:
        prueba()
    else:
        principal(sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\LENOVO\Downloads\Proyecto_grado.gdb")
