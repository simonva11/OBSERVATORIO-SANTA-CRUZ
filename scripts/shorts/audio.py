#!/usr/bin/env python3
"""Música y efectos de sonido para los shorts de OTEA.

La música es original: se compone aquí como MIDI (progresión Si menor - Sol - Re - La, guitarra de nailon,
bajo, cuerdas, marimba y batería) y se toca con el banco de sonidos libre FluidR3_GM. No usa canciones de nadie.
El tempo se ajusta a cada video para que la batería entre justo cuando se quita la tarjeta de entrada y el golpe
final caiga justo en la tarjeta de cierre. Los efectos (toques, subtítulos, transiciones) salen de las marcas que
deja el grabador en salida/<nombre>.eventos.json.

Uso:  python3 audio.py            (todos los videos de salida/)
      python3 audio.py mi-minuto  (solo los que contengan ese texto)
Requiere: fluidsynth, el banco FluidR3_GM.sf2 (o SOUNDFONT=ruta), ffmpeg, y pip install numpy scipy pretty_midi.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
import pretty_midi as pm
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
SF2 = os.environ.get("SOUNDFONT", "/usr/share/sounds/sf2/FluidR3_GM.sf2")
AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "salida")

# ------------------------------------------------------------------------------------------------ armonía
PROG = ["Bm", "G", "D", "A"]  # vi - IV - I - V en Re mayor
BAJO = {"Bm": 35, "G": 31, "D": 38, "A": 33}
VOZ = {"Bm": [54, 59, 62, 66], "G": [55, 59, 62, 67], "D": [57, 62, 66, 69], "A": [57, 61, 64, 69]}
# Motivo de marimba, dos compases que se repiten: (paso de 16avo, nota, duración en 16avos)
MOTIVO = {
    "Bm": [(0, 78, 2), (2, 81, 2), (4, 83, 3), (8, 81, 2), (10, 78, 2), (12, 76, 4)],
    "G": [(0, 74, 2), (2, 76, 2), (4, 78, 4), (10, 76, 2), (12, 74, 4)],
    "D": [(0, 78, 2), (2, 81, 2), (4, 83, 3), (8, 81, 2), (10, 78, 2), (12, 76, 4)],
    "A": [(0, 73, 2), (2, 76, 2), (4, 81, 4), (8, 78, 2), (10, 76, 2), (12, 73, 4)],
}
ARPEGIO = [(0, 0), (2, 2), (3, 1), (5, 3), (6, 2), (8, 0), (10, 2), (11, 1), (13, 3), (14, 2)]  # (paso, voz)


def componer(dur, t_entrada, t_cierre, semilla):
    """Devuelve un PrettyMIDI con intro libre hasta t_entrada, k compases exactos hasta t_cierre y un final."""
    rnd = np.random.default_rng(semilla)
    k = max(4, round((t_cierre - t_entrada) * 100 / 240))
    compas = (t_cierre - t_entrada) / k
    paso = compas / 16
    mid = pm.PrettyMIDI(initial_tempo=240 / compas)
    guit = pm.Instrument(24, name="guitarra")
    bajo = pm.Instrument(33, name="bajo")
    cuer = pm.Instrument(49, name="cuerdas")
    mari = pm.Instrument(12, name="marimba")
    piano = pm.Instrument(0, name="piano")
    bat = pm.Instrument(0, is_drum=True, name="bateria")

    def nota(inst, n, ini, fin, vel, jitter=0.006):
        j = float(rnd.normal(0, jitter)) if jitter else 0.0
        v = int(np.clip(vel + rnd.normal(0, 5), 1, 127))
        ini = max(0.0, ini + j)
        inst.notes.append(pm.Note(velocity=v, pitch=int(n), start=ini, end=max(ini + 0.03, min(fin, dur))))

    desfase = (4 - k) % 4  # para que el último compás antes del cierre sea La (V) y resuelva en Re (I)

    # Intro: cuerdas suaves y un piano que sube, mientras se ve la tarjeta de entrada.
    previo = PROG[(desfase - 1) % 4]
    for n in VOZ[previo]:
        nota(cuer, n, 0.0, t_entrada + 0.1, 46, 0)
    for i, n in enumerate(VOZ[previo] + [VOZ[previo][1] + 12]):
        t = 0.25 + i * (t_entrada - 0.6) / 5
        if t < t_entrada - 0.2:
            nota(piano, n + 12, t, t_entrada + 0.4, 52)

    for b in range(k):
        ac = PROG[(b + desfase) % 4]
        t0 = t_entrada + b * compas
        ultimo = b == k - 1
        for n in VOZ[ac]:
            nota(cuer, n, t0, t0 + compas, 38 if b < 4 else 46, 0)
        for s, v in ARPEGIO:
            nota(guit, VOZ[ac][v], t0 + s * paso, t0 + (s + 2) * paso, 72 if s % 4 == 0 else 60)
        for s, intervalo in zip([0, 3, 6, 8, 11, 14], [0, 0, 7, 12, 7, 0]):
            if ultimo and s >= 8:
                break
            nota(bajo, BAJO[ac] + intervalo, t0 + s * paso, t0 + (s + 2) * paso, 92 if s in (0, 8) else 78)
        if 4 <= b < k - 1 and (b - 4) % 4 < 4:
            for s, n, d in MOTIVO[ac]:
                nota(mari, n, t0 + s * paso, t0 + (s + d) * paso, 74)
        # batería
        for s in (0, 6, 8):
            if not (ultimo and s > 8):
                nota(bat, 36, t0 + s * paso, t0 + (s + 1) * paso, 104 if s == 0 else 92, 0.003)
        for s in (4, 12):
            if not (ultimo and s == 12):
                nota(bat, 39, t0 + s * paso, t0 + (s + 1) * paso, 88, 0.003)
                nota(bat, 38, t0 + s * paso, t0 + (s + 1) * paso, 50, 0.003)
        if b >= 2 and not ultimo:
            for s in range(0, 16, 2):
                nota(bat, 42, t0 + s * paso, t0 + (s + 1) * paso, 74 if s % 4 == 2 else 52, 0.004)
            for s in range(16):
                nota(bat, 70, t0 + s * paso, t0 + (s + 1) * paso, 44 if s % 2 else 34, 0.004)
            if b % 2 == 1:
                nota(bat, 46, t0 + 14 * paso, t0 + 16 * paso, 62, 0.003)
        if ultimo:  # redoble que sube hacia el cierre
            for s in range(8, 16):
                nota(bat, 38, t0 + s * paso, t0 + (s + 1) * paso, 56 + (s - 8) * 8, 0.002)

    # Cierre: golpe con platillo y Re mayor sostenido hasta el final.
    tc = t_cierre
    nota(bat, 49, tc, dur, 110, 0)
    nota(bat, 36, tc, tc + 0.2, 118, 0)
    nota(bajo, 38, tc, dur, 100, 0)
    for n in VOZ["D"] + [74]:
        nota(cuer, n, tc, dur, 70, 0)
    for i, n in enumerate([50, 57, 62, 66, 69]):
        nota(piano, n, tc + i * 0.018, dur, 78, 0)
        nota(guit, n + 12 if n < 60 else n, tc + i * 0.03, dur, 70, 0)
    for i, n in enumerate([74, 78, 81, 86]):
        nota(mari, n, tc + 0.4 + i * paso * 2, tc + 1.6 + i * paso * 2, 70, 0)

    for inst in (cuer, piano, guit, bajo, mari, bat):
        mid.instruments.append(inst)
    return mid


# ------------------------------------------------------------------------------------------------ efectos
def _t(seg):
    return np.arange(int(seg * SR)) / SR


def _banda(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def toque():
    t = _t(0.09)
    clic = np.sin(2 * np.pi * 1600 * t) * np.exp(-t / 0.007) * 0.45
    golpe = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.022) * 0.7
    ruido = _banda(np.random.default_rng(1).normal(0, 1, len(t)), 2000, 8000) * np.exp(-t / 0.003) * 0.25
    return clic + golpe + ruido


def tic():
    t = _t(0.07)
    f = 720 + 420 * t / 0.07
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.018) * 0.28


def soplo(dur=0.55, sube=True, vol=0.5, semilla=2):
    t = _t(dur)
    r = np.random.default_rng(semilla).normal(0, 1, len(t))
    bajo, alto = _banda(r, 200, 1000), _banda(r, 1500, 7000)
    w = t / dur if sube else 1 - t / dur
    pico = 0.72 if sube else 0.25
    env = np.where(t < pico * dur, (t / (pico * dur)) ** 2, np.exp(-(t - pico * dur) / (0.08 * dur / 0.5)))
    return ((1 - w) * bajo + w * alto) * env * vol


def campana():
    out = np.zeros(int(0.9 * SR))
    for i, f in enumerate([1318.5, 1760.0]):
        t = _t(0.9 - i * 0.09)
        s = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t / 0.22) * 0.22
        out[int(i * 0.09 * SR):int(i * 0.09 * SR) + len(s)] += s
    return out


def obturador():
    out = np.zeros(int(0.15 * SR))
    for i in range(2):
        c = toque()[: int(0.05 * SR)] * 0.6
        out[int(i * 0.06 * SR):int(i * 0.06 * SR) + len(c)] += c
    return out


def subida(dur=1.6):
    t = _t(dur)
    r = np.random.default_rng(3).normal(0, 1, len(t))
    w = t / dur
    ruido = ((1 - w) * _banda(r, 300, 1500) + w * _banda(r, 2500, 9000)) * (w ** 2.5) * 0.35
    tono = np.sin(2 * np.pi * np.cumsum(180 + 520 * w ** 2) / SR) * (w ** 3) * 0.08
    return ruido + tono


def impacto():
    t = _t(1.4)
    f = 45 + 45 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35) * 0.75
    ruido = _banda(np.random.default_rng(4).normal(0, 1, len(t)), 80, 2500) * np.exp(-t / 0.05) * 0.3
    return boom + ruido


def efectos(eventos, dur, t_entrada, t_cierre):
    pista = np.zeros(int((dur + 2) * SR))

    def poner(sonido, t, vol=1.0):
        i = int(max(0, t) * SR)
        n = min(len(sonido), len(pista) - i)
        if n > 0:
            pista[i:i + n] += sonido[:n] * vol

    poner(subida(min(1.6, t_entrada)), t_entrada - min(1.6, t_entrada))
    for e in eventos:
        t, tipo = e["t"], e["tipo"]
        if tipo == "toque":
            poner(toque(), t, 0.9)
        elif tipo == "sub":
            poner(tic(), t, 0.8)
        elif tipo in ("tarjeta", "escena") and t > 0.5:
            poner(soplo(0.5, True, 0.55), t - 0.32)
        elif tipo in ("quitar", "salida"):
            poner(soplo(0.35, False, 0.35, 5), t)
        elif tipo == "imagen":
            poner(obturador(), t, 0.9)
            poner(campana(), t + 0.15, 0.9)
        elif tipo == "exito":
            poner(campana(), t + 0.05)
    poner(impacto(), t_cierre, 0.8)
    return pista[: int(dur * SR)]


# ------------------------------------------------------------------------------------------------ mezcla
def duracion(mp4):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)


def sonorizar(nombre):
    mp4 = os.path.join(SALIDA, f"{nombre}.mp4")
    ev = json.load(open(os.path.join(SALIDA, f"{nombre}.eventos.json")))["eventos"]
    dur = duracion(mp4)
    entradas = [e["t"] for e in ev if e["tipo"] in ("quitar", "escena")]
    tarjetas = [e["t"] for e in ev if e["tipo"] == "tarjeta"]
    t_entrada = entradas[0] if entradas else 3.0
    t_cierre = tarjetas[-1] if tarjetas and tarjetas[-1] > t_entrada + 8 else dur - 4
    with tempfile.TemporaryDirectory() as tmp:
        mid = componer(dur, t_entrada, t_cierre, semilla=sum(map(ord, nombre)))
        ruta_mid, ruta_wav = os.path.join(tmp, "m.mid"), os.path.join(tmp, "m.wav")
        mid.write(ruta_mid)
        subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.6", "-r", str(SR), "-F", ruta_wav, SF2, ruta_mid],
                       check=True, capture_output=True)
        sr, musica = wavfile.read(ruta_wav)
        musica = musica.astype(np.float64) / 32768.0
        if musica.ndim == 1:
            musica = np.stack([musica, musica], 1)
        n = int(dur * SR)
        musica = np.pad(musica, ((0, max(0, n - len(musica))), (0, 0)))[:n]
        musica *= 10 ** ((-23 - rms_db(musica)) / 20)  # la música va de fondo
        fx = efectos(ev, dur, t_entrada, t_cierre)
        fx *= 10 ** ((-25 - rms_db(fx[fx != 0] if np.any(fx) else fx)) / 20) if np.any(fx) else 1
        mezcla = musica + fx[:, None]
        t = np.arange(n) / SR
        mezcla *= np.clip(t / 0.25, 0, 1)[:, None] * np.clip((dur - t) / 1.6, 0, 1)[:, None]
        mezcla = np.tanh(mezcla * 1.1) / np.tanh(1.1)  # techo suave para los picos
        ruta_mezcla = os.path.join(tmp, "mezcla.wav")
        wavfile.write(ruta_mezcla, SR, (mezcla * 32767 * 0.9).astype(np.int16))
        salida_tmp = os.path.join(tmp, "v.mp4")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4, "-i", ruta_mezcla, "-map", "0:v:0", "-map", "1:a:0",
                        "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.79:attack=3:release=60:level=0", "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
                        "-t", f"{dur:.3f}", "-movflags", "+faststart", salida_tmp], check=True)
        shutil.move(salida_tmp, mp4)
    tempo = mid.get_tempo_changes()[1][0]
    print(f"{nombre}: {dur:.1f} s · batería en {t_entrada:.2f} s · cierre en {t_cierre:.2f} s · {tempo:.1f} bpm")


if __name__ == "__main__":
    pedidos = sys.argv[1:]
    for archivo in sorted(os.listdir(SALIDA)):
        if archivo.endswith(".eventos.json"):
            nombre = archivo[: -len(".eventos.json")]
            if not pedidos or any(p in nombre for p in pedidos):
                sonorizar(nombre)
