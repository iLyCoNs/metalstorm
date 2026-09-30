# Metal — Temporizador de rotación de modos de Metalstorm

Página web estática que muestra en tiempo real el modo activo de **Metalstorm** y una
cuenta regresiva a la siguiente rotación, igual que el temporizador del juego.

## Cómo funciona

La rotación del juego cambia **cada 30 minutos**, alineada al reloj **UTC**:

| Franja (UTC) | Modo |
|---|---|
| `HH:00 – HH:29` | Team Deathmatch (TDM) |
| `HH:30 – HH:59`, hora **par** | Air Superiority (AS) |
| `HH:30 – HH:59`, hora **impar** | Priority Target (PT) |

Ejemplo: `23:00` TDM → `23:30` PT → `00:00` TDM → `00:30` AS.

La tabla fue **verificada en vivo** contra el cliente (capturas del hangar y partidas:
23:00 UTC = TDM, 23:30 UTC = Priority Target, 00:00 UTC = TDM).

>Durante eventos o modos limitados (p. ej. Captura la Bandera) el juego puede reemplazar
>franjas. Para eso existe el arreglo `OVERRIDES` en `index.html`.

## Imágenes

Los íconos y fondos de modos se extrajeron de la instalación del propio juego
(`content-bundle`, texturas `ui_game-modes_icons_*`) y se usan con fines informativos de fans.
El fondo de **Air Superiority** no existe como asset oficial: se generó a partir del patrón
triangular oficial de Team Deathmatch con un giro de tono, para mantener el estilo del juego.

Todas las imágenes son propiedad de **Starform**; este proyecto no está afiliado y no debe
usarse comercialmente.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (público), por ejemplo `metal-rotation`.
2. Sube **todo el contenido de esta carpeta** (`index.html`, `README.md` y `assets/`).
3. En el repo: **Settings → Pages**.
   - *Source*: `Deploy from a branch`
   - *Branch*: `main` / carpeta `/ (root)` → **Save**.
4. Espera 1–2 minutos: tu página quedará en
   `https://TU-USUARIO.github.io/metal-rotation/`.

Con GitHub CLI:

```bash
cd Metal
git init -b main
git add index.html README.md assets
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
├── README.md
└── assets/
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
    └── bg-vip.png
```

## Aviso

Proyecto de fans, sin afiliación con Starform. La hora local que se muestra corresponde
al navegador del visitante.
