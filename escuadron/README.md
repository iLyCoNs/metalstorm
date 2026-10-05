# Escuadrón Vengance — página del escuadrón

Página del escuadrón (diseño inspirado en Metalstorm): hero, rotación en vivo,
**roster de 30 pilotos** con buscador y filtros por rol, requisitos y postulación.
Todo estático, sin dependencias: funciona en GitHub Pages y en celular.

## Agregar / editar pilotos

Edita **`jugadores.json`** (puedes hacerlo desde la web de GitHub, incluso del móvil)
y haz *Commit*: los cambios aparecen en ~1 minuto.

```json
{
  "cupos": 30,
  "jugadores": [
    {
      "callsign": "DEUS VULT",
      "tag": "[FACH]",
      "rol": "lider",
      "lider": true,
      "nivel": 156,
      "avion": "MiG-29 Fulcrum",
      "pais": "CL",
      "estado": "activo",
      "discord": "LyCoNs",
      "avatar": ""
    }
  ]
}
```

- `rol`: `lider`, `interceptor`, `cazabombardero`, `reconocimiento`, `frontline`,
  `soporte` o `comodin`. (Los filtros se generan solos con los roles que existan.)
- `estado`: `activo`, `ausente` o `inactivo`.
- `avatar`: URL de una foto (opcional). Vacío = iniciales con el color del rol.
- `lider: true` muestra la estrella ★. `discord`, `avion`, `nivel` y `pais` son opcionales.
- Los cupos no ocupados se muestran solos como **"CUPO LIBRE"** hasta completar 30.

## Configurar Discord y contacto

Arriba del `<script>` de `index.html`, en `CONFIG`:

```js
discord: 'https://discord.gg/xxxxxxx',  // invita al Discord del escuadrón
contacto: '',                            // o un correo, si prefieren email
```

Eso activa los botones "Unirse al escuadrón" y "Postular". Sin configurar, aparecen
deshabilitados con un aviso.

## Rotación en vivo

El widget lee `../rotacion.json` (el del temporizador principal) y si no lo encuentra
usa su copia local `rotacion.json`. Al publicar parches del juego, regenera con
`../tools/actualizar-rotacion.py` y copia el JSON nuevo también aquí
(o deja que use el `../rotacion.json` del mismo sitio).

## Publicar en escuadronvengance.cl

1. **Opción A (recomendada para el dominio)**: crea un repositorio nuevo (ej. `escuadron`),
   sube **solo el contenido de esta carpeta** (`index.html`, `jugadores.json`,
   `rotacion.json`, `assets/`, `CNAME`) a su raíz.
2. En el repo: **Settings → Pages** → *Deploy from a branch* → `main` / `/ (root)` → Save.
3. En tu proveedor DNS crea los registros para el dominio raíz (GitHub lo indica en
   Settings → Pages → *Add a domain*): normalmente 4 registros `A` a las IPs de
   GitHub Pages + (opcional) un `CNAME` de `www` a `TU-USUARIO.github.io`.
4. GitHub emite el certificado HTTPS solo (unos minutos). El archivo `CNAME` de esta
   carpeta ya trae `escuadronvengance.cl`.

> El `CNAME` **no hace nada** mientras esta carpeta sea una subcarpeta
> (`.../metalstorm/escuadron/`); solo funciona en la raíz del repo publicado.

## Archivos

```
escuadron/
├── index.html        # la página (HTML + CSS + JS, sin dependencias)
├── jugadores.json    # roster: edítalo para agregar pilotos
├── rotacion.json     # copia de respaldo del calendario semanal
├── CNAME             # dominio (solo vale en la raíz del repo publicado)
├── README.md
└── assets/           # logos, íconos de modo y wallpapers
```

## Aviso

Proyecto de fans, sin afiliación con Starform. Marcas e imágenes pertenecen a sus
dueños y se usan con fines informativos para la comunidad.
