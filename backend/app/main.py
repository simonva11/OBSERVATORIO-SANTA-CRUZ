"""
API de OTEA, el observatorio inmobiliario y territorial de Santa Cruz.

En el prototipo (Fase 2) la API sirve los mismos archivos que genera el
pipeline (frontend/public/data). Así la interfaz puede pasar de leer archivos
estáticos a consultar la API sin cambiar nada más. En la Fase 4 estas rutas
leerán de PostgreSQL + PostGIS (ver docs/03_modelo_de_datos.sql) y se sumarán
las rutas de reportes ciudadanos.

Correr:
    uvicorn app.main:app --reload --port 8000
Documentación interactiva:
    http://localhost:8000/docs
"""
import json
import os
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .resumen import construir as construir_resumen

RAIZ = Path(__file__).resolve().parents[2]
DATOS = Path(os.environ.get("OBSERVATORIO_DATOS", RAIZ / "frontend" / "public" / "data"))

app = FastAPI(
    title="OTEA · Observatorio Santa Cruz",
    description="Datos territoriales de la Comuna 2 de Medellín (Reto #4, Territorio INN 2026).",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@lru_cache(maxsize=64)
def _leer(nombre: str) -> dict | list:
    ruta = DATOS / nombre
    if not ruta.is_file():
        raise FileNotFoundError(nombre)
    return json.loads(ruta.read_text(encoding="utf-8"))


def _capas_disponibles() -> list[str]:
    if not DATOS.is_dir():
        return []
    return sorted(p.stem for p in DATOS.glob("*.geojson"))


@app.get("/api/salud", summary="Estado de la API y de los datos")
def salud():
    capas = _capas_disponibles()
    return {
        "estado": "ok" if capas else "sin datos",
        "carpeta_datos": str(DATOS),
        "capas": len(capas),
        "mensaje": None if capas else "Corra el pipeline (data-pipeline/descargar.py y procesar.py) para generar los datos.",
    }


@app.get("/api/capas", summary="Lista de capas geográficas disponibles")
def listar_capas():
    salida = []
    for id_ in _capas_disponibles():
        datos = _leer(f"{id_}.geojson")
        salida.append({"id": id_, "elementos": len(datos.get("features", []))})
    return salida


@app.get("/api/capas/{capa_id}", summary="Una capa en formato GeoJSON")
def obtener_capa(capa_id: str):
    # Solo se aceptan nombres de capas que existen: evita leer archivos arbitrarios.
    if capa_id not in _capas_disponibles():
        raise HTTPException(status_code=404, detail=f"No existe la capa '{capa_id}'.")
    return _leer(f"{capa_id}.geojson")


@app.get("/api/indicadores", summary="Indicadores de la comuna y de cada barrio")
def indicadores():
    try:
        return _leer("indicadores.json")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Todavía no se han calculado los indicadores.")


@app.get("/api/barrios", summary="Fichas de los barrios")
def barrios():
    return indicadores()["barrios"]


@app.get("/api/barrios/{codigo}", summary="Ficha de un barrio por su código oficial (ej. 0201)")
def barrio(codigo: str):
    for b in barrios():
        if b["codigo"] == codigo:
            return b
    raise HTTPException(status_code=404, detail=f"No hay un barrio con código '{codigo}' en la Comuna 2.")


@app.get("/api/fuentes", summary="Catálogo de fuentes con su estado")
def fuentes():
    try:
        return _leer("fuentes.json")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Todavía no se ha generado el catálogo de fuentes.")


@app.get("/api/calidad", summary="Fuentes por verificar y notas de calidad")
def calidad():
    try:
        return _leer("calidad.json")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Todavía no se han generado las notas de calidad.")


@app.get("/api/inicio", summary="Resumen para la página de Inicio")
def inicio():
    """Cifras de la portada: población, accesibilidad, Carrera 49, seguridad y conteo de fuentes y capas."""
    return construir_resumen(DATOS)


@app.get("/api/seguridad", summary="Conteos de seguridad por barrio (hurto y homicidio 2017, mortalidad vial, cámaras)")
def seguridad():
    try:
        return _leer("seguridad.json")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Todavía no se ha generado seguridad.json.")


@app.get("/api/corredor-49", summary="Análisis del corredor de la Carrera 49")
def corredor_49():
    try:
        return _leer("eje49.json")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Todavía no se ha corrido data-pipeline/eje49.py.")


@app.get("/api/accesibilidad", summary="Minutos caminando por barrio hasta los destinos básicos")
def accesibilidad():
    a = indicadores().get("accesibilidad")
    if not a:
        raise HTTPException(status_code=503, detail="Falta correr data-pipeline/red.py.")
    return a
