# Metal — Temporizador de rotación de modos de Metalstorm

Página web estática que muestra en tiempo real el modo activo de **Metalstorm**, el **mapa
actual y el próximo**, y una cuenta regresiva a la siguiente rotación, igual que el
temporizador del juego.

## Cómo funciona

La rotación del juego cambia **cada 30 minutos**, alineada al reloj **UTC**:

| Franja (UTC) | Modo |
|---|---|
| `HH:00 – HH:29` | Combate a muerte por equipos (Team Deathmatch) |
| `HH:30 – HH:59`, hora **par** | Superioridad aérea (Air Superiority) |
| `HH:30 – HH:59`, hora **impar** | Objetivo prioritario (Priority Target) |

La tabla fue **verificada en vivo** contra el cliente (capturas del hangar y partidas:
23:00 UTC → Arctic nieve + TDM, 23:30 UTC → Cañón carmesí noche + Priority Target,
01:30 UTC → Cañón carmesí + Priority Target).

## Mapas (rotación semanal completa)

El juego trae el calendario completo (modo + mapa + variante) en su config
`event-schedule.config`: un **ciclo semanal determinista de 336 franjas de 30 minutos**.
La página lo lee desde **`rotacion.json`**, por lo que muestra:

- **Mapa actual** y **próximo mapa** en la tarjeta principal.
- El **mapa de cada franja** en la lista de próximas rotaciones.
- Nombres oficiales en español tomados de la localización del juego (`loc-es-ES.config`):
  Bosque de Piedra, Cañón carmesí (+ noche/amanecer), Tormenta desatada, Crisol,
  Cuenta atrás, Rumbo al hielo (+ noche/nieve), Enclave.

### Actualizar tras un parche del juego

Si Starform cambia la rotación o los mapas (parches de contenido), regenera el JSON:

```bash
pip install msgpack
python tools/actualizar-rotacion.py
```

El script lee los archivos del propio juego (requiere haber abierto Metalstorm al menos
una vez), regenera `rotacion.json` y muestra la franja actual. Sube el JSON actualizado y
listo — no hay que tocar el HTML.

>Durante eventos o modos limitados (p. ej. Captura la Bandera) el modo de una franja puede
>cambiar; para eso existe `eventos.json` (ver más abajo).

## Imágenes

Los íconos y fondos de modos se extrajeron de la instalación del propio juego
(`content-bundle`, texturas `ui_game-modes_icons_*`) y se usan con fines informativos de fans.
El fondo de **Air Superiority** no existe como asset oficial: se generó a partir del patrón
triangular oficial de Team Deathmatch con un giro de tono, para mantener el estilo del juego.

Las **miniaturas de mapa** en la tarjeta son recortes apaisados de las pantallas de
carga (`wall-*.jpg`), que se distinguen mejor en pequeño que los minimapas tácticos
(estos últimos se descartaron por poco legibles).

Los **fondos cinematográficos** (`wall-*.jpg`) son las pantallas de carga oficiales de
cada mapa, publicadas en la Official Metalstorm Wiki bajo licencia
**CC BY-SA 4.0** (atribución: Official Metalstorm Wiki / wiki.gg). Se usan como fondo
de cada franja de la lista.

El mapa "Volcano" del calendario corresponde al asset "Crucible" (cráter volcánico).

El **wordmark METALSTORM** (encabezado), el **emblema del rayo** (favicon) y el
**logo de Starform** (pie de página) también vienen de los archivos del juego
(`splash-text`, `prompt-to-rate ms_logo` y `starform-logo`).

Todas las imágenes son propiedad de **Starform**; este proyecto no está afiliado y no debe
usarse comercialmente.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (público), por ejemplo `metal-rotation`.
2. Sube **todo el contenido de esta carpeta** (`index.html`, `rotacion.json`, `eventos.json`, `README.md`, `assets/` y `tools/`).
3. En el repo: **Settings → Pages**.
   - *Source*: `Deploy from a branch`
   - *Branch*: `main` / carpeta `/ (root)` → **Save**.
4. Espera 1–2 minutos: tu página quedará en
   `https://TU-USUARIO.github.io/metal-rotation/`.

Con GitHub CLI:

```bash
cd Metal
git init -b main
git add index.html rotacion.json eventos.json README.md assets tools
git commit -m "Metalstorm rotation timer"
gh repo create metal-rotation --public --source=. --push
gh api -X POST repos/TU-USUARIO/metal-rotation/pages -f "source[branch]=main" -f "source[path]=/"
```

### Vista local

Abre `index.html` con doble clic: funciona, pero algunos navegadores bloquean las máscaras de
los íconos vía `file://`. Para verlo igual que en GitHub Pages usa un servidor local:

```bash
cd Metal
python -m http.server 8137
# abre http://127.0.0.1:8137
```

## Eventos y modos nuevos (sin tocar el HTML)

La página lee **`eventos.json`** en cada carga. Para actualizar un evento o un modo nuevo,
edita ese archivo (puedes hacerlo desde GitHub, incluso desde el móvil) y haz *Commit*:
la página lo toma automáticamente en ~1 minuto, sin recompilar nada.

### Ejemplo: evento de Captura la Bandera

```json
{
  "reglas": [
    {
      "desde": "2026-10-01T00:00:00Z",
      "hasta": "2026-10-08T00:00:00Z",
      "modo": "ctf",
      "titulo": "Evento: Captura la Bandera"
    }
  ]
}
```

- `desde` / `hasta` en UTC (`Z`). Mientras esté activo, la rotación normal se reemplaza por
  ese modo y aparece un **banner de evento** arriba de la tarjeta.
- `modo` puede ser cualquiera ya conocido: `tdm`, `as`, `pt`, `ctf`, `vip`, `elim`.

### Ejemplo: modo nuevo (p. ej. si Starform lanza "Guerra Fría")

```json
{
  "reglas": [
    {
      "desde": "2026-11-01T00:00:00Z",
      "hasta": "2026-11-15T00:00:00Z",
      "modo": "guerra-fria",
      "titulo": "Nuevo modo: Guerra Fría",
      "modoNuevo": {
        "es": "Guerra Fría",
        "en": "Cold War",
        "tag": "CW",
        "color": "#e05a5a",
        "desc": "Descripción del modo.",
        "icon": "assets/icon-cw.png",
        "bg": "assets/bg-cw.png"
      }
    }
  ]
}
```

`icon` y `bg` son opcionales: si no existen, la página se adapta sin imagen. Los íconos del
juego se extraen de `content-bundle` con UnityPy (íconos `ui_game-modes_icons_*` y fondos
`gamemode-background-*`), igual que se hizo con TDM/AS/PT/CTF/VIP.

### Cambios a la rotación base

Si Starform cambia la regla permanente (por ejemplo, deja de alternar AS/PT a y media),
se edita la función `modoPara()` en `index.html`.

> El **Black Market** y otros eventos de tienda/progresión no cambian la rotación de
> modos, así que no requieren cambios en la página.

## Vista en celular e "instalar como app"

La página es 100% responsive (probada en 320, 360, 390 px y escritorio): tipografía fluida,
filas de dos líneas con el mapa debajo del modo, y botones/etiquetas adaptados al tacto.

Además puede **instalarse como app** (PWA) desde el celular:

- **Android (Chrome)**: abre la página → menú ⋮ → **Añadir a pantalla de inicio** → *Instalar*.
- **iPhone (Safari)**: abre la página → botón Compartir → **Añadir a pantalla de inicio**.
- Quedará el ícono del juego (modo TDM) y se abrirá a pantalla completa, sin barra del navegador.

Archivos que lo hacen posible: `manifest.json` + `assets/icon-180.png` (iOS),
`assets/icon-192.png` y `assets/icon-512.png` (Android).

## Personalización

Todo está dentro de `index.html`:

- **`MODES`**: nombres (ES/EN), etiqueta, color, ícono, fondo y descripción de cada modo.
- **`OVERRIDES`**: fuerza un modo en un rango de fechas para eventos/LTM:
  ```js
  const OVERRIDES = [
    { desde: '2026-10-01T00:00:00Z', hasta: '2026-10-08T00:00:00Z', modo: 'ctf' }
  ];
  ```
- **`modoPara()`**: si Starform cambia la rotación base, edita esta función
  (recibe una fecha `Date` en UTC y devuelve `'tdm' | 'as' | 'pt' | 'ctf' | 'vip' | 'elim'`).

## Archivos

```
Metal/
├── index.html          # la página (HTML + CSS + JS, sin dependencias)
├── manifest.json       # manifiesto PWA (instalable como app)
├── rotacion.json       # calendario semanal de modo+mapa (generado del juego)
├── eventos.json        # reglas de eventos/LTM (editable sin tocar el HTML)
├── README.md
├── tools/
│   └── actualizar-rotacion.py   # regenera rotacion.json tras un parche del juego
├── bot-whatsapp/                # bot de WhatsApp para el escuadrón (ver su README)
│   ├── bot.js                   # publica la rotación en el grupo + comandos
│   ├── package.json             # dependencias (Baileys)
│   ├── config.ejemplo.json      # plantilla de configuración
│   └── README.md                # instalación y uso
├── escuadron/                   # página del escuadrón (escuadronvengance.cl, ver su README)
│   ├── index.html               # hero, rotación en vivo, roster de 30, únete
│   ├── jugadores.json           # roster: edítalo para agregar pilotos
│   ├── rotacion.json            # copia de respaldo del calendario semanal
│   ├── CNAME                    # dominio (vale en la raíz del repo publicado)
│   ├── README.md                # guía de edición y despliegue
│   └── assets/                  # logos, íconos y wallpapers (copia independiente)
└── assets/
    ├── icon-192.png    # íconos de la app (pantalla de inicio / PWA)
    ├── icon-512.png
    ├── icon-180.png
    ├── icon-tdm.png    # íconos de modo (máscaras blancas, se tiñen por CSS)
    ├── icon-as.png
    ├── icon-pt.png
    ├── icon-ctf.png
    ├── icon-vip.png
    ├── icon-elim.png
    ├── bg-tdm.png      # fondos oficiales de tarjeta por modo
    ├── bg-as.png       # (generado, ver sección Imágenes)
    ├── bg-pt.png
    ├── bg-ctf.png
    ├── bg-vip.png
    ├── wall-arctic.jpg   # pantallas de carga de cada mapa (fondo de franja + miniaturas)
    ├── wall-canyon.jpg
    ├── wall-countdown.jpg
    ├── wall-seastacks.jpg
    ├── wall-stoneforest.jpg
    └── wall-volcano.jpg  # (el mapa Volcano corresponde al asset Crucible)
    ├── logo-metalstorm.png  # wordmark oficial del juego (encabezado)
    ├── logo-starform.png    # logo del estudio (pie de página)
    └── favicon.png          # emblema del rayo (pestaña del navegador)
```

## Aviso

Proyecto de fans, sin afiliación con Starform. La hora local que se muestra corresponde
al navegador del visitante.
