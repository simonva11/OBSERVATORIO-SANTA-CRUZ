"""Pruebas de la API. Correr desde la carpeta backend con:  python -m pytest"""
from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def test_salud():
    r = cliente.get("/api/salud")
    assert r.status_code == 200
    assert r.json()["estado"] == "ok"
    assert r.json()["capas"] > 10


def test_lista_de_capas_incluye_barrios():
    ids = {c["id"] for c in cliente.get("/api/capas").json()}
    assert {"barrios", "comuna", "equipamientos", "estaciones"} <= ids


def test_capa_barrios_tiene_11_barrios():
    r = cliente.get("/api/capas/barrios")
    assert r.status_code == 200
    assert r.json()["type"] == "FeatureCollection"
    assert len(r.json()["features"]) == 11


def test_capa_inexistente_y_rutas_peligrosas():
    assert cliente.get("/api/capas/no_existe").status_code == 404
    assert cliente.get("/api/capas/..%2F..%2Fetc%2Fpasswd").status_code == 404


def test_indicadores_coherentes():
    d = cliente.get("/api/indicadores").json()
    suma = sum(b["poblacion_2018"] or 0 for b in d["barrios"])
    assert suma == d["comuna"]["poblacion_2018"]
    assert abs(sum(b["area_ha"] for b in d["barrios"]) - d["comuna"]["area_ha"]) < 1
    # lo que no se puede calcular todavía no se inventa
    assert d["comuna"]["red_peatonal_inventariada_pct"] is None


def test_ficha_de_barrio():
    r = cliente.get("/api/barrios/0201")
    assert r.status_code == 200
    assert r.json()["nombre"] == "La Isla"
    assert cliente.get("/api/barrios/9999").status_code == 404


def test_fuentes_todas_con_tipo_y_estado():
    for f in cliente.get("/api/fuentes").json():
        assert f["tipo"] in {"oficial", "tercero", "campo", "demostrativo"}
        assert f["estado"] in {"ok", "error", "sin descargar"}


def test_votos(tmp_path, monkeypatch):
    monkeypatch.setenv("OTEA_DB", str(tmp_path / "t.db"))
    v = {"barrio": "0201", "tema": "andenes", "codigo": "abcdefgh-1234-5678"}
    assert cliente.post("/api/votos", json=v).status_code == 201
    # el mismo código cambia su voto, no suma otro
    assert cliente.post("/api/votos", json={**v, "tema": "riesgo"}).json()["votos"] == {"andenes": 0, "espacio_publico": 0, "movilidad": 0, "seguridad_vial": 0, "riesgo": 1}
    # otro código suma
    cliente.post("/api/votos", json={**v, "codigo": "zzzzzzzz-1234-5678"})
    assert sum(cliente.get("/api/votos").json()["votos"]["0201"].values()) == 2
    # entradas malas
    assert cliente.post("/api/votos", json={**v, "barrio": "9999"}).status_code == 422
    assert cliente.post("/api/votos", json={**v, "tema": "<script>"}).status_code == 422
    assert cliente.post("/api/votos", json={**v, "codigo": "corto"}).status_code == 422
