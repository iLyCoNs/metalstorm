#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
actualizar-noticias.py
Descarga las noticias oficiales de Metalstorm (las mismas que muestra el juego)
y genera escuadron/noticias.json + escuadron/assets/news/* para la página.

El juego las baja de:
  https://d6o3bb9lmr48m.cloudfront.net/aircombat/production/news.json
Como ese CDN no permite CORS, la web NO las puede pedir directo desde el
navegador: por eso se guardan en el repo y se actualizan con este script.

Uso:
    pip install requests pillow   (requests es opcional; usa urllib si falta)
    python actualizar-noticias.py [--salida DIR]

Requiere internet. No requiere el juego instalado.
"""
import datetime
import json
import os
import re
import sys
import urllib.parse
import urllib.request

BASE_URL = "https://d6o3bb9lmr48m.cloudfront.net/aircombat/production"
NOTICIAS_URL = BASE_URL + "/news.json"

try:
    from PIL import Image
    TIENE_PIL = True
except ImportError:
    TIENE_PIL = False


def prettify(entry_id):
    """Convierte un entryId técnico en (titulo, fechaISO) legibles."""
    m = re.match(r"(\d{4})[_-](\d{1,2})[_-](\d{1,2})[_-](.+)$", entry_id)
    fecha = None
    resto = entry_id
    if m:
        y, mo, d, resto = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
        try:
            fecha = datetime.date(y, mo, d).isoformat()
        except ValueError:
            fecha = None
    r = resto.lower()
    if r.startswith("flight-pass-") or r.startswith("flight_pass_"):
        num = re.sub(r"\D", "", r)
        titulo = "Flight Pass %s" % num if num else "Flight Pass"
    elif r == "f20_tigershark_black_market":
        titulo = "F-20 Tigershark — Black Market"
    elif "black_market" in r or "black-market" in r:
        titulo = "Black Market: " + r.replace("black_market", "").replace("black-market", "").strip("_- ").replace("_", " ").title()
    elif "mcs-reminder" in r or "mcs_reminder" in r:
        titulo = "MCS — Recordatorio"
    elif "lastcall" in r or "last-call" in r:
        avion = r.split("_")[0].upper() if "_" in r else ""
        titulo = ("%s — Última llamada" % avion).strip(" —")
    elif "matcherino" in r:
        titulo = "Matcherino (torneo comunitario)"
    elif "fa18_ctf" in r or "fa-18-ctf" in r:
        titulo = "F/A-18 — Captura la Bandera"
    elif "desktop_ui" in r or "desktop-ui" in r:
        titulo = "Actualización del juego"
    else:
        titulo = resto.replace("_", " ").replace("-", " ").strip().title() or entry_id
    return titulo, fecha


def texto_boton(url):
    if not url:
        return None
    u = url.lower()
    if "playmetalstorm.com" in u:
        return "Ver en la tienda"
    if "youtube.com" in u or "youtu.be" in u:
        return "Ver video"
    if "discord" in u:
        return "Unirse al Discord"
    if "twitch" in u:
        return "Ver directo"
    return "Abrir enlace"


def recolectar(nodo, imagenes, botones):
    """Recorre el árbol UI de una noticia: imágenes (con URL) y botones."""
    if isinstance(nodo, dict):
        img = nodo.get("image")
        if isinstance(img, dict) and img.get("imageDownloadUrlPath"):
            imagenes.append(img["imageDownloadUrlPath"])
        if "labelButton" in nodo and isinstance(nodo.get("action"), dict):
            url = nodo["action"].get("browserUrl")
            if url:
                botones.append(url)
        for c in nodo.get("children", []) or []:
            recolectar(c, imagenes, botones)
    elif isinstance(nodo, list):
        for c in nodo:
            recolectar(c, imagenes, botones)


def descargar(url, destino, max_ancho=1200):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    with open(destino, "wb") as f:
        f.write(data)
    if TIENE_PIL:
        try:
            im = Image.open(destino)
            if max(im.size) > max_ancho:
                im = im.convert("RGB")
                im.thumbnail((max_ancho, max_ancho), Image.LANCZOS)
                im.save(destino, quality=82, optimize=True, progressive=True)
        except Exception:
            pass
    return os.path.getsize(destino)


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # carpeta Metal/ o escuadron/
    # Si el script vive en Metal/tools -> la web del escuadrón está en Metal/escuadron
    # Si vive en escuadron/tools -> la web está un nivel arriba
    candidatos = [
        os.path.join(base, "escuadron"),
        base,
    ]
    web = None
    for c in candidatos:
        if os.path.exists(os.path.join(c, "jugadores.json")) or "escuadron" in c:
            web = c
            break
    if web is None or not os.path.isdir(web):
        print("No se encontró la carpeta de la web del escuadrón.")
        sys.exit(1)

    print("Descargando", NOTICIAS_URL)
    req = urllib.request.Request(NOTICIAS_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        feed = json.loads(resp.read().decode("utf-8"))

    dir_news = os.path.join(web, "assets", "news")
    os.makedirs(dir_news, exist_ok=True)

    noticias = []
    for e in feed.get("entries", []):
        eid = e.get("entryId", "noticia")
        titulo, fecha = prettify(eid)
        imagenes, botones = [], []
        recolectar(e.get("elements", []), imagenes, botones)
        # sin duplicados, en orden
        imagenes = list(dict.fromkeys(imagenes))

        archivos = []
        for i, rel in enumerate(imagenes):
            nombre = re.sub(r"[^a-zA-Z0-9_.-]", "_", os.path.basename(rel)) or ("img%d.jpg" % i)
            if "." not in nombre:
                nombre += ".jpg"
            destino = os.path.join(dir_news, "%s-%d-%s" % (re.sub(r"\W", "_", eid)[:40], i, nombre))
            url = BASE_URL + "/" + urllib.parse.quote(rel)
            try:
                kb = descargar(url, destino) // 1024
                archivos.append(os.path.relpath(destino, web).replace(os.sep, "/"))
                print("  %-50s %d KB" % (os.path.basename(destino), kb))
            except Exception as ex:
                print("  ERROR %s: %s" % (rel, ex))

        boton = None
        if botones:
            boton = {"texto": texto_boton(botones[0]), "url": botones[0]}

        noticias.append({
            "id": eid,
            "titulo": titulo,
            "fecha": fecha,
            "imagenes": archivos,
            "boton": boton,
        })
        print("OK %-40s | %s | %d imgs%s" % (eid, titulo, len(archivos), " + botón" if boton else ""))

    salida = os.path.join(web, "noticias.json")
    with open(salida, "w", encoding="utf-8") as f:
        json.dump({
            "actualizado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "fuente": "news.json oficial del juego (CDN de Starform)",
            "total": len(noticias),
            "noticias": noticias,
        }, f, ensure_ascii=False, indent=1)
    print("noticias.json generado: %s (%d noticias)" % (salida, len(noticias)))


if __name__ == "__main__":
    main()
