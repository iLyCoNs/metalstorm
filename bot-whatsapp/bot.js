/* ============================================================================
 * Bot de WhatsApp del escuadrón — Rotación de Metalstorm
 * ----------------------------------------------------------------------------
 * Publica en el grupo el modo + mapa actual de Metalstorm en cada cambio de
 * franja, avisa N minutos antes, y responde comandos (!modo, !siguiente...).
 *
 * NO se conecta al juego: la rotación es determinista y se calcula con reloj
 * + rotacion.json (+ eventos.json para eventos/LTM), los mismos datos de la web.
 *
 * Instalación:  npm install
 * Uso:          node bot.js        (luego escanea el QR con el WhatsApp
 *                                   del número que usará el bot)
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

/* ------------------------------ datos ---------------------------------- */

const DIR_DATOS = __dirname;
const RUTA_ROTACION = process.env.ROTACION_JSON || path.join(DIR_DATOS, '..', 'rotacion.json');
const RUTA_EVENTOS = process.env.EVENTOS_JSON || path.join(DIR_DATOS, '..', 'eventos.json');
const RUTA_CONFIG = path.join(DIR_DATOS, 'config.json');

function leerJSON(ruta, defecto) {
  try {
    return JSON.parse(fs.readFileSync(ruta, 'utf8'));
  } catch (e) {
    return defecto;
  }
}

let CONFIG = Object.assign(
  { grupo: '', avisarMinutosAntes: 5, zonaHoraria: 'America/Santiago', prefijo: '!' },
  leerJSON(RUTA_CONFIG, {})
);

const MODES = {
  tdm:  { es: 'COMBATE A MUERTE POR EQUIPOS', en: 'Team Deathmatch' },
  as:   { es: 'SUPERIORIDAD AÉREA',           en: 'Air Superiority' },
  pt:   { es: 'OBJETIVO PRIORITARIO',         en: 'Priority Target' },
  ctf:  { es: 'CAPTURA LA BANDERA',           en: 'Capture the Flag' },
  vip:  { es: 'COMBATE A MUERTE VIP',         en: 'VIP Deathmatch' },
  elim: { es: 'ELIMINACIÓN',                  en: 'Elimination' }
};

const MAPAS = {
  Arctic:      { day: 'RUMBO AL HIELO',     night: 'NOCHE RUMBO AL HIELO',   snow: 'NIEVE RUMBO AL HIELO' },
  Canyon:      { day: 'CAÑÓN CARMESÍ',      night: 'NOCHE DE CAÑÓN CARMESÍ', sunrise: 'SONRISA CAÑÓN CARMESÍ' },
  Seastacks:   { day: 'TORMENTA DESATADA',  night: 'NOCHE DE TORMENTA DESATADA' },
  Stoneforest: { day: 'BOSQUE DE PIEDRA',   night: 'NOCHE DEL BOSQUE DE PIEDRA' },
  Volcano:     { day: 'CRISOL',             night: 'NOCHE DE CRISOL' },
  Countdown:   { day: 'CUENTA ATRÁS',       night: 'NOCHE DE CUENTA ATRÁS' },
  Enclave:     { day: 'ENCLAVE' }
};

const MODO_IDS = {
  deathmatch: 'tdm', control: 'as', prioritytarget: 'pt',
  capturetheflag: 'ctf', elimination: 'elim', vipdeathmatch: 'vip'
};

const SLOT_MS = 30 * 60 * 1000;
let ROTACION = leerJSON(RUTA_ROTACION, null);
const REGLAS = []; // { ini, fin, modo, titulo }

function nombreMapa(mapa, variante) {
  const M = MAPAS[mapa];
  if (M) return M[variante] || M.day || mapa;
  return mapa + (variante && variante !== 'day' ? ' (' + variante + ')' : '');
}

function registrarModo(id) {
  if (!MODES[id] && id) MODES[id] = { es: String(id).toUpperCase(), en: String(id) };
}

function agregarRegla(r) {
  try {
    const ini = Date.parse(r.desde);
    const fin = Date.parse(r.hasta);
    if (isNaN(ini) || isNaN(fin) || fin <= ini || !r.modo) return;
    REGLAS.push({ ini, fin, modo: r.modo, titulo: r.titulo || '' });
  } catch (e) { /* regla inválida: se ignora */ }
}

(function cargarEventos() {
  const j = leerJSON(RUTA_EVENTOS, null);
  if (j && Array.isArray(j.reglas)) j.reglas.forEach(agregarRegla);
})();

function slotDe(fecha) {
  if (!ROTACION || !Array.isArray(ROTACION.slots) || !ROTACION.slots.length) return null;
  const n = ROTACION.slots.length;
  const seg = Math.floor(fecha.getTime() / 1000);
  let i = Math.floor((seg - ROTACION.referenceUnixSeconds) / ROTACION.slotSeconds) % n;
  if (i < 0) i += n;
  const partes = String(ROTACION.slots[i]).split(':');
  const mapa = partes[0], variante = partes[1] || 'day', modo = partes[2] || 'deathmatch';
  let modoId = MODO_IDS[modo];
  if (!modoId) { registrarModo(modo); modoId = modo; }
  return { indice: i, mapa, variante, modoId, nombre: nombreMapa(mapa, variante) };
}

function modoPara(fecha) {
  const t = fecha.getTime();
  for (const r of REGLAS) {
    if (t >= r.ini && t < r.fin) return r.modo;
  }
  const s = slotDe(fecha);
  if (s) return s.modoId;
  const h = fecha.getUTCHours(), m = fecha.getUTCMinutes();
  if (m < 30) return 'tdm';
  return (h % 2 === 0) ? 'as' : 'pt';
}

function inicioFranja(fecha) {
  const d = new Date(fecha);
  d.setUTCMinutes(d.getUTCMinutes() >= 30 ? 30 : 0, 0, 0);
  return d;
}

/* --------------------------- formato ----------------------------------- */

function fmtHoraLocal(fecha) {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      timeZone: CONFIG.zonaHoraria, hour: '2-digit', minute: '2-digit', hour12: false
    }).format(fecha);
  } catch (e) {
    return fecha.toISOString().slice(11, 16) + ' UTC';
  }
}

function mmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function lineaModo(modoId) {
  const info = MODES[modoId] || { es: String(modoId).toUpperCase(), en: String(modoId) };
  return info.es;
}

function mensajeCambio(ahora) {
  const inicio = inicioFranja(ahora);
  const fin = new Date(inicio.getTime() + SLOT_MS);
  const modo = modoPara(inicio);
  const s = slotDe(inicio);
  const siguiente = modoPara(fin);
  const sSig = slotDe(fin);
  return [
    '*METALSTORM — ROTACIÓN*',
    'AHORA: ' + lineaModo(modo),
    'MAPA: ' + (s ? s.nombre : '—'),
    'Cambia en ' + mmss(fin - ahora) + ' → ' + lineaModo(siguiente) +
      ' en ' + (sSig ? sSig.nombre : '—') + ' (' + fmtHoraLocal(fin) + ')'
  ].join('\n');
}

function mensajeAviso(ahora) {
  const fin = new Date(inicioFranja(ahora).getTime() + SLOT_MS);
  const siguiente = modoPara(fin);
  const sSig = slotDe(fin);
  return [
    '*METALSTORM — AVISO*',
    'En ' + mmss(fin - ahora) + ' cambia a ' + lineaModo(siguiente) +
      ' en ' + (sSig ? sSig.nombre : '—') + ' (' + fmtHoraLocal(fin) + ')'
  ].join('\n');
}

function mensajeActual(ahora) {
  const inicio = inicioFranja(ahora);
  const fin = new Date(inicio.getTime() + SLOT_MS);
  const modo = modoPara(inicio);
  const s = slotDe(inicio);
  return 'AHORA: ' + lineaModo(modo) + ' en ' + (s ? s.nombre : '—') +
    ' · cambia en ' + mmss(fin - ahora);
}

function mensajeSiguiente(ahora) {
  const fin = new Date(inicioFranja(ahora).getTime() + SLOT_MS);
  const siguiente = modoPara(fin);
  const sSig = slotDe(fin);
  return 'SIGUIENTE: ' + lineaModo(siguiente) + ' en ' + (sSig ? sSig.nombre : '—') +
    ' a las ' + fmtHoraLocal(fin);
}

function mensajeHoy(ahora) {
  const lineas = ['*ROTACIÓN DE HOY*'];
  const inicio = inicioFranja(ahora);
  const finDia = new Date(ahora);
  try {
    const partes = new Intl.DateTimeFormat('es-CL', {
      timeZone: CONFIG.zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(ahora);
    const get = t => (partes.find(p => p.type === t) || {}).value;
    finDia.setHours(23, 59, 59, 999);
    void get;
  } catch (e) {
    finDia.setHours(23, 59, 59, 999);
  }
  let d = new Date(inicio.getTime());
  let n = 0;
  while (d <= finDia && n < 40) {
    const f = new Date(d.getTime() + SLOT_MS);
    const modo = modoPara(d);
    const s = slotDe(d);
    lineas.push(fmtHoraLocal(d) + ' · ' + lineaModo(modo) + ' en ' + (s ? s.nombre : '—'));
    d = f;
    n++;
  }
  return lineas.join('\n');
}

function mensajeMapa(ahora) {
  const inicio = inicioFranja(ahora);
  const fin = new Date(inicio.getTime() + SLOT_MS);
  const s = slotDe(inicio);
  const sSig = slotDe(fin);
  return 'MAPA ACTUAL: ' + (s ? s.nombre : '—') +
    '\nPRÓXIMO MAPA: ' + (sSig ? sSig.nombre + ' (' + fmtHoraLocal(fin) + ')' : '—') +
    '\nCambia en ' + mmss(fin - ahora);
}

const AYUDA =
  '*METALSTORM BOT — comandos*\n' +
  '!modo — modo y mapa actuales\n' +
  '!mapa — mapa actual y próximo\n' +
  '!siguiente — próxima franja\n' +
  '!hoy — rotación restante de hoy\n' +
  '!ayuda — esta ayuda';

/* -------------------- estado en memoria (testeable) --------------------- */

let ahoraFijo = null;          // Date|number|null (solo tests)
let enviarFn = null;           // async (texto) => void (solo tests)
let destinoJid = null;         // JID del grupo
let ultimoSlot = -1;
let avisadoSlot = -1;

const ahora = () => (ahoraFijo !== null ? new Date(ahoraFijo) : new Date());

async function enviar(texto) {
  if (enviarFn) return enviarFn(texto);
  if (!destinoJid || !sockGlobal) return;
  await sockGlobal.sendMessage(destinoJid, { text: texto });
}

async function revisarRotacion() {
  const t = ahora();
  const s = slotDe(t);
  const idx = s ? s.indice : Math.floor(t.getTime() / SLOT_MS);
  const inicio = inicioFranja(t);
  const fin = new Date(inicio.getTime() + SLOT_MS);
  const restante = fin - t;

  if (ultimoSlot !== -1 && idx !== ultimoSlot) {
    ultimoSlot = idx;
    avisadoSlot = -1;
    await enviar(mensajeCambio(t));
    return;
  }
  if (ultimoSlot === -1) ultimoSlot = idx;

  const avisarMs = (CONFIG.avisarMinutosAntes || 5) * 60 * 1000;
  if (restante <= avisarMs && avisadoSlot !== idx) {
    avisadoSlot = idx;
    await enviar(mensajeAviso(t));
  }
}

async function atenderComando(texto) {
  const p = (CONFIG.prefijo || '!');
  const t = ahora();
  const cmd = String(texto || '').trim().toLowerCase();
  if (cmd === p + 'modo' || cmd === p + 'ahora') return mensajeActual(t);
  if (cmd === p + 'mapa' || cmd === p + 'mapas' || cmd === p + 'map') return mensajeMapa(t);
  if (cmd === p + 'siguiente' || cmd === p + 'proximo' || cmd === p + 'próximo') return mensajeSiguiente(t);
  if (cmd === p + 'hoy') return mensajeHoy(t);
  if (cmd === p + 'ayuda' || cmd === p + 'help' || cmd === p + 'comandos') return AYUDA;
  return null;
}

/* ------------------------- conexión WhatsApp ---------------------------- */

let sockGlobal = null;

async function resolverGrupo(sock) {
  try {
    const grupos = await sock.groupFetchAllParticipating();
    const buscado = String(CONFIG.grupo || '').toLowerCase();
    for (const [jid, g] of Object.entries(grupos)) {
      if (String((g && g.subject) || '').toLowerCase() === buscado) return jid;
    }
    console.log('Grupo "' + CONFIG.grupo + '" no encontrado. Grupos disponibles:');
    for (const [, g] of Object.entries(grupos)) console.log('  - ' + ((g && g.subject) || '(sin nombre)'));
  } catch (e) {
    console.log('No se pudo listar grupos:', e.message);
  }
  return null;
}

async function iniciar() {
  let baileys, qrcode;
  try {
    baileys = require('@whiskeysockets/baileys');
    qrcode = require('qrcode-terminal');
  } catch (e) {
    console.log('Falta instalar dependencias. Ejecuta:  npm install');
    process.exit(1);
  }
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

  if (!CONFIG.grupo) {
    console.log('Configura el nombre del grupo en config.json (copia config.ejemplo.json).');
    process.exit(1);
  }

  const { state, saveCreds } = await useMultiFileAuthState('auth');
  let version = undefined;
  try {
    const v = await fetchLatestBaileysVersion();
    version = v.version;
  } catch (e) { /* sigue sin version */ }

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['Metalstorm Bot', 'Chrome', '1.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false
  });
  sockGlobal = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u || {};
    if (qr) {
      console.log('Escanea este QR con el WhatsApp del número del bot:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const codigo = (lastDisconnect && lastDisconnect.error && lastDisconnect.error.output || {}).statusCode;
      if (codigo !== DisconnectReason.loggedOut) {
        console.log('Conexión cerrada, reconectando...');
        setTimeout(iniciar, 5000);
      } else {
        console.log('Sesión cerrada. Borra la carpeta auth/ y vuelve a escanear el QR.');
        process.exit(0);
      }
    }
    if (connection === 'open') {
      console.log('Conectado a WhatsApp.');
      destinoJid = await resolverGrupo(sock);
      if (destinoJid) {
        console.log('Grupo OK, monitoreando rotación...');
        ultimoSlot = -1;
        avisadoSlot = -1;
        setInterval(() => { revisarRotacion().catch(e => console.log('revisar:', e.message)); }, 20000);
        await revisarRotacion().catch(() => {});
      } else {
        console.log('Ajusta "grupo" en config.json y reinicia.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      for (const m of messages || []) {
        if (!m || !m.message || m.key.fromMe) continue;
        const esGrupo = destinoJid && m.key.remoteJid === destinoJid;
        if (!esGrupo) continue;
        const texto = m.message.conversation || (m.message.extendedTextMessage && m.message.extendedTextMessage.text) || '';
        const resp = await atenderComando(texto);
        if (resp) await sock.sendMessage(destinoJid, { text: resp }, { quoted: m });
      }
    } catch (e) {
      console.log('comando:', e.message);
    }
  });
}

module.exports = {
  modoPara, slotDe, inicioFranja, mensajeCambio, mensajeAviso,
  mensajeActual, mensajeSiguiente, mensajeHoy, atenderComando,
  revisarRotacion, agregarRegla,
  __fijarAhora: v => { ahoraFijo = v; },
  __fijarEnviador: fn => { enviarFn = fn; },
  __fijarDestino: j => { destinoJid = j; },
  __resetEstado: () => { ultimoSlot = -1; avisadoSlot = -1; },
  __config: CONFIG, MODES, MAPAS
};

if (require.main === module) {
  iniciar().catch(e => { console.log('Error fatal:', e.message); process.exit(1); });
}
