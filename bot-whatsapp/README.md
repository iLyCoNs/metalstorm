# Bot de WhatsApp del escuadrón

Publica automáticamente en el grupo de WhatsApp la **rotación de modos y mapas de
Metalstorm** (modo actual + mapa + cuenta regresiva), avisa N minutos antes de cada
cambio y responde comandos. **No se conecta al juego**: calcula todo con reloj +
`../rotacion.json` (+ `../eventos.json` para eventos), los mismos datos de la web.

## Qué hace

- Cada 30 minutos (al cambiar la franja) publica:
  `AHORA: COMBATE A MUERTE POR EQUIPOS en NIEVE RUMBO AL HIELO · cambia en 30:00 → ...`
- N minutos antes del cambio publica un **aviso** (configurable, por defecto 5).
- Comandos en el grupo (prefijo configurable, por defecto `!`):
  - `!modo` — modo y mapa actuales + cuenta regresiva
  - `!mapa` — mapa actual y próximo mapa
  - `!siguiente` — próxima franja
  - `!hoy` — rotación restante del día
  - `!ayuda` — lista de comandos

## Instalación (Windows)

Requiere [Node.js](https://nodejs.org/) 18+.

```bat
cd bot-whatsapp
copy config.ejemplo.json config.json
notepad config.json
```

Edita `config.json`:
- `grupo`: **nombre exacto** del grupo de WhatsApp del escuadrón.
- `avisarMinutosAntes`: minutos previos al cambio para avisar (ej. `5`).
- `zonaHoraria`: `America/Santiago` (u otra si aplica).
- `prefijo`: `!` (o el que prefieran).

```bat
npm install
node bot.js
```

La primera vez muestra un **QR en la consola**: escanéalo con el WhatsApp del número que
usará el bot (Ajustes → Dispositivos vinculados). La sesión queda guardada en `auth/`,
no hay que escanear de nuevo.

## Importante: número y riesgos

- Usa **Baileys**, una librería **no oficial** (automatiza una cuenta real).
- WhatsApp **puede suspender el número** por automatización. Riesgo bajo en un grupo
  chico con poco volumen, pero **existe**: usa un **número secundario**, nunca tu
  número personal principal.
- Si la sesión se cierra (`loggedOut`), borra la carpeta `auth/` y vuelve a escanear.

## Mantenerlo 24/7

El bot debe estar corriendo para publicar. Opciones:

1. **Tu PC** (más simple): que inicie con Windows con el Programador de tareas:
   `node C:\...\bot-whatsapp\bot.js` al iniciar sesión (se reconecta solo si se cae).
2. **Raspberry Pi / PC viejo** encendido siempre.
3. **VPS gratuito**: Oracle Cloud (Always Free) o similar con Ubuntu + `pm2`/`systemd`.

Con el PC apagado el bot no publica; al encenderlo retoma solo.

## Actualizar datos

El bot lee `../rotacion.json` y `../eventos.json` del repo al arrancar: para reflejar
eventos o una rotación nueva tras un parche, actualiza esos archivos y **reinicia** el bot.
(Si el repo se actualiza con `git pull`, basta reiniciar.)

## Archivos

```
bot-whatsapp/
├── bot.js               # el bot (lógica + conexión)
├── package.json         # dependencias (@whiskeysockets/baileys, qrcode-terminal)
├── config.ejemplo.json  # plantilla de configuración
├── config.json          # TU configuración (no se sube a git)
└── auth/                # sesión de WhatsApp (no se sube a git, se crea solo)
```
