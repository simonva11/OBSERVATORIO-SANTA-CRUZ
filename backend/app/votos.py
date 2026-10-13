"""
Votación de prioridades por barrio.

Cada persona (identificada solo por un código al azar que guarda su navegador) elige UN tema por barrio y puede
cambiarlo. No se guardan nombres, correos ni IP: del código solo se guarda un hash.
shortcut: el límite por IP vive en memoria de un solo proceso y el código al azar se puede borrar para votar de
nuevo. Sirve para una prueba piloto; para algo oficial hace falta verificar a las personas (ver auditoría).
"""
import hashlib
import os
import re
import sqlite3
import time
from collections import defaultdict, deque
from contextlib import closing
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/votos", tags=["votos"])

TEMAS = ("andenes", "espacio_publico", "movilidad", "seguridad_vial", "riesgo")
BARRIOS = ("0201", "0202", "0203", "0204", "0205", "0206", "0207", "0208", "0209", "0210", "0211")
_CODIGO = re.compile(r"^[A-Za-z0-9-]{16,64}$")
_LIMITE, _VENTANA = 30, 3600  # máximo 30 votos por hora y por IP
_golpes: dict[str, deque] = defaultdict(deque)


def _ruta_db() -> Path:
    return Path(os.environ.get("OTEA_DB", Path(__file__).resolve().parents[1] / "otea.db"))


def _conexion() -> sqlite3.Connection:
    con = sqlite3.connect(_ruta_db())
    con.execute(
        "CREATE TABLE IF NOT EXISTS votos (barrio TEXT NOT NULL, huella TEXT NOT NULL, tema TEXT NOT NULL,"
        " creado TEXT NOT NULL, PRIMARY KEY (barrio, huella))"
    )
    return con


class Voto(BaseModel):
    barrio: str = Field(min_length=4, max_length=4)
    tema: str = Field(min_length=3, max_length=20)
    codigo: str = Field(min_length=16, max_length=64)


def _totales(barrio: str | None = None) -> dict:
    salida: dict[str, dict[str, int]] = {b: {t: 0 for t in TEMAS} for b in BARRIOS}
    with closing(_conexion()) as con:
        for b, t, n in con.execute("SELECT barrio, tema, COUNT(*) FROM votos GROUP BY barrio, tema"):
            if b in salida and t in salida[b]:
                salida[b][t] = n
    return salida if barrio is None else {barrio: salida[barrio]}


@router.get("", summary="Votos por barrio y tema")
def ver_votos():
    return {"temas": TEMAS, "votos": _totales()}


@router.post("", status_code=201, summary="Votar (o cambiar el voto) por un tema en un barrio")
def votar(v: Voto, request: Request):
    if v.barrio not in BARRIOS:
        raise HTTPException(422, "Ese barrio no es de la Comuna 2.")
    if v.tema not in TEMAS:
        raise HTTPException(422, "Ese tema no está en la votación.")
    if not _CODIGO.match(v.codigo):
        raise HTTPException(422, "Código no válido.")
    ip = request.client.host if request.client else "?"
    ahora = time.time()
    q = _golpes[ip]
    while q and ahora - q[0] > _VENTANA:
        q.popleft()
    if len(q) >= _LIMITE:
        raise HTTPException(429, "Demasiados votos desde esta conexión. Intente más tarde.")
    q.append(ahora)
    huella = hashlib.sha256(v.codigo.encode()).hexdigest()
    with closing(_conexion()) as con, con:
        con.execute(
            "INSERT INTO votos (barrio, huella, tema, creado) VALUES (?,?,?,datetime('now'))"
            " ON CONFLICT(barrio, huella) DO UPDATE SET tema = excluded.tema, creado = excluded.creado",
            (v.barrio, huella, v.tema),
        )
    return {"ok": True, "votos": _totales(v.barrio)[v.barrio]}
