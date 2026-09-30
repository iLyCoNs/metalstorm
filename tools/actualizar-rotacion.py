#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
actualizar-rotacion.py
Regenera "rotacion.json" (rotación de modo + mapa de Metalstorm) leyendo el
archivo del propio juego: event-schedule.config.

La página web (index.html) lee rotacion.json automáticamente, así que tras un
parche del juego basta con ejecutar este script y subir el JSON actualizado.

Uso:
    pip install msgpack
    python actualizar-rotacion.py

Requisitos: tener Metalstorm instalado y al menos una vez abierto/logueado
(los configs quedan en AppData\\LocalLow\\Starform\\Metalstorm\\content-download\\aircombat).
"""
import datetime
import json
import os
import sys

try:
    import msgpack
except ImportError:
    print("Falta el modulo msgpack. Instala con:  pip install msgpack")
    sys.exit(1)

# ----------------------------------------------------------------------------
# 1) Localizar la carpeta de contenido descargado del juego
# ----------------------------------------------------------------------------
CANDIDATOS = [
    os.path.expandvars(r"%USERPROFILE%\AppData\LocalLow\Starform\Metalstorm\content-download\aircombat"),
    os.path.expandvars(r"%USERPROFILE%\AppData\LocalLow\Starform\Metalstorm\content-download"),
]

def encontrar_download_dir():
    for d in CANDIDATOS:
        if os.path.isdir(d) and os.path.exists(os.path.join(d, "download-manifest-v8.json")):
            return d
    return None

# ----------------------------------------------------------------------------
# 2) Deobfuscador del manifiesto de contenido (algoritmo del juego)
# ----------------------------------------------------------------------------
OFFS = [27, 158, 9, 140, 15, 146, 21, 152]

def deobfuscate(data: bytes) -> bytes:
    n = len(data)
    out = bytearray(n)
    for i, b in enumerate(data):
        out[n - 1 - i] = (0xFF - b + OFFS[i % 8]) & 0xFF
    return bytes(out)

# ----------------------------------------------------------------------------
# 3) Obtener el hash actual de event-schedule.config desde el manifiesto
# ----------------------------------------------------------------------------
def buscar_hash_event_schedule(download_dir: str) -> str:
    dm_path = os.path.join(download_dir, "download-manifest-v8.json")
    dm = json.load(open(dm_path, encoding="utf-8"))
    activo = dm.get("activeContentManifestHash")
    if not activo:
        raise RuntimeError("No se encontro activeContentManifestHash en download-manifest-v8.json")

    ruta = os.path.join(download_dir, activo)
    if not os.path.exists(ruta):
        raise RuntimeError(
            "No existe el manifiesto de contenido %s.\nAbre el juego una vez para que lo descargue." % activo
        )

    contenido = json.loads(deobfuscate(open(ruta, "rb").read()).decode("utf-8"))
    files = contenido.get("fileManifestsByRelativePath", {})
    entrada = files.get("event-schedule.config")
    if not entrada:
        raise RuntimeError("event-schedule.config no esta en el manifiesto de contenido.")
    return entrada["hash"]

# ----------------------------------------------------------------------------
# 4) Leer la rotacion y generar rotacion.json
# ----------------------------------------------------------------------------
def generar(download_dir: str, salida: str) -> None:
    h = buscar_hash_event_schedule(download_dir)
    ruta_cfg = os.path.join(download_dir, h)
    if not os.path.exists(ruta_cfg):
        raise RuntimeError("Falta descargar event-schedule.config (%s). Abre el juego." % h)

    ev = msgpack.unpackb(open(ruta_cfg, "rb").read(), raw=False, strict_map_key=False)
    sch = ev["game-mode-event-slot:slot-1"]["schedule"]
    ref = sch["referenceUnixSeconds"]
    events = sch["events"]

    slots = []
    for e in events:
        rid = e["scheduledEvent"]["_r"]           # generated-event:Mapa:variante:modo:...
        partes = rid.split(":")
        if len(partes) >= 4 and partes[0] == "generated-event":
            slots.append(":".join(partes[1:4]))

    ciclo = events[-1]["startTimeUnixSeconds"] + 1800 if events else 0
    data = {
        "generado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fuente": "event-schedule.config (content-download)",
        "referenceUnixSeconds": ref,
        "cycleSeconds": ciclo,
        "slotSeconds": 1800,
        "slots": slots,
    }
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    ahora = datetime.datetime.now(datetime.timezone.utc)
    seg = int(ahora.timestamp())
    i = ((seg - ref) // 1800) % len(slots)
    print("rotacion.json regenerado: %s" % salida)
    print("  franjas: %d (ciclo de %.0f horas)" % (len(slots), ciclo / 3600))
    print("  ahora (%s UTC): %s" % (ahora.strftime("%H:%M"), slots[i]))

# ----------------------------------------------------------------------------
if __name__ == "__main__":
    carpeta = encontrar_download_dir()
    if not carpeta:
        print("No se encontro la carpeta de contenido del juego.")
        print("Abre Metalstorm al menos una vez y vuelve a intentarlo.")
        sys.exit(1)

    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # carpeta Metal/
    salida = os.path.join(base, "rotacion.json")
    try:
        generar(carpeta, salida)
    except Exception as ex:
        print("ERROR: %s" % ex)
        sys.exit(1)
