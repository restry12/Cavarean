/* =========================================================
   SABERES · Interfaz
   Pantallas del prototipo de diseño + voz (hablar / escuchar).
   Necesita dibujos.js (íconos y retratos) y mock.js.
   ========================================================= */
'use strict';

// ---------- Estado global (mínimo) ----------
let usuario = null;        // persona mayor con sesión
let velocidadVoz = 0.9;    // rate de la voz; «más lento» la baja a 0.75
let guiaActual = null;     // guía que se está siguiendo

// ---------- Estado interno ----------
const CANCELADO = { cancelado: true };   // corta un flujo al cambiar de pantalla
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const ERRORES_MIC = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network'];
let micOk = !!SR;
let modoMock = new URLSearchParams(location.search).get('mock') === '1';
let generacion = 0;        // sube cada vez que se cancela todo
let turnoHabla = 0;        // sube cada vez que se corta la voz
let reconActual = null;    // reconocimiento de voz en curso
let grabando = false;
let relojGrabacion = null;
let pantallaActual = null; // { id, args }
let historial = [];
let estadoRegistro = { paso: 0, respuestas: {} };
let filtroCategoria = 'todas';
let filtroExperiencia = 'Todas';
const pendientes = new Set();

const CATEGORIAS = {
  cocina:    { nombre: 'Cocina', icono: 'bread', bg: '#F6D9C4', fg: '#8E3717' },
  oficios:   { nombre: 'Oficios', icono: 'wrench', bg: '#E6EEDC', fg: '#3F5A24' },
  huerto:    { nombre: 'Jardín', icono: 'leaf', bg: '#DCE8CC', fg: '#2F451A' },
  hogar:     { nombre: 'Manualidades', icono: 'yarn', bg: '#F8E7B9', fg: '#6B4A0E' },
  digital:   { nombre: 'Tecnología', icono: 'phone', bg: '#E3E8EC', fg: '#2B1D14' },
  historias: { nombre: 'Lecciones de vida', icono: 'quote', bg: '#F1E1D3', fg: '#8E3717' }
};
const ESCALAS = [1, 1.11, 1.22];   // A, A+, A++

/* =========================================================
   Utilidades
   ========================================================= */
const $ = (sel) => document.querySelector(sel);
const pausa = (ms) => new Promise(r => setTimeout(r, ms));

// Minúsculas, sin tildes ni signos
function normal(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:"«»()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const listaConY = (a) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const mayus = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const primerNombre = (n) => String(n || '').replace(/^(señora|señor|don|doña)\s+/i, '').split(' ')[0];
const aQuien = (n) => /^el /.test(n) ? 'al ' + n.slice(3) : 'a ' + n;     // «a Rosa», «al Equipo SABERES»
const deQuien = (n) => /^el /.test(n) ? 'del ' + n.slice(3) : 'de ' + n;
// Cómo nombrar a quien escribió una guía: «Rosa», «Don Luis», «el Equipo SABERES»
const nombreAutor = (n) => /^equipo\b/i.test(n || '') ? 'el ' + n : /^(don|doña|señora|señor)\s/i.test(n || '') ? n : primerNombre(n);
const visible = (e) => !!e && !e.closest('[hidden]');
const cat = (g) => CATEGORIAS[g.categoria] || { nombre: mayus(g.categoria || 'Guía'), icono: 'book', bg: '#F6EBDA', fg: '#2B1D14' };
const iconoGuia = (g) => g.icono || cat(g).icono;
const textoAprendieron = (n) => `${Number(n) || 0} aprendieron`;

function leerLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function guardarLocal(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

// Promesa que se rechaza con CANCELADO si se llama a cancelarTodo()
function cancelable(fn) {
  return new Promise((res, rej) => {
    const cancelar = () => rej(CANCELADO);
    pendientes.add(cancelar);
    fn(v => { pendientes.delete(cancelar); res(v); }, e => { pendientes.delete(cancelar); rej(e); });
  });
}

// Corta el flujo si la persona ya se fue a otra pantalla
function vigente(g) {
  if (g !== generacion) throw CANCELADO;
}

// ¿La frase contiene la palabra? (palabras cortas: exactas; largas: como prefijo)
function coincide(n, p) {
  p = normal(p);
  return p.length <= 3 ? new RegExp(`(^|\\s)${p}(\\s|$)`).test(n) : new RegExp(`(^|\\s)${p}`).test(n);
}

// Retrato ilustrado si lo hay; si no, iniciales
function avatar(persona, s = 64) {
  const who = persona && persona.who;
  if (who && PERSONAS[who]) return retrato(who, s);
  if (/^equipo saberes/i.test((persona && (persona.nombre || persona.autor)) || '')) return `<span class="iniciales" aria-hidden="true" style="width:${s}px;height:${s}px">${logo(Math.round(s * 0.62))}</span>`;
  const p = String((persona && (persona.nombre || persona.autor)) || '?').replace(/^(señora|señor|don|doña|equipo)\s+/i, '').split(' ');
  const ini = ((p[0] || '?')[0] + ((p[1] || '')[0] || '')).toUpperCase();
  return `<span class="iniciales" aria-hidden="true" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.38)}px">${esc(ini)}</span>`;
}

/* =========================================================
   Subtítulos y estado (Hablando / Escuchando… / Pensando…)
   ========================================================= */
const ESTADOS = {
  hablando: 'SABERES está leyendo en voz alta',
  escuchando: 'SABERES le escucha · hable con calma, sin apuro',
  pensando: 'Un momento, SABERES está pensando…',
  reposo: 'SABERES le dijo'
};
let ultimoTexto = '';   // lo último que dijo SABERES: siempre se puede leer y volver a escuchar

// La barra de abajo siempre muestra lo último que dijo SABERES y en qué está
function setEstado(tipo, texto) {
  const barra = $('#subtitulos');
  const sp = $('#estado');
  if (tipo === 'hablando' && texto) ultimoTexto = texto;
  const estado = tipo || 'reposo';
  if (!tipo) {
    $('#btn-escuchar-pagina').classList.remove('on');
    $('#btn-escuchar-pagina').setAttribute('aria-pressed', 'false');
    $('#btn-escuchar-joven').classList.remove('on');
  }
  barra.hidden = !ultimoTexto && estado === 'reposo';
  barra.dataset.estado = estado;
  sp.className = 'speaker ' + (estado === 'hablando' || estado === 'reposo' ? '' : estado);
  sp.innerHTML = estado === 'hablando' ? '<span class="eq"><i></i><i></i><i></i></span>'
    : estado === 'escuchando' ? icono('mic', 30) : estado === 'pensando' ? iconoMicrofono('processing', 30) : icono('speaker', 30);
  $('#lectura-titulo').textContent = ESTADOS[estado];
  $('#subtitulo').textContent = ultimoTexto;
  $('#btn-detener').hidden = estado !== 'hablando';
  $('#btn-otra-vez').hidden = estado === 'hablando' || !ultimoTexto;
  // Las barras fijas de abajo suben para no quedar tapadas
  document.documentElement.style.setProperty('--alto-lectura', (barra.hidden ? 0 : barra.offsetHeight) + 'px');
}

function mostrarSubtitulo(texto) {
  ultimoTexto = texto;
  $('#subtitulo').textContent = texto;
}

// Muestra «Pensando…» mientras espera una respuesta
async function pensar(promesa) {
  setEstado('pensando', 'Un momento, por favor…');
  try { return await promesa; } finally { setEstado(null); }
}

/* =========================================================
   Voz: hablar
   ========================================================= */
let vozElegida = null;

function elegirVoz() {
  const voces = speechSynthesis.getVoices();
  vozElegida = voces.find(v => v.lang === 'es-CL')
    || voces.find(v => /^es[-_](419|US|MX|AR|CO)/i.test(v.lang))
    || voces.find(v => /^es/i.test(v.lang))
    || null;
}
if ('speechSynthesis' in window) {
  elegirVoz();
  speechSynthesis.onvoiceschanged = elegirVoz;
}

// Chrome corta frases largas: se lee por trozos
function trozos(texto) {
  const salida = [];
  for (const p of texto.split(/(?<=[.!?…:])\s+/)) {
    if (salida.length && (salida[salida.length - 1] + ' ' + p).length < 160) salida[salida.length - 1] += ' ' + p;
    else salida.push(p);
  }
  return salida.filter(Boolean);
}

// Voz del navegador (respaldo)
function decirNavegador(trozo) {
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(trozo);
    u.lang = 'es-CL';
    if (vozElegida) u.voice = vozElegida;
    u.rate = velocidadVoz;
    let listo = false;
    const fin = () => { if (!listo) { listo = true; clearTimeout(vigia); res(); } };
    // Respaldo por si Chrome no avisa que terminó (no es un límite para la persona)
    const vigia = setTimeout(fin, 3000 + trozo.length * 110 / velocidadVoz);
    u.onend = fin;
    u.onerror = fin;
    speechSynthesis.resume();
    speechSynthesis.speak(u);
  });
}

/* Voz de Mistral Voxtral (vía /api/voz). Si falla, se usa la del navegador.
   ?voz=navegador la desactiva; en modo simulado tampoco se usa. */
let vozIA = new URLSearchParams(location.search).get('voz') !== 'navegador';
let fallasVozIA = 0;
let audioActual = null;    // { audio, fin }
const cacheVoz = new Map(); // texto -> Promise<url del MP3>

function audioIA(trozo) {
  const clave = trozo;
  if (!cacheVoz.has(clave)) {
    const pedido = fetch('/api/voz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: trozo }),
      signal: AbortSignal.timeout(9000)
    }).then(async r => {
      if (!r.ok || !(r.headers.get('Content-Type') || '').startsWith('audio/')) throw new Error('voz ' + r.status);
      return URL.createObjectURL(await r.blob());
    });
    pedido.catch(() => cacheVoz.delete(clave));
    cacheVoz.set(clave, pedido);
  }
  return cacheVoz.get(clave);
}

const usarVozIA = () => vozIA && !modoMock;

function reproducir(url, trozo) {
  return new Promise((res, rej) => {
    const audio = new Audio(url);
    audio.playbackRate = velocidadVoz / 0.9;   // 0.9 = ritmo normal de la voz; «más lento» la baja
    let listo = false;
    const fin = () => { if (!listo) { listo = true; clearTimeout(vigia); if (audioActual?.audio === audio) audioActual = null; res(); } };
    const vigia = setTimeout(fin, 4000 + trozo.length * 120 / velocidadVoz);
    audioActual = { audio, fin };
    audio.onended = fin;
    audio.onerror = fin;
    // Sin un toque previo el navegador puede bloquear el audio: se avisa para usar el respaldo
    audio.play().catch(e => { listo = true; clearTimeout(vigia); audioActual = null; rej(e); });
  });
}

async function decir(trozo, turno) {
  if (usarVozIA()) {
    try {
      const url = await audioIA(trozo);
      if (turno !== turnoHabla) return;
      fallasVozIA = 0;
      return await reproducir(url, trozo);
    } catch (e) {
      if (turno !== turnoHabla) return;
      // Dos fallas seguidas: se queda con la voz del navegador en esta sesión
      if (e?.name !== 'NotAllowedError' && ++fallasVozIA >= 2) {
        vozIA = false;
        console.warn('[SABERES] La voz de Mistral no respondió; uso la del navegador.', e?.message);
      }
    }
  }
  if ('speechSynthesis' in window) return decirNavegador(trozo);
  return pausa(400 + trozo.length * 40);
}

function callar() {
  turnoHabla++;
  if (audioActual) { audioActual.audio.pause(); audioActual.fin(); }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// Lee en voz alta y SIEMPRE muestra el subtítulo
function hablar(texto) {
  texto = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (!texto) return Promise.resolve();
  setEstado('hablando', texto);
  if (!('speechSynthesis' in window) && !usarVozIA()) return pausa(400 + texto.length * 40).then(() => setEstado(null));
  callar();
  const turno = turnoHabla;
  return cancelable(async (resolver) => {
    await pausa(80);
    const partes = trozos(texto);
    for (let i = 0; i < partes.length; i++) {
      if (turno !== turnoHabla) return resolver();
      // Pide el audio del trozo siguiente mientras suena este (sin silencios)
      if (usarVozIA() && partes[i + 1]) audioIA(partes[i + 1]).catch(() => {});
      await decir(partes[i], turno);
    }
    if (turno === turnoHabla) setEstado(null);
    resolver();
  });
}

/* =========================================================
   Voz: escuchar
   ========================================================= */
function detenerEscucha() {
  if (!reconActual) return;
  try { reconActual.abort(); } catch (e) { /* ya estaba detenido */ }
  reconActual = null;
  setEstado(null);
}

// Reconoce una frase (o un relato largo con continuo = true)
function escuchar({ onParcial = null, continuo = false } = {}) {
  if (!micOk) return Promise.reject(new Error('sin-microfono'));
  callar();
  detenerEscucha();
  return new Promise((res, rej) => {
    const r = new SR();
    reconActual = r;
    r.lang = 'es-CL';
    r.interimResults = !!onParcial;
    r.continuous = continuo;
    r.maxAlternatives = 1;
    let final = '', parcial = '', fallo = null;
    r.onresult = (e) => {
      parcial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += (final ? ' ' : '') + t.trim();
        else parcial += t;
      }
      if (onParcial) onParcial((final + ' ' + parcial).trim());
    };
    r.onerror = (e) => {
      fallo = e.error;
      if (ERRORES_MIC.includes(e.error)) micOk = false;
    };
    r.onend = () => {
      if (reconActual === r) { reconActual = null; setEstado(null); }
      const t = (final + ' ' + parcial).trim();
      t ? res(t) : rej(new Error(fallo || 'sin-voz'));
    };
    setEstado('escuchando', continuo ? 'La escucho. Cuando termine, toque el micrófono.' : 'Hable con calma, sin apuro.');
    try { r.start(); } catch (e) { reconActual = null; setEstado(null); rej(e); }
  });
}

/* =========================================================
   Zona de voz: micrófono grande + «Usted dijo» + «Prefiero escribir»
   ========================================================= */
const MIC_ARIA = {
  idle: 'Hablar. Toque el micrófono o presione la barra espaciadora',
  listening: 'Escuchando. Hable con calma',
  processing: 'Un momento, estoy entendiendo lo que dijo',
  done: 'Listo. Toque para hablar de nuevo',
  rec: 'Grabando. Toque para pausar'
};

function construirZona(contenedor, i) {
  const multilinea = contenedor.hasAttribute('data-multilinea');
  const id = 'campo-zona-' + i;
  contenedor.classList.add('zona-voz');
  contenedor.innerHTML = `
    <div class="mic-caja" data-mic-caja>
      <button type="button" class="mic idle" data-mic aria-label="${MIC_ARIA.idle}"><span class="ring"></span><span class="ring r2"></span><span class="ring r3"></span><span class="mic-ico">${iconoMicrofono('idle', 64)}</span></button>
      <p class="mic-etiqueta" data-mic-etiqueta>Toque el micrófono para hablar</p>
      <p class="mic-ayuda">o presione la barra espaciadora</p>
    </div>
    <div class="card oido fade" data-oido role="status" hidden><p class="oido-titulo" data-oido-titulo></p><p class="oido-texto">«<span data-oido-texto></span>»<span class="caret" data-caret hidden></span></p></div>
    <form class="escribir" data-escribir>
      <label for="${id}" style="font-weight: 700" data-escribir-etiqueta>O escriba su respuesta</label>
      <div class="escribir-fila${multilinea ? ' escribir-fila-larga' : ''}">
        ${multilinea ? `<textarea id="${id}" class="field" rows="4" data-campo></textarea>` : `<input id="${id}" class="field" type="text" autocomplete="off" data-campo>`}
        <button type="submit" class="btn btn-p btn-md">${icono('send', 26)}<span data-enviar>Enviar</span></button>
      </div>
    </form>
    <div class="controles controles-centro" data-controles></div>`;
}

function zonaActiva() {
  return [...document.querySelectorAll('.pantalla:not([hidden]) .zona-voz')].find(visible) || null;
}

function micEstado(boton, estado, etiqueta) {
  const grande = !boton.classList.contains('sm');
  boton.className = 'mic ' + estado + (grande ? '' : ' sm');
  boton.setAttribute('aria-label', MIC_ARIA[estado] || MIC_ARIA.idle);
  boton.querySelector('.mic-ico').innerHTML = iconoMicrofono(estado, grande ? 64 : 34);
  const z = boton.closest('.zona-voz');
  if (z && etiqueta) z.querySelector('[data-mic-etiqueta]').textContent = etiqueta;
}

function mostrarOido(z, titulo, texto, escuchando) {
  const caja = z.querySelector('[data-oido]');
  caja.hidden = false;
  caja.querySelector('[data-oido-titulo]').textContent = titulo;
  caja.querySelector('[data-oido-texto]').textContent = texto;
  caja.querySelector('[data-caret]').hidden = !escuchando;
}

function ocultarOido(z) {
  z.querySelector('[data-oido]').hidden = true;
}

// Pide una respuesta por voz o escrita (las dos opciones a la vista). Resuelve { texto, escrito }
function pedirRespuesta({ etiqueta = 'O escriba su respuesta', boton = 'Enviar', continuo = false } = {}) {
  const z = zonaActiva();
  const g = generacion;
  return cancelable((resolver) => {
    let hecho = false, intento = 0, reintentos = 0;
    const mic = z.querySelector('[data-mic]');
    const form = z.querySelector('[data-escribir]');
    const campo = form.querySelector('[data-campo]');
    z.querySelector('[data-escribir-etiqueta]').textContent = etiqueta;
    z.querySelector('[data-enviar]').textContent = boton;
    z.querySelector('[data-controles]').innerHTML = '';
    campo.value = '';
    ocultarOido(z);
    micEstado(mic, 'idle', micOk ? 'Toque el micrófono para hablar' : 'El micrófono no está disponible. Puede escribir aquí abajo.');
    z.querySelector('[data-mic-caja]').classList.toggle('sin-mic', !micOk);

    const fin = (texto, escrito) => {
      if (hecho) return;
      hecho = true;
      intento++;
      detenerEscucha();
      mic.onclick = form.onsubmit = campo.onfocus = campo.oninput = null;
      resolver({ texto, escrito });
    };
    // Si la persona empieza a escribir, el micrófono se pausa
    const pausarVoz = () => {
      if (!mic.classList.contains('listening')) return;
      intento++;
      detenerEscucha();
      ocultarOido(z);
      micEstado(mic, 'idle', 'Escriba con calma y toque «Enviar». O toque el micrófono para hablar.');
    };
    const oir = async () => {
      if (hecho || g !== generacion || !micOk) return;
      const yo = ++intento;
      micEstado(mic, 'listening', continuo ? 'La escucho… Toque el micrófono cuando termine.' : 'La escucho…');
      mostrarOido(z, 'Escuchando…', '', true);
      try {
        const t = await escuchar({ continuo, onParcial: p => { if (yo === intento) mostrarOido(z, 'Escuchando…', p, true); } });
        if (hecho || yo !== intento || g !== generacion) return;
        micEstado(mic, 'processing', 'Un momento…');
        mostrarOido(z, 'Usted dijo:', t, false);
        await pausa(350);
        if (hecho || yo !== intento) return;
        micEstado(mic, 'done', 'Listo. ¿Está bien así?');
        fin(t, false);
      } catch (e) {
        if (hecho || yo !== intento || g !== generacion) return;
        ocultarOido(z);
        if (!micOk) { micEstado(mic, 'idle', 'El micrófono no está disponible. Puede escribir aquí abajo.'); z.querySelector('[data-mic-caja]').classList.add('sin-mic'); campo.focus(); return; }
        if (reintentos++ < 1) return oir();
        micEstado(mic, 'idle', 'No le escuché bien. Toque el micrófono o escriba aquí abajo.');
      }
    };

    mic.onclick = () => {
      if (mic.classList.contains('listening')) {
        // En un relato largo, tocar el micrófono termina
        if (continuo && reconActual) reconActual.stop();
        return;
      }
      reintentos = 0;
      oir();
    };
    campo.onfocus = pausarVoz;
    campo.oninput = pausarVoz;
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = campo.value.trim();
      if (v) fin(v, true); else campo.focus();
    };
    if (micOk) oir();
  });
}

// Si la voz falla, aparece un campo de texto grande
async function escucharConRespaldo(opciones) {
  const r = await pedirRespuesta(opciones);
  return r.texto;
}

/* =========================================================
   Controles: botones de respuesta (también por voz)
   ========================================================= */
function controlesActivos() {
  const z = zonaActiva();
  if (z) return z.querySelector('[data-controles]');
  return [...document.querySelectorAll('.pantalla:not([hidden]) [data-controles]')].find(visible) || null;
}

function limpiarControles() {
  document.querySelectorAll('[data-controles]').forEach(c => { c.innerHTML = ''; });
}

function boton(texto, clase, accion, nombreIcono, despues = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + (clase || '');
  const ico = nombreIcono ? icono(nombreIcono, 28) : '';
  b.innerHTML = despues ? `<span>${esc(texto)}</span>${ico}` : `${ico}<span>${esc(texto)}</span>`;
  if (accion) b.addEventListener('click', accion);
  return b;
}

// Deja los botones a la vista y muestra que la app también escucha
function mostrarControles(caja) {
  const z = caja.closest('.zona-voz');
  if (z) {
    const mic = z.querySelector('[data-mic]');
    if (mic.classList.contains('idle')) micEstado(mic, micOk ? 'listening' : 'idle', micOk ? 'La escucho. También puede tocar un botón.' : 'Toque un botón para responder.');
  }
  const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  caja.scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' });
}

function ponerControles(...nodos) {
  const c = controlesActivos();
  if (!c) return null;
  c.innerHTML = '';
  nodos.forEach(n => c.append(n));
  return c;
}

// Campo chico para responder escribiendo junto a los botones
let numCampo = 0;
function formularioRespuesta(etiqueta, textoBoton, alEnviar, alEscribir) {
  const id = 'resp-' + (++numCampo);
  const f = el(`<form class="escribir escribir-chico"><label for="${id}" style="font-weight: 700">${esc(etiqueta)}</label><div class="escribir-fila"><input id="${id}" class="field" type="text" autocomplete="off"><button type="submit" class="btn btn-s btn-md">${icono('send', 24)}<span>${esc(textoBoton)}</span></button></div></form>`);
  const campo = f.querySelector('input');
  campo.addEventListener('focus', alEscribir);
  campo.addEventListener('input', alEscribir);
  f.addEventListener('submit', (e) => { e.preventDefault(); const v = campo.value.trim(); if (v) alEnviar(v, campo); else campo.focus(); });
  return f;
}

// Muestra opciones y espera un toque, una palabra dicha o escrita. Resuelve el valor elegido
function elegir(opciones, { clasificar = null } = {}) {
  const g = generacion;
  return cancelable((resolver) => {
    let hecho = false, escribiendo = false;
    const caja = controlesActivos();
    const fin = (v) => {
      if (hecho) return;
      hecho = true;
      detenerEscucha();
      if (caja) caja.innerHTML = '';
      if (zona) { const f = zona.querySelector('[data-escribir]'); f.onsubmit = null; f.querySelector('[data-campo]').onfocus = f.querySelector('[data-campo]').oninput = null; }
      resolver(v);
    };
    // Interpreta lo dicho o escrito
    const interpretar = (t) => {
      const n = normal(t);
      const o = opciones.find(op => [...(op.voz || []), op.texto].some(p => coincide(n, p)));
      return o ? o.valor : (clasificar ? clasificar(t) : null);
    };
    const alEscribir = () => { escribiendo = true; detenerEscucha(); };
    const alEnviar = (t, campo) => {
      const v = interpretar(t);
      if (v !== null && v !== undefined) return fin(v);
      campo.value = '';
      campo.placeholder = 'No le entendí. Toque un botón o escriba, por ejemplo, «sí» o «no».';
    };
    const zona = caja && caja.closest('.zona-voz');
    if (caja) {
      caja.innerHTML = '';
      opciones.forEach(o => caja.append(boton(o.texto, o.clase, () => fin(o.valor), o.icono, o.despues)));
      if (zona) {
        // En las pantallas con micrófono, el campo de la zona sirve para responder
        const f = zona.querySelector('[data-escribir]');
        const campo = f.querySelector('[data-campo]');
        campo.value = '';
        zona.querySelector('[data-escribir-etiqueta]').textContent = 'O escriba su respuesta';
        campo.onfocus = campo.oninput = alEscribir;
        f.onsubmit = (e) => { e.preventDefault(); const v = campo.value.trim(); if (v) alEnviar(v, campo); };
      } else {
        caja.append(formularioRespuesta('O escriba su respuesta', 'Enviar', alEnviar, alEscribir));
      }
      mostrarControles(caja);
    }
    (async () => {
      while (!hecho && g === generacion && micOk) {
        if (escribiendo) { await pausa(400); continue; }
        try {
          const t = await escuchar();
          if (hecho || g !== generacion) return;
          const v = interpretar(t);
          if (v !== null && v !== undefined) fin(v);
        } catch (e) { await pausa(300); }
      }
    })();
  });
}

/* ---------- Confirmar: voz («sí», «bueno», «ya», «dale», «claro») o botones ---------- */
function clasificarSiNo(t) {
  const n = normal(t);
  if (/^(no|nop|tampoco|para nada)\b/.test(n) || /\b(repet|repit|corregir|corrige|cambiar|otra vez|esta mal)/.test(n)) return false;
  if (/\b(si|bueno|ya|dale|claro|correcto|esta bien|ok|okey|perfecto|exacto|de acuerdo|obvio|por supuesto)\b/.test(n)) return true;
  return null;
}

function confirmar({ si = 'Sí', no = 'No', iconoSi = 'check', iconoNo = 'repeat', vozSi = [], vozNo = [] } = {}) {
  return elegir([
    { texto: si, clase: 'btn-p', icono: iconoSi, valor: true, voz: vozSi },
    { texto: no, clase: 'btn-s', icono: iconoNo, valor: false, voz: vozNo }
  ], { clasificar: clasificarSiNo });
}

/* ---------- Esperar una orden: Listo, Repita, Más lento, No entendí ---------- */
const ORDENES = [
  { tipo: 'listo', texto: 'Listo, siguiente', clase: 'btn-p', icono: 'check' },
  { tipo: 'repetir', texto: 'Repita', clase: 'btn-s btn-md', icono: 'repeat' },
  { tipo: 'lento', texto: 'Más lento', clase: 'btn-s btn-md', icono: 'slow' },
  { tipo: 'duda', texto: 'No entendí', clase: 'btn-s btn-md', icono: 'help' }
];

function clasificarOrden(t) {
  const n = normal(t);
  if (/\b(esperame|espere|espera|un momento|un rato|todavia no|aun no|no estoy list)/.test(n)) return 'esperar';
  if (/\b(lento|lenta|despacio|despacito)\b/.test(n)) return 'lento';
  if (/\b(repet|repit|otra vez|de nuevo)/.test(n)) return 'repetir';
  if (/\bno (entendi|entiendo|comprendo|cache|capte)\b/.test(n)) return 'duda';
  if (/^(ya|listo|lista|siguiente|sigue|sigamos|avanza|avancemos|continua|continuemos|hecho|ok|okey|termine|vamos|perfecto)\b/.test(n)
    || /\b(listo|lista|siguiente)\b/.test(n)) return 'listo';
  return 'duda';
}

// Carrera entre la voz, los botones y lo escrito. Resuelve { tipo, texto }
function esperarOrden() {
  const g = generacion;
  return cancelable((resolver) => {
    let hecho = false, escribiendo = false;
    const caja = controlesActivos();
    const fin = (orden) => {
      if (hecho) return;
      hecho = true;
      detenerEscucha();
      caja.innerHTML = '';
      resolver(orden);
    };
    caja.innerHTML = '';
    ORDENES.forEach(o => caja.append(boton(o.texto, o.clase, () => fin({ tipo: o.tipo, texto: o.tipo === 'duda' ? 'No entendí' : '' }), o.icono)));
    // Siempre se puede escribir: «listo», «repita» o una duda
    caja.append(formularioRespuesta('O escriba «listo» o su duda', 'Enviar',
      (t) => fin({ tipo: clasificarOrden(t), texto: t }),
      () => { escribiendo = true; detenerEscucha(); }));
    mostrarControles(caja);

    (async () => {
      while (!hecho && g === generacion && micOk) {
        if (escribiendo) { await pausa(400); continue; }
        try {
          const t = await escuchar();
          if (!hecho && g === generacion) fin({ tipo: clasificarOrden(t), texto: t });
        } catch (e) { await pausa(300); }
      }
    })();
  });
}

/* =========================================================
   Grabar hasta que toque «Terminé» (pantalla Enseñar)
   ========================================================= */
function grabarHastaQueToque() {
  const g = generacion;
  const btnT = $('#btn-terminar'), btnP = $('#btn-pausa'), caja = $('#transcripcion'), mic = $('#e1-mic');
  let segundos = 0, base = '', final = '', pausado = true;
  const dos = (n) => (n < 10 ? '0' : '') + n;

  return cancelable((resolver) => {
    const pintarTiempo = () => { $('#e1-tiempo').textContent = dos(Math.floor(segundos / 60)) + ':' + dos(segundos % 60); };
    const pintar = (parcial = '') => {
      caja.value = (base + ' ' + final + ' ' + parcial).replace(/\s+/g, ' ').trim();
      caja.scrollTop = caja.scrollHeight;
      btnT.disabled = !caja.value.trim();
    };
    const pintarEstado = () => {
      micEstado(mic, pausado ? 'idle' : 'rec');
      $('#e1-punto').hidden = pausado;
      $('#e1-estado').textContent = pausado ? (segundos ? 'En pausa' : 'Listo para grabar') : 'Grabando';
      $('#e1-onda').classList.toggle('live', !pausado);
      btnP.hidden = !micOk;
      btnP.innerHTML = pausado
        ? `${icono('mic', 26)}<span>${segundos ? 'Seguir grabando' : 'Empezar a grabar'}</span>`
        : `${icono('pause', 26)}<span>Pausar</span>`;
    };
    const iniciar = () => {
      if (pausado || g !== generacion) return;
      const r = new SR();
      reconActual = r;
      r.lang = 'es-CL';
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let parcial = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t.trim() + '. ';
          else parcial += t;
        }
        pintar(parcial);
      };
      r.onerror = (e) => {
        if (ERRORES_MIC.includes(e.error)) { micOk = false; pausar(); $('#ensenar-aviso-mic').hidden = false; }
      };
      // Chrome corta la grabación cada cierto rato: se reanuda sola
      r.onend = () => {
        if (reconActual === r) reconActual = null;
        if (!pausado && g === generacion) setTimeout(iniciar, 250);
      };
      try { r.start(); } catch (e) { setTimeout(iniciar, 500); }
    };
    const grabar = () => {
      if (!micOk) { $('#ensenar-aviso-mic').hidden = false; caja.focus(); return; }
      base = caja.value.trim();   // lo que ya estaba escrito se conserva
      final = '';
      pausado = false;
      grabando = true;
      callar();
      clearInterval(relojGrabacion);
      relojGrabacion = setInterval(() => { segundos++; pintarTiempo(); }, 1000);
      pintarEstado();
      setEstado('escuchando');
      iniciar();
    };
    const pausar = () => {
      pausado = true;
      grabando = false;
      clearInterval(relojGrabacion);
      detenerEscucha();
      pintarEstado();
    };

    // Escribir pausa la grabación; el micrófono la retoma
    caja.onfocus = () => { if (!pausado) pausar(); };
    caja.oninput = () => { btnT.disabled = !caja.value.trim(); };
    mic.onclick = btnP.onclick = () => (pausado ? grabar() : pausar());
    btnT.onclick = () => {
      const t = caja.value.trim();
      if (!t) return;
      pausar();
      resolver(t);
    };

    caja.value = '';
    caja.readOnly = false;
    btnT.disabled = true;
    $('#ensenar-aviso-mic').hidden = micOk;
    pintarTiempo();
    pintarEstado();
    if (micOk) grabar();
  });
}

/* =========================================================
   API (con modo simulado de respaldo)
   ========================================================= */
function activarMock() {
  modoMock = true;
  $('#aviso-mock').hidden = false;
}

async function pedirApi(metodo, url, body) {
  if (modoMock) return window.MOCK.api(metodo, url, body);
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: metodo,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
    const datos = await res.json().catch(() => null);
    if (res.ok && datos) return datos;
    if (res.status < 500 && datos && datos.error) return datos;   // error «normal», p. ej. clave equivocada
    throw new Error('Respuesta ' + res.status);
  } catch (e) {
    console.warn('[SABERES] El backend no respondió; uso el modo simulado.', e.message);
    activarMock();
    return window.MOCK.api(metodo, url, body);
  } finally {
    clearTimeout(reloj);
  }
}

const post = (url, body) => pedirApi('POST', url, body);
const get = (url) => pedirApi('GET', url);

async function traerGuias() {
  const guias = await get('/api/guias');
  return Array.isArray(guias) ? guias : [];
}

/* =========================================================
   Navegación
   ========================================================= */
const PANTALLAS = {
  bienvenida: { barra: 'landing', volver: false },
  entrar: { barra: 'simple', angosta: true },
  registro: { barra: 'simple', angosta: true },
  perfil: { barra: 'simple' },
  transicion: { barra: 'ninguna', volver: false, sinHistorial: true },
  inicio: { barra: 'app', seccion: 'inicio' },
  aprender: { barra: 'app', seccion: 'aprender' },
  guia: { barra: 'app', seccion: 'aprender' },
  logro: { barra: 'app', seccion: 'aprender' },
  ensenar: { barra: 'app', seccion: 'ensenar', angosta: true },
  ordenando: { barra: 'app', seccion: 'ensenar', angosta: true, sinHistorial: true },
  'guia-creada': { barra: 'app', seccion: 'ensenar' },
  publicada: { barra: 'app', seccion: 'ensenar' },
  'mi-historia': { barra: 'app', seccion: 'mi-historia' },
  leccion: { barra: 'app', seccion: 'mi-historia' },
  'mis-guias': { barra: 'app', seccion: 'inicio' },
  jovenes: { barra: 'joven', joven: 'explorar' },
  'guia-joven': { barra: 'joven', joven: 'explorar' },
  'gracias-joven': { barra: 'joven', joven: 'explorar' },
  experiencia: { barra: 'joven', joven: 'experiencia' }
};

function irA(idPantalla) {
  const cfg = PANTALLAS[idPantalla] || {};
  document.querySelectorAll('.pantalla').forEach(s => { s.hidden = s.id !== idPantalla; });
  const eraJoven = document.body.dataset.barra === 'joven';
  document.body.dataset.barra = cfg.barra || 'simple';
  // Al cambiar entre la vista Aprender y la de personas mayores, los subtítulos parten de cero
  if (eraJoven !== (cfg.barra === 'joven')) { ultimoTexto = ''; setEstado(null); }
  document.querySelectorAll('[data-seccion]').forEach(b => {
    const on = b.dataset.seccion === cfg.seccion;
    b.classList.toggle('on', on);
    on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-seccion-joven]').forEach(b => b.classList.toggle('on', b.dataset.seccionJoven === cfg.joven));
  const volver = $('#fila-volver');
  volver.hidden = cfg.volver === false;
  volver.classList.toggle('focus', !!cfg.angosta);
  volver.classList.toggle('wrap', !cfg.angosta);
  window.scrollTo({ top: 0, behavior: 'instant' });
  const titulo = document.querySelector(`#${idPantalla} [tabindex="-1"]`);
  if (titulo) titulo.focus({ preventScroll: true });
}

// Cambia de pantalla dentro de un flujo y la anota en el historial
function irAPantalla(id, args = {}) {
  if (pantallaActual && pantallaActual.id !== id && !PANTALLAS[pantallaActual.id].sinHistorial) {
    historial.push(pantallaActual);
    historial = historial.slice(-40);
  }
  pantallaActual = { id, args };
  irA(id);
}

// Detiene voz, micrófono y esperas pendientes
function cancelarTodo() {
  generacion++;
  grabando = false;
  clearInterval(relojGrabacion);
  callar();
  detenerEscucha();
  pendientes.forEach(cancelar => cancelar());
  pendientes.clear();
  limpiarControles();
  setEstado(null);
}

// Corre un flujo; si algo falla, lo dice con calma
function ejecutar(flujo) {
  cancelarTodo();
  const g = generacion;
  return Promise.resolve()
    .then(() => flujo(g))
    .catch(e => {
      if (e === CANCELADO || g !== generacion) return;
      manejarError(e);
    });
}

const ENTRADAS = {
  bienvenida: (g) => flujoBienvenida(g),
  entrar: (g) => flujoEntrar(g),
  registro: (g) => flujoRegistro(g),
  perfil: (g) => flujoPerfil(g),
  transicion: (g) => flujoTransicion(g),
  inicio: (g) => flujoInicio(g),
  aprender: (g, a) => flujoAprender(g, a),
  guia: (g, a) => correrGuia(g, a.guia),
  logro: (g, a) => flujoLogro(g, a.guia),
  ensenar: (g) => flujoEnsenar(g),
  ordenando: (g, a) => flujoOrdenando(g, a),
  'guia-creada': (g, a) => flujoGuiaCreada(g, a),
  publicada: (g, a) => flujoPublicada(g, a),
  'mi-historia': (g) => flujoMiHistoria(g),
  leccion: (g) => flujoLeccion(g),
  'mis-guias': (g) => flujoMisGuias(g),
  jovenes: (g, a) => flujoJovenes(g, a),
  'guia-joven': (g, a) => flujoGuiaJoven(g, a),
  'gracias-joven': (g, a) => flujoGraciasJoven(g, a),
  experiencia: (g) => flujoExperiencia(g)
};

function abrir(id, args = {}, { desdeVolver = false } = {}) {
  return ejecutar(async (g) => {
    if (desdeVolver) { pantallaActual = { id, args }; irA(id); } else irAPantalla(id, args);
    if (ENTRADAS[id]) await ENTRADAS[id](g, args);
  });
}

function volver() {
  // En el registro, «Volver» retrocede una pregunta
  if (pantallaActual && pantallaActual.id === 'registro' && estadoRegistro.paso > 0) {
    estadoRegistro.paso--;
    return abrir('registro', {}, { desdeVolver: true });
  }
  const prev = historial.pop();
  if (prev) return abrir(prev.id, prev.args, { desdeVolver: true });
  return abrir(pantallaInicio(), {}, { desdeVolver: true });
}

function pantallaInicio() {
  if (document.body.dataset.barra === 'joven') return 'jovenes';
  return usuario ? 'inicio' : 'bienvenida';
}

function manejarError(e) {
  console.error('[SABERES]', e);
  setEstado(null);
  const aviso = el('<div class="aviso-error" role="alert"><p>Disculpe, algo no funcionó. No es su culpa.</p></div>');
  const destino = pantallaInicio();
  const caja = ponerControles(aviso, boton('Volver al inicio', 'btn-p', () => abrir(destino), 'home'));
  if (!caja) {
    const sec = document.querySelector('.pantalla:not([hidden])');
    if (sec) sec.append(aviso, boton('Volver al inicio', 'btn-p', () => abrir(destino), 'home'));
  }
  hablar('Disculpe, algo no funcionó. No es su culpa. Puede volver al inicio cuando quiera.').catch(() => {});
}

// Pantallas que necesitan una persona con sesión
function requiereUsuario() {
  if (usuario) return true;
  abrir('bienvenida');
  return false;
}

function pintarBarraUsuario() {
  if (!usuario) return;
  $('#barra-avatar').innerHTML = avatar(usuario, 40);
  $('#barra-hola').textContent = `Hola, ${primerNombre(usuario.nombre)}`;
}

/* =========================================================
   Piezas reutilizables
   ========================================================= */
const CONFETI = [];
(function () {
  const cols = ['#C4552D', '#E3A72F', '#5B7B3A', '#F2C6A8', '#8E3717'];
  for (let i = 0; i < 40; i++) CONFETI.push({ l: ((i * 37) % 100) + '%', d: ((i * 0.137) % 1.8).toFixed(2) + 's', c: cols[i % 5], w: (8 + (i * 7) % 8) + 'px' });
})();

function lanzarConfeti(seccion) {
  const caja = seccion.querySelector('.confetti');
  if (!caja) return;
  caja.innerHTML = CONFETI.map(c => `<i style="left:${c.l};width:${c.w};background:${c.c};animation-delay:${c.d}"></i>`).join('');
}

function pintarPuntos(caja, total, actual) {
  caja.innerHTML = Array.from({ length: total }, (_, i) =>
    `<span style="background:${i < actual ? '#5B7B3A' : i === actual ? '#A9461F' : '#EADBC6'}"></span>`).join('');
}

// Tarjeta de guía (portada y vista Aprender)
function tarjetaGuia(g, alTocar, joven = false) {
  const c = cat(g);
  const b = el(`<button type="button" class="tile ${joven ? 'tile-joven' : 'tile-guia'}">
      <span class="tile-guia-banda" style="background:${c.bg};color:${c.fg}">
        ${icono(iconoGuia(g), joven ? 64 : 72, 1.6)}
        ${joven && g.nueva ? '<span class="pill" style="position:absolute;top:12px;left:12px;background:#2B1D14;color:#FFF8EE;font-size:14px">Nueva</span>' : ''}
        ${joven ? `<span class="pill" style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,.85);color:#2B1D14;font-size:14px">${esc(c.nombre)}</span>` : ''}
      </span>
      <span class="tile-guia-cuerpo">
        ${avatar(g, joven ? 56 : 64)}
        <span class="tile-guia-titulo" ${joven ? 'style="font-size:20px"' : ''}>${esc(g.titulo)}</span>
        <span ${joven ? 'style="font-size:16px"' : ''}>${esc(g.autor)}${g.edad ? ', ' + g.edad : ''}${g.comuna ? ' · ' + esc(g.comuna) : ''}</span>
        <span class="corazon" ${joven ? 'style="font-size:16px"' : ''}>${icono('heart', joven ? 20 : 22)}${textoAprendieron(g.aprendieron)}</span>
      </span>
    </button>`);
  b.addEventListener('click', alTocar);
  return b;
}

/* =========================================================
   A · Portada
   ========================================================= */
async function flujoBienvenida(g) {
  const guias = (await traerGuias()).filter(x => x.estado !== 'en revisión');
  vigente(g);
  const orden = guias.slice().sort((a, b) => (b.nueva ? 1 : 0) - (a.nueva ? 1 : 0) || (b.aprendieron || 0) - (a.aprendieron || 0));
  const caja = $('#destacadas');
  caja.innerHTML = '';
  orden.slice(0, 4).forEach(guia => caja.append(tarjetaGuia(guia, () => abrir('guia-joven', { guia }))));
}

/* =========================================================
   Entrar con la voz
   ========================================================= */
function separarNombreYClave(t) {
  const partes = String(t).split(/\b(?:y\s+)?(?:mi\s+)?(?:palabra\s+)?clave(?:\s+es)?\b/i);
  const nombre = limpiarRespuesta('nombre', partes[0] || '');
  const clave = partes[1] ? limpiarRespuesta('clave', partes[1]) : '';
  return { nombre, clave };
}

async function flujoEntrar(g) {
  const dice = $('#entrar-dice');
  dice.textContent = 'Qué gusto tenerle de vuelta. Dígame su nombre y su palabra clave.';
  await hablar(dice.textContent);
  let r = await pedirRespuesta({ etiqueta: 'O escriba su nombre', boton: 'Seguir' });
  let { nombre, clave } = r.escrito ? { nombre: limpiarRespuesta('nombre', r.texto), clave: '' } : separarNombreYClave(r.texto);
  if (!clave) {
    dice.textContent = `Gracias${nombre ? ', ' + primerNombre(nombre) : ''}. ¿Y su palabra clave?`;
    await hablar(dice.textContent);
    r = await pedirRespuesta({ etiqueta: 'O escriba su palabra clave', boton: 'Entrar' });
    clave = limpiarRespuesta('clave', r.texto);
  }
  const datos = await pensar(post('/api/entrar', { nombre, clave }));
  vigente(g);
  if (!datos || datos.error) {
    dice.textContent = `${datos?.error || 'No encontré una cuenta con ese nombre y esa palabra clave.'} No se preocupe. ¿Lo intentamos de nuevo?`;
    await hablar(dice.textContent);
    const otraVez = await confirmar({ si: 'Intentar de nuevo', no: 'Volver al inicio', iconoNo: 'home', vozSi: ['intent', 'de nuevo', 'otra vez'], vozNo: ['volver', 'inicio'] });
    return otraVez ? flujoEntrar(g) : abrir('bienvenida');
  }
  usuario = datos;
  pintarBarraUsuario();
  const z = zonaActiva();
  if (z) micEstado(z.querySelector('[data-mic]'), 'done', `La reconocí, ${primerNombre(usuario.nombre)}.`);
  dice.textContent = `La reconocí, ${primerNombre(usuario.nombre)}. Qué bueno tenerle de vuelta.`;
  await hablar(dice.textContent);
  const ok = await confirmar({ si: 'Entrar', no: 'No soy yo', iconoSi: 'next', iconoNo: 'repeat', vozSi: ['entrar', 'entra'], vozNo: ['no soy'] });
  if (!ok) { usuario = null; return flujoEntrar(g); }
  irAPantalla('inicio');
  await flujoInicio(g);
}

/* =========================================================
   B · Registro por voz
   ========================================================= */
const PREGUNTAS_REGISTRO = [
  { clave: 'nombre', q: '¿Cómo se llama?', h: 'Diga su nombre y su apellido.' },
  { clave: 'comuna', q: '¿En qué comuna vive?', h: 'Por ejemplo: Maipú, Valparaíso o Temuco.' },
  { clave: 'oficio', q: '¿A qué se dedicó en su vida?', h: 'Puede ser un oficio, su casa o varios trabajos.' },
  { clave: 'sueno', q: '¿A qué le hubiera gustado dedicarse?', h: 'Ese sueño que la vida dejó pendiente.' },
  { clave: 'ensenar', q: '¿Qué sabe hacer que podría enseñar?', h: 'Cocina, oficios, jardín, manualidades… todo vale.' },
  { clave: 'clave', q: 'Diga una palabra clave para entrar', h: 'Una palabra fácil de recordar, por ejemplo el nombre de una flor. No se la diga a nadie.' }
];

// Quita «me llamo», «soy de», «fui…», etc.
function limpiarRespuesta(clave, texto) {
  let t = String(texto).trim().replace(/[.¡!¿?]+$/, '').trim();
  const prefijos = {
    nombre: /^(hola,?\s*)?(me llamo|mi nombre es|yo me llamo|yo soy|soy)\s+/i,
    comuna: /^(yo\s+)?(soy|vivo)?\s*(de|en)\s+(la comuna de\s+)?/i,
    oficio: /^(yo\s+)?(fui|era|trabaj[eé] (de|como|en)|me dediqu[eé] (a|al)|toda la vida (fui|trabaj[eé] de))\s+/i,
    sueno: /^(siempre\s+)?(quise|quer[ií]a|me hubiera gustado|hubiera querido|me habr[ií]a gustado|so[nñ][eé] con)\s+/i,
    ensenar: /^(s[eé] hacer|me gustar[ií]a enseñar|quiero enseñar|puedo enseñar|podr[ií]a enseñar|enseñar|s[eé])(\s+a)?\s+/i,
    clave: /^(mi (palabra clave|palabra|clave) (es|ser[aá])|la palabra (es|ser[aá])|elijo|que sea|es)\s+/i
  };
  if (prefijos[clave]) t = t.replace(prefijos[clave], '');
  if (clave === 'oficio') t = t.split(',')[0].trim();
  if (clave === 'nombre' || clave === 'comuna') {
    t = t.split(' ').map((w, i) => (i > 0 && /^(de|del|la|las|los|y)$/i.test(w)) ? w.toLowerCase() : mayus(w)).join(' ');
  }
  if (clave === 'oficio' || clave === 'sueno') t = mayus(t);
  if (clave === 'clave') t = normal(t).split(' ')[0] || '';
  return t;
}

function pintarPregunta(i) {
  const p = PREGUNTAS_REGISTRO[i];
  $('#reg-num').textContent = `Pregunta ${i + 1} de ${PREGUNTAS_REGISTRO.length}`;
  pintarPuntos($('#reg-puntos'), PREGUNTAS_REGISTRO.length, i);
  $('#reg-pregunta').textContent = p.q;
  $('#reg-ayuda').textContent = p.h;
}

async function flujoRegistro(g) {
  for (let i = estadoRegistro.paso; i < PREGUNTAS_REGISTRO.length; i++) {
    estadoRegistro.paso = i;
    const p = PREGUNTAS_REGISTRO[i];
    pintarPregunta(i);
    await hablar((i === 0 ? 'Le doy la bienvenida a SABERES. ' : '') + `${p.q} ${p.h}`);
    while (true) {
      const r = await pedirRespuesta({ etiqueta: 'O escriba su respuesta' });
      const valor = limpiarRespuesta(p.clave, r.texto);
      if (!valor) { await hablar('Disculpe, no alcancé a entender. Vamos de nuevo.'); continue; }
      if (r.escrito) { estadoRegistro.respuestas[p.clave] = valor; break; }
      const z = zonaActiva();
      if (z) mostrarOido(z, 'Usted dijo:', valor, false);
      await hablar(p.clave === 'clave' ? 'Anoté su palabra clave. ¿Está bien?' : `Escuché: ${valor}. ¿Está bien?`);
      if (await confirmar({ si: 'Sí, está bien', no: 'Repetir' })) { estadoRegistro.respuestas[p.clave] = valor; break; }
      await hablar(`Bueno, de nuevo. ${p.q}`);
    }
  }
  $('#reg-pregunta').textContent = 'Un momento, estoy armando su perfil…';
  $('#reg-ayuda').textContent = '';
  const datos = await pensar(post('/api/registro', { respuestas: estadoRegistro.respuestas }));
  vigente(g);
  if (!datos || datos.error) throw new Error(datos?.error || 'No se pudo registrar');
  usuario = Object.assign({ oficio: estadoRegistro.respuestas.oficio, sueno: estadoRegistro.respuestas.sueno }, datos);
  pintarBarraUsuario();
  irAPantalla('perfil');
  await flujoPerfil(g);
}

/* =========================================================
   B2 · Su perfil
   ========================================================= */
async function flujoPerfil(g) {
  if (!requiereUsuario()) return;
  const u = usuario;
  $('#perfil-retrato').innerHTML = avatar(u, 180);
  $('#perfil-nombre').textContent = u.nombre;
  $('#perfil-comuna').textContent = u.comuna || '—';
  $('#perfil-oficio').textContent = u.oficio || '—';
  $('#perfil-sueno').textContent = u.sueno || '—';
  $('#perfil-ensena').textContent = mayus((u.saberes || []).join(', ')) || '—';
  await hablar(u.bienvenida || `Así quedó su perfil: ${u.nombre}${u.comuna ? ', de ' + u.comuna : ''}. ¿Está todo bien?`);
  const ok = await confirmar({ si: 'Todo correcto', no: 'Corregir', iconoNo: 'edit', vozSi: ['correcto', 'todo bien'], vozNo: ['corregir', 'cambiar'] });
  if (!ok) {
    estadoRegistro.paso = 0;
    irAPantalla('registro');
    return flujoRegistro(g);
  }
  irAPantalla('transicion');
  await flujoTransicion(g);
}

/* =========================================================
   Transición emotiva
   ========================================================= */
function fraseSueno(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  const n = normal(t);
  return /^(ser|tener|viajar|estudiar|aprender|hacer|trabajar|vivir|conocer|escribir|cantar|bailar|pintar|ensenar|abrir|cocinar|tocar)\b/.test(n) ? t.charAt(0).toLowerCase() + t.slice(1) : '';
}

function temaPizarra() {
  const s = (usuario && usuario.saberes && usuario.saberes[0]) || 'Mi saber';
  const t = mayus(String(s).split(/\s+y\s+|,/)[0].trim());
  if (t.length <= 14) return t;
  // Corta en una palabra completa para que quepa en la pizarra
  const palabras = [];
  for (const w of t.split(' ')) { if ((palabras.join(' ') + ' ' + w).trim().length > 14) break; palabras.push(w); }
  while (palabras.length > 1 && /^(de|del|la|el|los|las|y|a|en|con)$/i.test(palabras[palabras.length - 1])) palabras.pop();
  return palabras.join(' ') || t.slice(0, 13) + '…';
}

async function flujoTransicion(g) {
  if (!requiereUsuario()) return;
  const sec = $('#transicion');
  const verbo = fraseSueno(usuario.sueno);
  const titulo = `${primerNombre(usuario.nombre)}, nunca es tarde para ${verbo || 'cumplir un sueño'}.`;
  $('#bt-titulo').textContent = titulo;
  $('#bt-ilus').innerHTML = ilustracion('pizarra', temaPizarra());
  lanzarConfeti(sec);
  await hablar(`${titulo} Aquí puede enseñar desde hoy.`);
  await elegir([{ texto: 'Ir a mi inicio', clase: 'btn-w', icono: 'next', despues: true, valor: true, voz: ['inicio', 'vamos', 'si', 'ya', 'dale', 'listo', 'ir'] }]);
  irAPantalla('inicio');
  await flujoInicio(g);
}

/* =========================================================
   C · Inicio
   ========================================================= */
function fechaDeHoy() {
  const f = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  return mayus(f);
}

function saludoDelDia() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

function esMia(guia) {
  if (!usuario) return false;
  if (guia.autorId && guia.autorId === usuario.id) return true;
  return normal(guia.autor) === normal(usuario.nombre);
}

// Los 5 pasos del camino hacia el sueño
function calcularHitos(mias) {
  const total = mias.reduce((s, x) => s + (Number(x.aprendieron) || 0), 0);
  const hitos = [
    { t: 'Enseñar su primera guía', ok: mias.length > 0 },
    { t: 'Que 10 personas aprendan', ok: total >= 10 },
    { t: 'Grabar una lección de vida', ok: !!usuario.leccion },
    { t: 'Dar una clase por videollamada', ok: false },
    { t: 'Acompañar a alguien que aprende', ok: false }
  ];
  const sig = hitos.findIndex(h => !h.ok);
  hitos.forEach((h, i) => { h.estado = h.ok ? 'done' : i === sig ? 'next' : 'todo'; });
  return { hitos, logrados: hitos.filter(h => h.ok).length, siguiente: hitos[sig], total };
}

function interpretarMenu(t) {
  const n = normal(t);
  if (/ensen/.test(n)) return { id: 'ensenar' };
  if (/(suen|histori|leccion|camino)/.test(n)) return { id: 'mi-historia' };
  if (/(gracias|mis guias)/.test(n)) return { id: 'mis-guias' };
  if (/(aprend|como se|quiero (ver|hacer|saber|usar|pagar))/.test(n)) {
    const resto = n.replace(/\b(quiero|quisiera|me gustaria|aprender|a)\b/g, '').trim();
    return { id: 'aprender', args: resto.split(' ').length >= 2 ? { pregunta: t } : {} };
  }
  return null;
}

// Barra de voz de abajo: micrófono y campo para escribir, siempre juntos
function escucharBarraInicio() {
  const g = generacion;
  const mic = $('#c-mic'), linea = $('#c-voz-linea'), form = $('#c-escribir'), campo = $('#c-in');
  return cancelable((resolver) => {
    let hecho = false, intento = 0;
    const fin = (t) => { if (hecho) return; hecho = true; intento++; detenerEscucha(); mic.onclick = form.onsubmit = campo.onfocus = campo.oninput = null; resolver(t); };
    const pausarVoz = () => {
      if (!mic.classList.contains('listening')) return;
      intento++;
      detenerEscucha();
      micEstado(mic, 'idle');
      linea.textContent = 'Escriba y toque «Listo», o toque el micrófono para hablar';
    };
    const oir = async () => {
      if (hecho || g !== generacion || !micOk) return;
      const yo = ++intento;
      micEstado(mic, 'listening');
      linea.textContent = 'La escucho…';
      try {
        const t = await escuchar({ onParcial: p => { if (yo === intento) linea.textContent = `La escucho… «${p}»`; } });
        if (hecho || yo !== intento) return;
        micEstado(mic, 'done');
        linea.textContent = `«${t}». ¡Vamos!`;
        fin(t);
      } catch (e) {
        if (hecho || yo !== intento) return;
        micEstado(mic, 'idle');
        linea.textContent = micOk ? 'O dígame qué quiere hacer' : 'El micrófono no está disponible. Escriba aquí abajo.';
      }
    };
    mic.onclick = () => { if (!mic.classList.contains('listening')) oir(); };
    campo.onfocus = campo.oninput = pausarVoz;
    form.onsubmit = (e) => { e.preventDefault(); const v = campo.value.trim(); if (v) fin(v); else campo.focus(); };
    campo.value = '';
    micEstado(mic, 'idle');
    linea.textContent = micOk ? 'O dígame qué quiere hacer' : 'El micrófono no está disponible. Escriba aquí abajo.';
    if (micOk) oir();
  });
}

async function flujoInicio(g) {
  if (!requiereUsuario()) return;
  pintarBarraUsuario();
  const pn = primerNombre(usuario.nombre);
  $('#c-fecha').textContent = fechaDeHoy();
  $('#inicio-saludo').textContent = `${saludoDelDia()}, ${pn}`;

  const guias = await traerGuias();
  vigente(g);
  const mias = guias.filter(esMia);
  const { logrados, siguiente, total } = calcularHitos(mias);
  const logro = $('#c-logro');
  logro.hidden = !total;
  logro.querySelector('span').textContent = `${total} ${total === 1 ? 'persona aprendió' : 'personas aprendieron'} de usted`;

  // Últimos gracias
  const gracias = window.MOCK.gracias(usuario.id).slice(0, 2);
  $('#c-gracias-card').hidden = !gracias.length;
  $('#c-gracias').innerHTML = gracias.map(x => `<li class="gracias-item">${avatar(x, 56)}<div><p style="font-weight: 700">${esc(x.nombre)}${x.edad ? ', ' + x.edad : ''}</p><p>«${esc(x.mensaje)}»</p></div></li>`).join('');

  // Su sueño
  const sueno = fraseSueno(usuario.sueno) || (usuario.sueno ? usuario.sueno.toLowerCase() : '');
  $('#c-sueno-titulo').textContent = sueno ? `Su sueño: ${sueno}` : 'Su camino';
  $('#c-sueno-sub').textContent = sueno ? `Su camino para ${fraseSueno(usuario.sueno) || 'cumplirlo'}.` : 'Su camino en SABERES.';
  $('#c-sueno-pasos').textContent = `${logrados} de 5 pasos logrados`;
  $('#c-sueno-barra').style.width = (logrados / 5 * 100) + '%';
  $('#c-sueno-barra-caja').setAttribute('aria-label', `Progreso: ${logrados} de 5 pasos`);
  $('#c-sueno-sig').textContent = siguiente ? `Siguiente: ${siguiente.t.charAt(0).toLowerCase() + siguiente.t.slice(1)}.` : '¡Completó su camino!';

  await hablar(`${saludoDelDia()}, ${pn}. ${total ? `${total} ${total === 1 ? 'persona aprendió' : 'personas aprendieron'} de usted. ` : ''}¿Qué quiere hacer hoy? Puede decir: aprender, enseñar, mi sueño o mis gracias.`);
  while (true) {
    const t = await escucharBarraInicio();
    const destino = interpretarMenu(t);
    if (destino) return abrir(destino.id, destino.args || {});
    await hablar('Disculpe, no le entendí. Puede decir: aprender, enseñar, mi sueño o mis gracias. También puede tocar una opción.');
  }
}

/* =========================================================
   D1 · ¿Qué quiere aprender?
   ========================================================= */
async function flujoAprender(g, args = {}) {
  if (!requiereUsuario()) return;
  const dice = $('#d1-dice');
  const guias = (await traerGuias()).filter(x => x.estado !== 'en revisión' && x.categoria !== 'historias' && (x.pasos || []).length);
  vigente(g);
  const sug = $('#sugerencias');
  sug.innerHTML = '';
  guias.slice().sort((a, b) => (b.aprendieron || 0) - (a.aprendieron || 0)).slice(0, 4).forEach(guia => {
    const c = cat(guia);
    const b = el(`<button type="button" class="tile" style="flex-direction: column; gap: 14px; padding: 22px; min-height: 190px; box-shadow: none">
        <span class="icono-caja" style="width: 72px; height: 72px; border-radius: 20px; background: ${c.bg}; color: ${c.fg}">${icono(iconoGuia(guia), 40)}</span>
        <span style="font-weight: 700; font-size: 1em; line-height: 1.2">${esc(guia.titulo)}</span>
      </button>`);
    b.addEventListener('click', () => abrir('guia', { guia }));
    sug.append(b);
  });

  let pregunta = args.pregunta || '';
  dice.textContent = 'Dígamelo con sus palabras. Por ejemplo: «quiero ver a mis nietos por el celular».';
  if (!pregunta) await hablar('¿Qué quiere aprender hoy? ' + dice.textContent);
  while (true) {
    if (!pregunta) pregunta = (await pedirRespuesta({ etiqueta: 'O escriba qué quiere aprender', boton: 'Empezar' })).texto;
    dice.textContent = 'Déjeme buscar…';
    const guia = await pensar(post('/api/buscar', { pregunta }));
    vigente(g);
    pregunta = '';
    if (!guia || guia.error || !Array.isArray(guia.pasos) || !guia.pasos.length) {
      dice.textContent = `${guia?.error || 'No encontré una guía sobre eso.'} Puede intentarlo otra vez, o elegir una de las que más están aprendiendo.`;
      await hablar(dice.textContent);
      continue;
    }
    dice.textContent = `Encontré «${guia.titulo}», de ${guia.autor}. ¿Empezamos?`;
    await hablar(dice.textContent);
    if (await confirmar({ si: 'Sí, empecemos', no: 'No, otra cosa', iconoSi: 'next', iconoNo: 'x', vozSi: ['empec', 'empez'], vozNo: ['otra cosa'] })) {
      irAPantalla('guia', { guia });
      return correrGuia(g, guia);
    }
    dice.textContent = 'Bueno. Dígame otra cosa que quiera aprender.';
    await hablar(dice.textContent);
  }
}

/* =========================================================
   D2 · Guía paso a paso
   ========================================================= */
const APPS = [
  { l: 'Teléfono', i: 'call', c: '#4F7FA8' }, { l: 'Cámara', i: 'camera', c: '#7B6A58' }, { l: 'Fotos', i: 'sprout', c: '#C9893E' },
  { l: 'Mensajes', i: 'chat', c: '#5B7B3A' }, { l: 'WhatsApp', i: 'chat', c: '#1F8A4C', hi: true }, { l: 'Mapas', i: 'pin', c: '#A9461F' },
  { l: 'Reloj', i: 'clock', c: '#2B1D14' }, { l: 'Calendario', i: 'calendar', c: '#8E3717' }, { l: 'Radio', i: 'speaker', c: '#6B4A0E' }
];

// Pantalla del celular de ejemplo (guía de videollamada)
function pantallaCelular(k) {
  switch (k) {
    case 'apps': return `<div style="padding: 52px 20px 20px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 26px 12px; background: #FBF3E6; height: 100%">
      ${APPS.map(a => `<div style="display: flex; flex-direction: column; align-items: center; gap: 8px"><span class="${a.hi ? 'pulse' : ''}" style="width: 64px; height: 64px; border-radius: 18px; background: ${a.c}; color: #FFFFFF; display: flex; align-items: center; justify-content: center">${icono(a.i, 32)}</span><span style="font-size: 14px; font-weight: ${a.hi ? 700 : 400}">${a.l}</span></div>`).join('')}</div>`;
    case 'chats': return `<div style="background: #1F6E42; color: #FFFFFF; padding: 40px 18px 16px; font-weight: 700; font-size: 22px">WhatsApp</div>
      <div style="display: flex; flex-direction: column">
        <div class="pulse" style="display: flex; gap: 12px; align-items: center; padding: 14px 16px; background: #FFF1D6; border-radius: 14px; margin: 10px">${retrato('carolina', 48)}<div><p style="font-weight: 700">Hija Carolina</p><p style="font-size: 14px">¿Hablamos a la once?</p></div></div>
        <div style="display: flex; gap: 12px; align-items: center; padding: 14px 26px">${retrato('tomas', 48)}<div><p style="font-weight: 700">Nieto Tomás</p><p style="font-size: 14px">Abuela, ¿me manda la receta?</p></div></div>
        <div style="display: flex; gap: 12px; align-items: center; padding: 14px 26px">${retrato('carmen', 48)}<div><p style="font-weight: 700">Comadre Lucía</p><p style="font-size: 14px">Mañana paso a verla</p></div></div>
      </div>`;
    case 'chat': return `<div style="background: #1F6E42; color: #FFFFFF; padding: 40px 12px 12px; display: flex; align-items: center; gap: 10px">${icono('back', 22)}${retrato('carolina', 40)}<p style="font-weight: 700; flex-grow: 1">Hija Carolina</p><span class="pulse" style="display: inline-flex; width: 46px; height: 46px; border-radius: 12px; background: #FFF1D6; color: #1F6E42; align-items: center; justify-content: center">${icono('video', 28)}</span>${icono('call', 22)}</div>
      <div style="flex-grow: 1; background: #F3EDE3; padding: 18px 14px; display: flex; flex-direction: column; gap: 10px">
        <p style="align-self: flex-start; background: #FFFFFF; padding: 10px 14px; border-radius: 14px; max-width: 80%">Mamá, ¿hablamos a la once?</p>
        <p style="align-self: flex-end; background: #DFF2D4; padding: 10px 14px; border-radius: 14px; max-width: 80%">Sí, mijita. Te llamo con video.</p>
      </div>`;
    case 'call': return `<div style="height: 100%; background: #2B1D14; color: #FFF8EE; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px">${retrato('carolina', 170)}<p style="font-size: 22px; font-weight: 700">Hija Carolina</p><p>Llamando…</p></div>`;
    case 'eyes': return `<div style="height: 100%; background: #9A6342; position: relative; display: flex; align-items: center; justify-content: center">${retrato('carolina', 250)}
      <div class="pulse" style="position: absolute; right: 14px; top: 40px; width: 92px; height: 124px; border-radius: 14px; overflow: hidden; border: 3px solid #FFFFFF; background: #F6D9C4; display: flex; align-items: center; justify-content: center">${retrato('rosa', 84)}</div>
      <p style="position: absolute; left: 14px; bottom: 20px; right: 14px; background: rgba(43,29,20,.85); color: #FFF8EE; padding: 10px 12px; border-radius: 12px; font-size: 15px">En el cuadrito chico se ve usted.</p></div>`;
    case 'end': return `<div style="height: 100%; background: #9A6342; position: relative; display: flex; align-items: center; justify-content: center">${retrato('carolina', 230)}
      <div style="position: absolute; left: 0; right: 0; bottom: 28px; display: flex; justify-content: center; gap: 22px">
        <span style="width: 58px; height: 58px; border-radius: 50%; background: rgba(255,255,255,.25); color: #FFFFFF; display: flex; align-items: center; justify-content: center">${icono('mic', 28)}</span>
        <span class="pulse" style="width: 70px; height: 70px; border-radius: 50%; background: #C62828; color: #FFFFFF; display: flex; align-items: center; justify-content: center">${icono('call', 32)}</span>
        <span style="width: 58px; height: 58px; border-radius: 50%; background: rgba(255,255,255,.25); color: #FFFFFF; display: flex; align-items: center; justify-content: center">${icono('video', 28)}</span>
      </div></div>`;
    default: return '';
  }
}

function pintarAsideGuia(guia, i) {
  const aside = $('#g-aside');
  const k = guia.pantallas && i >= 0 ? guia.pantallas[i] : null;
  if (k) {
    aside.innerHTML = `<p style="font-weight: 700">Así se ve en su celular</p><div class="celular" role="img" aria-label="Ejemplo en la pantalla del celular"><div class="celular-pantalla">${pantallaCelular(k)}</div></div>`;
    return;
  }
  const c = cat(guia);
  const dibujo = ilustracionDe(guia) ? `<div style="width: 100%; border-radius: 20px; overflow: hidden">${ilustracion(ilustracionDe(guia))}</div>`
    : `<span class="icono-grande" style="background: ${c.bg}; color: ${c.fg}">${icono(iconoGuia(guia), 120, 1.4)}</span>`;
  aside.innerHTML = `${dibujo}
    <div class="autor-mini">${avatar(guia, 96)}<p style="font-weight: 700">Una guía de ${esc(guia.autor)}${guia.edad ? ', ' + guia.edad : ''}</p>
    ${guia.comuna ? `<p class="con-icono" style="gap: 6px">${icono('pin', 22)}${esc(guia.comuna)}</p>` : ''}
    <p class="corazon">${icono('heart', 22)}${textoAprendieron(guia.aprendieron)}</p></div>`;
}

function pintarBurbuja(texto, titulo = 'SABERES le dice', alternativa = false) {
  $('#g-burbuja').classList.toggle('bubble-alt', alternativa);
  $('#g-burbuja-titulo').textContent = titulo;
  $('#g-burbuja-texto').textContent = texto;
}

function pintarMateriales(guia) {
  const mats = guia.materiales || [];
  const adv = guia.advertencias || [];
  $('#g-num').textContent = 'Antes de empezar';
  pintarPuntos($('#g-puntos'), (guia.pasos || []).length, -1);
  $('#g-paso').innerHTML = `<span class="paso-num" style="background: #A9461F">${icono('check', 34)}</span>
    <h2 class="paso-titulo">Antes de empezar</h2>
    ${mats.length ? `<p class="paso-cuerpo">Va a necesitar:</p><div class="chips-mats">${mats.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : '<p class="paso-cuerpo">Prepárese: vamos a empezar.</p>'}
    ${adv.length ? `<div class="caja-adv" style="margin-top: 22px; padding: 20px 24px"><h2 style="font-size: 1em">${icono('alert', 28)}Importante</h2><ul>${adv.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}`;
}

function pintarPasoGuia(guia, i) {
  const total = guia.pasos.length;
  const titulo = (guia.titulos || [])[i];
  $('#g-num').textContent = `Paso ${i + 1} de ${total}`;
  pintarPuntos($('#g-puntos'), total, i);
  $('#g-puntos').setAttribute('aria-label', `Paso ${i + 1} de ${total}`);
  $('#g-paso').innerHTML = `<span class="paso-num">${i + 1}</span>
    ${titulo ? `<h2 class="paso-titulo">${esc(titulo)}</h2><p class="paso-cuerpo">${esc(guia.pasos[i])}</p>` : `<p class="paso-cuerpo-grande">${esc(guia.pasos[i])}</p>`}`;
}

// Lee un texto y espera «listo»; atiende repetir, más lento y dudas
async function leerHastaListo(g, texto, paso) {
  pintarBurbuja(texto);
  await hablar(texto);
  while (true) {
    const orden = await esperarOrden();
    if (orden.tipo === 'listo') return;
    if (orden.tipo === 'repetir') {
      pintarBurbuja(texto, 'Se lo repito, sin apuro');
      await hablar(texto);
    } else if (orden.tipo === 'lento') {
      velocidadVoz = 0.75;
      pintarBurbuja(texto, 'Se lo digo más despacio');
      await hablar(texto);
    } else if (orden.tipo === 'esperar') {
      pintarBurbuja('No hay apuro. Cuando quiera seguir, dígame «listo».');
      await hablar('No hay apuro. Cuando quiera seguir, dígame «listo».');
    } else {
      const r = await pensar(post('/api/ayuda', { guia: guiaActual, paso, duda: orden.texto || 'No entendí' }));
      vigente(g);
      const explicacion = r?.texto || `Se lo leo otra vez, con calma. ${texto}`;
      pintarBurbuja(explicacion, 'Se lo explico de otra forma', true);
      await hablar(`${explicacion} Cuando quiera seguir, dígame «listo».`);
    }
  }
}

async function correrGuia(g, guia) {
  if (!requiereUsuario()) return;
  guiaActual = guia;
  const pasos = guia.pasos || [];
  $('#g-titulo').textContent = guia.titulo;
  pintarMateriales(guia);
  pintarAsideGuia(guia, -1);

  const mats = guia.materiales || [];
  const intro = `${guia.titulo}. Una guía de ${guia.autor}${guia.comuna ? ', de ' + guia.comuna : ''}. `
    + (guia.advertencias?.length ? 'Algo importante: ' + guia.advertencias.join(' ') + ' ' : '')
    + (mats.length ? `Va a necesitar: ${listaConY(mats)}. ` : '')
    + 'Cuando tenga todo a mano, dígame «listo» y empezamos.';
  await leerHastaListo(g, intro, 'Materiales: ' + mats.join(', '));

  for (let i = 0; i < pasos.length; i++) {
    pintarPasoGuia(guia, i);
    pintarAsideGuia(guia, i);
    const titulo = (guia.titulos || [])[i];
    const dicho = (guia.dichos || [])[i] || pasos[i];
    await leerHastaListo(g, `Paso ${i + 1}. ${titulo ? titulo + '. ' : ''}${dicho}`, pasos[i]);
  }
  irAPantalla('logro', { guia });
  await flujoLogro(g, guia);
}

/* =========================================================
   D3 · ¡Lo logró!
   ========================================================= */
async function flujoLogro(g, guia) {
  if (!requiereUsuario()) return;
  const sec = $('#logro');
  lanzarConfeti(sec);
  const consejo = (guia.consejos || [])[0];
  const texto = (guia.logro || `Terminó «${guia.titulo}». ¡Muy bien hecho!`) + (consejo ? ` Un consejo de ${nombreAutor(guia.autor)}: ${consejo}` : '');
  $('#d3-texto').textContent = texto;
  await hablar('¡Lo logró! ' + texto);

  if (!esMia(guia)) {
    const pn = nombreAutor(guia.autor);
    $('#d3-texto').textContent = `¿Quiere darle las gracias ${aQuien(pn)}? Le llega un mensaje por WhatsApp.`;
    await hablar(`¿Quiere darle las gracias ${aQuien(pn)}? Le llega un mensaje por WhatsApp.`);
    if (await confirmar({ si: 'Sí, dar las gracias', no: 'No, gracias', iconoSi: 'heart', iconoNo: 'x', vozSi: ['gracias'], vozNo: ['no gracias'] })) {
      const r = await pensar(post('/api/aprendi', { guiaId: guia.id, aprendiz: usuario.nombre, mensaje: '¡Gracias por enseñarme!' }));
      vigente(g);
      if (r?.aprendieron != null) guia.aprendieron = r.aprendieron;
      $('#d3-texto').textContent = `Le enviamos su agradecimiento ${aQuien(pn)} 💌`;
      await hablar(`Le enviamos su agradecimiento ${aQuien(pn)}.`);
    }
  }
  const destino = await elegir([
    { texto: 'Aprender otra cosa', clase: 'btn-p', valor: 'aprender', voz: ['aprender', 'otra cosa'] },
    { texto: 'Volver al inicio', clase: 'btn-s', icono: 'home', valor: 'inicio', voz: ['inicio', 'volver'] }
  ]);
  return abrir(destino);
}

/* =========================================================
   E1 · Enseñar (grabar)
   ========================================================= */
async function flujoEnsenar(g) {
  if (!requiereUsuario()) return;
  const tema = (usuario.saberes || [])[0];
  $('#e1-tema').textContent = tema ? `Enseñar · ${mayus(tema)}` : 'Enseñar';
  $('#e1-tiempo').textContent = '00:00';
  $('#e1-estado').textContent = 'Listo para grabar';
  $('#transcripcion').value = '';
  $('#btn-terminar').disabled = true;
  micEstado($('#e1-mic'), 'idle');
  await hablar('Cuénteme cómo lo hace, como si se lo explicara a un nieto. No se preocupe si se equivoca o se sale del tema. Yo ordeno todo después. Cuando termine, toque «Terminé».');
  const relato = await grabarHastaQueToque();
  if (normal(relato).split(' ').filter(Boolean).length < 4) {
    await hablar('No alcancé a escuchar lo suficiente. Probemos otra vez, con calma.');
    return flujoEnsenar(g);
  }
  irAPantalla('ordenando', { relato });
  await flujoOrdenando(g, { relato });
}

/* =========================================================
   E2 · Ordenando
   ========================================================= */
const TAREAS_E2 = ['Escuché su explicación', 'Separando los materiales', 'Ordenando los pasos', 'Agregando sus consejos'];

function pintarTareas(hechas) {
  $('#e2-tareas').innerHTML = TAREAS_E2.map((t, i) => {
    const ico = i < hechas ? `<span class="tarea-ico tarea-ok">${icono('check', 26)}</span>`
      : i === hechas ? '<span class="tarea-ico tarea-ahora spin"></span>' : '<span class="tarea-ico tarea-espera"></span>';
    return `<li class="tarea" style="opacity: ${i > hechas ? .55 : 1}">${ico}<span>${t}</span></li>`;
  }).join('');
}

async function flujoOrdenando(g, { relato }) {
  if (!requiereUsuario()) return;
  pintarTareas(0);
  const pedido = post('/api/ensenar', { usuarioId: usuario.id, relato });
  hablar('Estoy ordenando su guía. Tómese un tecito mientras tanto.').catch(() => {});
  for (let i = 1; i <= 3; i++) { await pausa(900); vigente(g); pintarTareas(i); }
  const guia = await pensar(pedido);
  vigente(g);
  pintarTareas(4);
  await pausa(500);
  vigente(g);
  if (!guia || guia.error || !Array.isArray(guia.pasos)) {
    await hablar('Disculpe, no pude ordenar su guía esta vez. No es su culpa. ¿Probamos de nuevo?');
    const otraVez = await confirmar({ si: 'Sí, grabar de nuevo', no: 'Volver al inicio', iconoNo: 'home', vozNo: ['volver', 'inicio'] });
    return abrir(otraVez ? 'ensenar' : 'inicio');
  }
  irAPantalla('guia-creada', { guia, nueva: true });
  await flujoGuiaCreada(g, { guia, nueva: true });
}

/* =========================================================
   E3 · Guía creada
   ========================================================= */
function iconoMaterial(t) {
  const n = normal(t);
  if (/harina|arroz|bol/.test(n)) return 'bowl';
  if (/manteca|aceite|cuchar|mantequilla/.test(n)) return 'spoon';
  if (/\bsal\b|azucar/.test(n)) return 'salt';
  if (/agua|leche|cola/.test(n)) return 'drop';
  if (/levadura|semilla|almacigo|planta/.test(n)) return 'sprout';
  if (/pano|trapo|toalla/.test(n)) return 'cloth';
  if (/horno|fuego|gas|cocina/.test(n)) return 'flame';
  if (/lana|palillo|ovillo/.test(n)) return 'yarn';
  if (/aguja|hilo|tijera|cuchillo/.test(n)) return 'scissors';
  if (/celular|telefono|internet|wifi/.test(n)) return 'phone';
  if (/tierra|macet|piedr|hoja/.test(n)) return 'leaf';
  if (/destornillador|martillo|tornillo|lija|enchufe/.test(n)) return 'wrench';
  return 'check';
}

// Ilustración del diseño si la guía es de pan
function ilustracionDe(guia) {
  if (guia.ilustracion) return guia.ilustracion;
  return guia.categoria === 'cocina' && /\bpan\b/.test(normal(guia.titulo)) ? 'pan' : null;
}

function pintarGuiaCreada(guia) {
  const c = cat(guia);
  const revision = guia.estado === 'en revisión';
  const estado = $('#e3-estado');
  estado.textContent = revision ? 'En revisión · una persona del equipo la revisará' : 'Borrador · revise antes de publicar';
  $('#e3-ilus').innerHTML = ilustracionDe(guia) ? ilustracion(ilustracionDe(guia))
    : `<div style="height: 262px; background: ${c.bg}; color: ${c.fg}; display: flex; align-items: center; justify-content: center">${icono(iconoGuia(guia), 130, 1.4)}</div>`;
  $('#e3-cat').textContent = guia.categoria === 'historias' ? 'Lección de vida' : `Guía de ${c.nombre.toLowerCase()}`;
  $('#e3-titulo').textContent = guia.titulo;
  $('#e3-retrato').innerHTML = avatar(guia, 64);
  $('#e3-autor').innerHTML = `Creada con la voz de <strong>${esc(guia.autor)}</strong>`;
  const pills = [];
  if (guia.comuna) pills.push(['pin', guia.comuna, '#F6EBDA', '#2B1D14']);
  pills.push(['sprout', `Nivel: ${(guia.nivel || 'Principiante').toLowerCase()}`, '#E6EEDC', '#2F451A']);
  if (guia.duracion) pills.push(['clock', guia.duracion, '#F6EBDA', '#2B1D14']);
  if (guia.rinde) pills.push(['bread', `Rinde ${guia.rinde}`, '#F6EBDA', '#2B1D14']);
  $('#e3-pills').innerHTML = pills.map(([i, t, bg, fg]) => `<span class="pill" style="background: ${bg}; color: ${fg}; font-size: .9em">${icono(i, 22)}${esc(t)}</span>`).join('');
  const mats = guia.materiales || [];
  $('#e3-mats').innerHTML = mats.length ? mats.map(m => `<li><span class="mat-ico">${icono(iconoMaterial(m), 30)}</span><span>${esc(m)}</span></li>`).join('') : '<li>No necesita materiales especiales.</li>';
  $('#e3-pasos').innerHTML = (guia.pasos || []).map((p, i) => `<li><span class="num-paso">${i + 1}</span><p>${esc(p)}</p></li>`).join('');
  const consejos = guia.consejos || [], adv = guia.advertencias || [];
  $('#e3-extra').innerHTML =
    (consejos.length ? `<section class="caja-consejos"><h2>${icono('bulb', 32)}Consejos de ${esc(nombreAutor(guia.autor))}</h2><ul>${consejos.map(x => `<li>«${esc(x.replace(/\.$/, ''))}.»</li>`).join('')}</ul></section>` : '') +
    (adv.length ? `<section class="caja-adv"><h2>${icono('alert', 32)}Advertencias</h2><ul>${adv.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '');
}

function textoGuiaCompleta(guia) {
  return `${guia.titulo}. ` + (guia.materiales?.length ? `Materiales: ${listaConY(guia.materiales)}. ` : '')
    + (guia.pasos || []).map((p, i) => `Paso ${i + 1}: ${p}`).join(' ');
}

async function flujoGuiaCreada(g, { guia, nueva }) {
  if (!requiereUsuario()) return;
  pintarGuiaCreada(guia);
  await hablar(guia.resumen_voz || `Esta es su guía: ${guia.titulo}.`);
  if (guia.estado === 'en revisión') {
    await hablar('Como su guía habla de un tema delicado, una persona del equipo la va a revisar antes de publicarla. Es solo para cuidar a quienes la lean. Muchas gracias por su paciencia.');
  }
  await hablar('¿La publico así? Si está bien, toque «Publicar mi guía».');
  while (true) {
    const v = await elegir([
      { texto: 'Publicar mi guía', clase: 'btn-p', icono: 'send', valor: 'publicar', voz: ['publica', 'si', 'esta bien', 'asi esta bien', 'dale'] },
      { texto: 'Escucharla', clase: 'btn-s', icono: 'speaker', valor: 'escuchar', voz: ['escuch', 'leer', 'leela'] },
      { texto: 'Cambiar algo', clase: 'btn-s', icono: 'edit', valor: 'cambiar', voz: ['cambi', 'corrig', 'no'] }
    ]);
    if (v === 'escuchar') { await hablar(textoGuiaCompleta(guia)); continue; }
    if (v === 'cambiar') {
      if (nueva && modoMock && window.MOCK.descartar) window.MOCK.descartar(guia.id);
      await hablar('Bueno, grabemos de nuevo. Tómese su tiempo.');
      return abrir('ensenar');
    }
    usuario.ensenados = (Number(usuario.ensenados) || 0) + 1;
    irAPantalla('publicada', { guia });
    return flujoPublicada(g, { guia });
  }
}

/* =========================================================
   E4 · Publicada
   ========================================================= */
async function flujoPublicada(g, { guia }) {
  if (!requiereUsuario()) return;
  const sec = $('#publicada');
  const revision = guia.estado === 'en revisión';
  lanzarConfeti(sec);
  $('#e4-titulo').textContent = revision ? 'Su guía quedó en revisión.' : 'Su guía ya está disponible.';
  $('#e4-dice').textContent = revision
    ? 'Apenas la revisemos, quedará publicada con su nombre. Le avisaremos por WhatsApp.'
    : 'Le avisaremos por WhatsApp cuando alguien aprenda de usted.';
  const c = cat(guia);
  $('#e4-tarjeta').innerHTML = (ilustracionDe(guia) ? ilustracion(ilustracionDe(guia))
    : `<div style="height: 220px; background: ${c.bg}; color: ${c.fg}; display: flex; align-items: center; justify-content: center">${icono(iconoGuia(guia), 110, 1.4)}</div>`)
    + `<div style="padding: 28px; display: flex; flex-direction: column; gap: 12px">
        <span class="pill" style="background: ${revision ? '#FFF1D6' : '#E6EEDC'}; color: ${revision ? '#6B4A0E' : '#2F451A'}; align-self: flex-start">${revision ? 'En revisión' : 'Publicada hoy'}</span>
        <h2 style="font-size: 1.5em; line-height: 1.15">${esc(guia.titulo)}</h2>
        <div class="con-icono" style="gap: 12px">${avatar(guia, 52)}<p>${esc(guia.autor)}${guia.edad ? ', ' + guia.edad : ''}${guia.comuna ? ' · ' + esc(guia.comuna) : ''}</p></div>
      </div>`;
  await hablar(`${$('#e4-titulo').textContent} ${$('#e4-dice').textContent} ¡Gracias por compartir lo que sabe, ${primerNombre(usuario.nombre)}!`);
  const v = await elegir([
    ...(revision ? [] : [{ texto: 'Ver cómo la ven quienes aprenden', clase: 'btn-p', valor: 'joven', voz: ['ver como', 'ver'] }]),
    { texto: 'Volver al inicio', clase: 'btn-s', icono: 'home', valor: 'inicio', voz: ['inicio', 'volver'] }
  ]);
  return v === 'joven' ? abrir('guia-joven', { guia }) : abrir('inicio');
}

/* =========================================================
   F1 · Mi historia (el sueño pendiente)
   ========================================================= */
async function flujoMiHistoria(g) {
  if (!requiereUsuario()) return;
  const guias = await traerGuias();
  vigente(g);
  const mias = guias.filter(esMia);
  const { hitos, logrados } = calcularHitos(mias);
  const sueno = usuario.sueno || '';
  const verbo = fraseSueno(sueno);
  $('#f1-titulo').innerHTML = sueno
    ? `${verbo ? `Usted quería ${esc(verbo)}.` : `Usted soñaba con: ${esc(sueno.toLowerCase())}.`} <span style="color: #8E3717">Nunca es tarde.</span>`
    : 'Su historia también enseña. <span style="color: #8E3717">Nunca es tarde.</span>';
  $('#f1-cita').innerHTML = sueno
    ? `Usted nos contó: <strong>«${esc(sueno)}.»</strong> ${mias.length ? 'Ya está enseñando. ' : ''}Este es su camino.`
    : 'Cada guía que enseña y cada historia que cuenta acompaña a alguien. Este es su camino.';
  $('#f1-ilus').innerHTML = ilustracion('pizarra', temaPizarra());
  $('#f1-logrados').querySelector('span').textContent = `${logrados} de 5 pasos logrados`;
  $('#f1-avance').style.width = logrados ? ((logrados - 1) * 20 + (logrados < 5 ? 10 : 0)) + '%' : '0';
  $('#f1-hitos').innerHTML = hitos.map((h, i) => {
    const done = h.estado === 'done', next = h.estado === 'next';
    const bg = done ? '#5B7B3A' : '#FFFFFF', fg = done ? '#FFFFFF' : next ? '#8E3717' : '#6B5A4C', bd = done ? '#5B7B3A' : next ? '#A9461F' : '#D9C3A5';
    const pbg = done ? '#E6EEDC' : next ? '#F8E0CC' : '#F3EDE3', pfg = done ? '#2F451A' : next ? '#8E3717' : '#4A3B30';
    return `<li class="hito"><span class="hito-circulo ${next ? 'pulse' : ''}" style="background: ${bg}; color: ${fg}; border: 4px solid ${bd}">${done ? icono('check', 44, 2.6) : i + 1}</span>
      <span class="hito-texto">${h.t}</span><span class="pill" style="background: ${pbg}; color: ${pfg}">${done ? 'Logrado' : next ? 'Siguiente' : 'Pendiente'}</span></li>`;
  }).join('');
  await hablar(`${$('#f1-titulo').textContent} Ya logró ${logrados} de 5 pasos.`);
}

/* =========================================================
   F2 · Lección de vida
   ========================================================= */
function pintarLeccion(l) {
  $('#f2-tarjeta').innerHTML = `
    <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap">
      ${avatar(usuario, 88)}
      <div style="flex-grow: 1"><p style="font-weight: 700; color: #8E3717; font-size: .85em">Lección de vida de ${esc(usuario.nombre)}${usuario.edad ? ', ' + usuario.edad : ''}</p><h1 id="f2-titulo" tabindex="-1" style="font-size: 1.9em; line-height: 1.1">«${esc(l.titulo)}»</h1></div>
      <div class="row" style="gap: 8px">${(l.etiquetas || []).map(t => `<span class="pill" style="background: #F6EBDA">${esc(t)}</span>`).join('')}</div>
    </div>
    <div class="g2" style="margin-top: 32px; gap: 20px">
      <section class="bloque" style="background: #F8E0CC"><h2 style="color: #8E3717">1 · Situación</h2><p>${esc(l.situacion)}</p></section>
      <section class="bloque" style="background: #E6EEDC"><h2 style="color: #2F451A">2 · Qué hice</h2><p>${esc(l.hice)}</p></section>
      <section class="bloque" style="background: #FBEACB"><h2 style="color: #6B4A0E">3 · Qué aprendí</h2><p>${esc(l.aprendi)}</p></section>
      <section class="bloque dark" style="background: #2B1D14; color: #FFF8EE"><h2 style="color: #E3A72F">4 · Mi consejo</h2><p style="font-weight: 700">${esc(l.consejo)}</p></section>
    </div>`;
}

async function flujoLeccion(g) {
  if (!requiereUsuario()) return;
  $('#f2-grabar').hidden = false;
  $('#f2-resultado').hidden = true;
  await hablar('Cuénteme un momento difícil de su vida y qué aprendió de él. Yo lo ordeno en cuatro partes para que cualquier persona lo entienda. Cuando termine, toque el micrófono.');
  const r = await pedirRespuesta({ etiqueta: 'O escriba su historia', boton: 'Ordenar mi historia', continuo: true });
  const leccion = await pensar(pausa(1200).then(() => window.MOCK.armarLeccion(r.texto, usuario)));
  vigente(g);
  usuario.leccion = true;
  $('#f2-grabar').hidden = true;
  $('#f2-resultado').hidden = false;
  pintarLeccion(leccion);
  window.scrollTo(0, 0);
  await hablar(`Así quedó su lección. Le puse el título con sus propias palabras: «${leccion.titulo}».`);
  const v = await elegir([
    { texto: 'Compartir con quienes viven lo mismo', clase: 'btn-p', icono: 'users', valor: 'compartir', voz: ['compart', 'si', 'dale'] },
    { texto: 'Cambiar algo', clase: 'btn-s', icono: 'edit', valor: 'cambiar', voz: ['cambi', 'corrig', 'no'] }
  ]);
  if (v === 'cambiar') return abrir('leccion');
  window.MOCK.agregarLeccion({
    who: usuario.who, autor: usuario.nombre, edad: usuario.edad, comuna: usuario.comuna,
    titulo: leccion.titulo, etiqueta: (leccion.etiquetas || [])[0] || 'Cambié de rumbo',
    resumen: leccion.situacion, consejo: leccion.consejo
  });
  const listo = el(`<div class="card fade" style="width: 100%; padding: 28px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap; background: #EEF3E6; border-color: #B9CBA0">
      <span class="circulo-ok" style="width: 64px; height: 64px; box-shadow: none">${icono('check', 36)}</span>
      <p style="flex-grow: 1; font-weight: 700; font-size: 1.1em">Listo. Su lección ya acompaña a quienes viven lo mismo.</p>
    </div>`);
  ponerControles(listo);
  await hablar('Listo. Su lección ya acompaña a quienes viven lo mismo.');
  const fin = await elegir([
    { texto: 'Ver cómo la ven', clase: 'btn-o', valor: 'ver', voz: ['ver'] },
    { texto: 'Volver al inicio', clase: 'btn-s', icono: 'home', valor: 'inicio', voz: ['inicio', 'volver'] }
  ]);
  return fin === 'ver' ? abrir('experiencia') : abrir('inicio');
}

/* =========================================================
   G · Mis guías y gracias
   ========================================================= */
function pintarCelular(gracias) {
  const ahora = new Date();
  const hora = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fecha = ahora.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  const [g1, g2] = gracias;
  const pn = primerNombre(usuario.nombre);
  $('#mg-celular-titulo').textContent = `Lo que le llega ${aQuien(pn)} en su celular`;
  $('#mg-celular').setAttribute('aria-label', g1 ? `Celular con una notificación de WhatsApp: ${g1.nombre} aprendió su ${g1.guia} gracias a usted` : 'Celular sin notificaciones todavía');
  $('#mg-celular').innerHTML = `<div class="celular-bloqueo-pantalla">
      <p style="font-size: 18px">${esc(fecha)}</p>
      <p style="font-size: 76px; font-weight: 700; line-height: 1; margin-top: 6px">${hora}</p>
      ${g1 ? `<div class="notif notificacion" style="margin-top: 36px">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 14px"><span class="wa-ico">${icono('chat', 16)}</span><span style="font-weight: 700">WhatsApp</span><span style="margin-left: auto">ahora</span></div>
        <p style="font-weight: 700; margin-top: 10px; font-size: 17px">SABERES</p>
        <p style="margin-top: 4px; font-size: 18px; font-weight: 700; line-height: 1.25">${esc(g1.nombre)} aprendió su ${esc(g1.guia)} gracias a usted.</p>
        <p style="margin-top: 8px; font-size: 16px">Le dejó un mensaje: «${esc(g1.mensaje)}»</p>
      </div>` : `<div class="notificacion" style="margin-top: 36px; background: rgba(255,253,248,.88)"><p style="font-size: 16px">Cuando alguien aprenda de usted, le llegará un WhatsApp aquí.</p></div>`}
      ${g2 ? `<div class="notif2 notificacion" style="margin-top: 12px; background: rgba(255,253,248,.88); box-shadow: none">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 14px"><span class="wa-ico">${icono('chat', 16)}</span><span style="font-weight: 700">WhatsApp</span><span style="margin-left: auto">hace 2 h</span></div>
        <p style="margin-top: 8px; font-size: 16px"><strong>SABERES:</strong> ${esc(g2.nombre)}${g2.edad ? ', ' + g2.edad : ''}, también le dio las gracias.</p>
      </div>` : ''}
    </div>`;
}

function textoGracias(gracias) {
  return gracias.map(x => `${x.nombre}${x.edad ? ', de ' + x.edad + ' años' : ''}, aprendió su ${x.guia} gracias a usted. Le dice: ${x.mensaje}`).join(' ');
}

async function flujoMisGuias(g) {
  if (!requiereUsuario()) return;
  const guias = await traerGuias();
  vigente(g);
  const mias = guias.filter(esMia);
  const total = mias.reduce((s, x) => s + (Number(x.aprendieron) || 0), 0);
  const frase = total === 1 ? 'persona aprendió con usted' : 'personas aprendieron con usted';
  $('#contador-texto').innerHTML = `<span id="contador-numero">${total}</span> ${frase}`;

  const lista = $('#lista-mis-guias');
  lista.innerHTML = '';
  if (!mias.length) {
    lista.append(el('<li class="card mi-guia"><p>Todavía no tiene guías. Lo que usted sabe le puede servir a mucha gente.</p></li>'));
    lista.append(boton('Quiero enseñar', 'btn-p', () => abrir('ensenar'), 'board'));
  }
  mias.forEach(guia => {
    const c = cat(guia);
    const leccion = guia.categoria === 'historias';
    const fecha = guia.estado === 'en revisión' ? 'En revisión' : guia.publicada ? `Publicada el ${guia.publicada}` : 'Publicada hoy';
    lista.append(el(`<li class="card mi-guia">
        <span class="icono-caja" style="width: 64px; height: 64px; border-radius: 18px; background: ${c.bg}; color: ${c.fg}">${icono(iconoGuia(guia), 36)}</span>
        <div style="flex-grow: 1; min-width: 200px"><p style="font-weight: 700; font-size: 1.1em">${esc(guia.titulo)}</p><p style="font-size: .85em">${esc(fecha)}</p></div>
        <p class="mi-guia-num"><span style="font-size: 1.6em">${Number(guia.aprendieron) || 0}</span><br><span style="font-size: .85em">${leccion ? 'personas la guardaron' : 'personas aprendieron'}</span></p>
      </li>`));
  });

  const gracias = window.MOCK.gracias(usuario.id);
  $('#mg-muro').innerHTML = gracias.length ? gracias.map(x => `<article class="card gracia">
      <div style="display: flex; gap: 14px; align-items: center">${avatar(x, 60)}<p><strong>${esc(x.nombre)}${x.edad ? ', ' + x.edad : ''}</strong>${x.comuna ? ', de ' + esc(x.comuna) : ''}, aprendió su <strong>${esc(x.guia)}</strong> gracias a usted.</p></div>
      <p class="gracia-msg">«${esc(x.mensaje)}»</p>
      <p style="font-size: .85em; font-weight: 700; color: #8E3717">${esc(x.cuando)}</p>
    </article>`).join('') : '<p class="card gracia" style="grid-column: 1 / -1">Cuando alguien aprenda de usted, sus gracias aparecerán aquí.</p>';
  $('#mg-escuchar').onclick = () => hablar(gracias.length ? textoGracias(gracias) : 'Todavía no hay gracias. Cuando alguien aprenda de usted, le avisaremos.').catch(() => {});
  pintarCelular(gracias);

  await hablar(`${total} ${frase}. ¡Gracias por compartir lo que sabe!` + (gracias[0] ? ` ${gracias[0].nombre} aprendió su ${gracias[0].guia} gracias a usted.` : ''));
}

/* =========================================================
   Vista Aprender · J1 Explorar (para cualquier persona)
   ========================================================= */
let guiasJovenes = [];

function pintarFiltrosJovenes() {
  const caja = $('#filtros');
  const claves = ['todas', ...Object.keys(CATEGORIAS)];
  caja.innerHTML = '';
  claves.forEach(k => {
    const n = k === 'todas' ? guiasJovenes.length : guiasJovenes.filter(x => x.categoria === k).length;
    const li = el(`<li><button type="button" class="catbtn ${filtroCategoria === k ? 'on' : ''}" aria-pressed="${filtroCategoria === k}"><span>${k === 'todas' ? 'Todas' : CATEGORIAS[k].nombre}</span><span style="font-size: 15px">${n}</span></button></li>`);
    li.querySelector('button').addEventListener('click', () => { filtroCategoria = k; pintarFiltrosJovenes(); pintarListaJovenes(); });
    caja.append(li);
  });
}

function pintarListaJovenes() {
  const palabras = normal($('#buscador').value).split(' ').filter(Boolean);
  const visibles = guiasJovenes.filter(guia => {
    if (filtroCategoria !== 'todas' && guia.categoria !== filtroCategoria) return false;
    const texto = normal([guia.titulo, cat(guia).nombre, guia.autor, guia.comuna, ...(guia.materiales || []), ...(guia.claves || [])].join(' '));
    return palabras.every(p => texto.includes(p));
  }).sort((a, b) => (b.aprendieron || 0) - (a.aprendieron || 0));
  $('#j-cuenta').textContent = `${visibles.length === 1 ? '1 guía' : visibles.length + ' guías'} · las más agradecidas primero`;
  const lista = $('#lista-jovenes');
  lista.innerHTML = '';
  visibles.forEach(guia => lista.append(tarjetaGuia(guia, () => abrir('guia-joven', { guia }), true)));
  if (!visibles.length) lista.append(el('<p class="card" style="padding: 28px; grid-column: 1 / -1">No hay guías con esa búsqueda todavía. Pruebe con otra palabra o categoría.</p>'));
}

function pintarJovenUsuario() {
  const nombre = leerLocal('saberes-joven');
  $('#joven-usuario').hidden = !nombre;
  if (nombre) {
    $('#joven-avatar').innerHTML = avatar({ nombre }, 40);
    $('#joven-nombre').textContent = nombre;
  }
}

async function flujoJovenes(g) {
  pintarJovenUsuario();
  guiasJovenes = (await traerGuias()).filter(x => x.estado !== 'en revisión');
  vigente(g);
  pintarFiltrosJovenes();
  pintarListaJovenes();
}

/* =========================================================
   J2 · Guía (vista Aprender)
   ========================================================= */
function pintarAvanceJoven(total, hechos) {
  $('#j2-avance-texto').textContent = `${hechos} de ${total} pasos`;
  $('#j2-barra').style.width = (total ? Math.round(hechos / total * 100) : 0) + '%';
}

async function flujoGuiaJoven(g, { guia }) {
  pintarJovenUsuario();
  const c = cat(guia);
  const pn = nombreAutor(guia.autor);
  $('#j2-pills').innerHTML = `<span class="pill" style="background: #F6EBDA; font-size: 15px">${esc(c.nombre)}</span>`
    + (guia.categoria !== 'historias' ? `<span class="pill" style="background: #E6EEDC; color: #2F451A; font-size: 15px">${esc(guia.nivel || 'Principiante')}${guia.duracion ? ' · ' + esc(guia.duracion) : ''}</span>` : '');
  $('#j2-titulo').textContent = guia.titulo;
  $('#j2-cuenta').textContent = `${Number(guia.aprendieron) || 0} personas aprendieron con esta guía`;

  const cuerpo = $('#j2-cuerpo');
  const gracias = `<div class="card" style="padding: 28px; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; background: #FFFDF8" id="j2-resulto">
      <p style="font-size: 22px; font-weight: 700">${guia.leccion ? '¿Le sirvió?' : '¿Le resultó?'}</p>
      <button type="button" class="btn btn-p" id="j2-gracias" style="font-size: 21px">${icono('heart', 26)}<span>¡Aprendí! Darle las gracias ${esc(aQuien(pn))}</span></button>
    </div>`;
  if (guia.leccion) {
    const l = guia.leccion;
    cuerpo.innerHTML = `<div class="g2" style="gap: 16px">
        <section class="bloque" style="background: #F8E0CC"><h2 style="color: #8E3717">1 · Situación</h2><p>${esc(l.situacion)}</p></section>
        <section class="bloque" style="background: #E6EEDC"><h2 style="color: #2F451A">2 · Qué hizo</h2><p>${esc(l.hice)}</p></section>
        <section class="bloque" style="background: #FBEACB"><h2 style="color: #6B4A0E">3 · Qué aprendió</h2><p>${esc(l.aprendi)}</p></section>
        <section class="bloque dark" style="background: #2B1D14; color: #FFF8EE"><h2 style="color: #E3A72F">4 · Su consejo</h2><p style="font-weight: 700">${esc(l.consejo)}</p></section>
      </div>${gracias}`;
  } else {
    const pasos = guia.pasos || [];
    const hechos = new Set();
    cuerpo.innerHTML = `<div>
        <div style="display: flex; justify-content: space-between; font-weight: 700"><span>Su avance</span><span id="j2-avance-texto"></span></div>
        <div class="barra-suave" style="height: 12px; margin-top: 8px"><div id="j2-barra" class="barra-verde" style="background: #3F5A24"></div></div>
      </div>
      ${(guia.materiales || []).length ? `<div class="card" style="padding: 20px 24px"><p style="font-weight: 700">Va a necesitar</p><p class="row" style="gap: 8px; margin-top: 10px">${guia.materiales.map(m => `<span class="pill" style="background: #F6EBDA; font-weight: 400; font-size: 15px">${esc(m)}</span>`).join('')}</p></div>` : ''}
      <ol style="display: flex; flex-direction: column; gap: 12px" id="j2-pasos"></ol>
      ${gracias}`;
    const ol = $('#j2-pasos');
    pasos.forEach((p, i) => {
      const li = el(`<li><button type="button" class="steprow" aria-pressed="false"><span class="check">${icono('check', 24, 3)}</span><span><span style="display: block; font-weight: 700; color: #8E3717; font-size: 15px">Paso ${i + 1}</span><span style="display: block; margin-top: 2px">${esc(p)}</span></span></button></li>`);
      const b = li.querySelector('button');
      b.addEventListener('click', () => {
        hechos.has(i) ? hechos.delete(i) : hechos.add(i);
        const on = hechos.has(i);
        b.classList.toggle('on', on);
        b.querySelector('.check').classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
        pintarAvanceJoven(pasos.length, hechos.size);
        if (hechos.size === pasos.length) $('#j2-resulto').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      ol.append(li);
    });
    pintarAvanceJoven(pasos.length, 0);
  }
  $('#j2-gracias').addEventListener('click', () => abrir('gracias-joven', { guia }));

  // Ficha de la autora o autor, con la guía leída en voz alta
  $('#j2-autor').innerHTML = `${avatar(guia, 104)}
    <div><p style="font-size: 22px; font-weight: 700">${esc(guia.autor)}${guia.edad ? ', ' + guia.edad : ''}</p>${guia.comuna ? `<p class="con-icono" style="gap: 6px">${icono('pin', 18)}${esc(guia.comuna)}</p>` : ''}</div>
    ${guia.bio ? `<p>${esc(guia.bio)}</p>` : ''}
    <div style="background: #FFF8EE; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px">
      <p style="font-weight: 700">Escucha la guía en voz alta</p>
      <div style="display: flex; align-items: center; gap: 12px">
        <button type="button" id="j2-play" aria-label="Escuchar la guía" style="width: 52px; height: 52px; border-radius: 50%; background: #A9461F; color: #FFFFFF; display: flex; align-items: center; justify-content: center; flex: none">${icono('play', 24)}</button>
        <div style="flex-grow: 1; height: 10px; background: #F3E5D0; border-radius: 6px; overflow: hidden"><div class="audiofill" id="j2-audio"></div></div>
      </div>
      <p style="font-size: 15px">Con la voz de SABERES.</p>
    </div>`;
  const play = $('#j2-play');
  play.addEventListener('click', async () => {
    if (play.dataset.sonando) { callar(); setEstado(null); return; }
    const texto = guia.leccion ? `${guia.titulo}. ${guia.leccion.situacion} ${guia.leccion.hice} ${guia.leccion.aprendi} Su consejo: ${guia.leccion.consejo}` : textoGuiaCompleta(guia);
    const barra = $('#j2-audio');
    play.dataset.sonando = '1';
    play.innerHTML = icono('pause', 24);
    play.setAttribute('aria-label', 'Detener');
    barra.style.transition = `width ${Math.round(texto.length / 13 / velocidadVoz)}s linear`;
    barra.style.width = '100%';
    await hablar(texto).catch(() => {});
    delete play.dataset.sonando;
    play.innerHTML = icono('play', 24);
    play.setAttribute('aria-label', 'Escuchar la guía');
    barra.style.transition = 'none';
    barra.style.width = '0';
  });
}

/* =========================================================
   J3 · Dar las gracias
   ========================================================= */
async function flujoGraciasJoven(g, { guia }) {
  pintarJovenUsuario();
  const sec = $('#gracias-joven');
  const pn = nombreAutor(guia.autor);
  $('#j3-pendiente').hidden = false;
  $('#j3-enviado').hidden = true;
  sec.querySelector('.confetti').innerHTML = '';
  $('#j3-retrato').innerHTML = avatar(guia, 128);
  $('#j3-titulo').textContent = guia.leccion ? `¿Le sirvió la historia ${deQuien(pn)}?` : `¿Le resultó «${guia.titulo}»?`;
  $('#j3-sub').textContent = `Cuéntele ${aQuien(pn)}. Le llegará su mensaje por WhatsApp, leído en voz alta.`;
  $('#nombre-joven').value = leerLocal('saberes-joven') || '';
  const msg = $('#j3-msg');
  msg.value = '';
  msg.placeholder = `Escríbale algo ${aQuien(pn)}`;
  const rapidos = ['¡Me quedó muy bien! Gracias.', `Gracias por la paciencia, ${pn}.`, 'Lo hice para mi familia.'];
  const caja = $('#j3-rapidos');
  caja.innerHTML = '';
  rapidos.forEach(t => {
    const b = el(`<button type="button" class="chip" style="font-size: 16px">${esc(t)}</button>`);
    b.addEventListener('click', () => {
      msg.value = t;
      caja.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
    });
    caja.append(b);
  });
  const enviar = $('#j3-enviar');
  enviar.querySelector('span').textContent = `¡Aprendí! Darle las gracias ${aQuien(pn)}`;
  enviar.disabled = false;

  await cancelable((resolver) => { enviar.onclick = () => resolver(); });
  enviar.disabled = true;
  const aprendiz = $('#nombre-joven').value.trim() || 'Una persona';
  if ($('#nombre-joven').value.trim()) guardarLocal('saberes-joven', aprendiz);
  const mensaje = msg.value.trim() || '¡Gracias por enseñarme!';
  const r = await pensar(post('/api/aprendi', { guiaId: guia.id, aprendiz, mensaje }));
  vigente(g);
  if (r?.aprendieron != null) guia.aprendieron = r.aprendieron;
  pintarJovenUsuario();
  $('#j3-pendiente').hidden = true;
  $('#j3-enviado').hidden = false;
  lanzarConfeti(sec);
  $('#j3-ok').textContent = `${mayus(pn)} recibirá su agradecimiento por WhatsApp`;
  $('#j3-wa').innerHTML = `<p class="con-icono" style="gap: 8px; font-size: 14px; font-weight: 700"><span class="wa-ico" style="width: 22px; height: 22px; border-radius: 6px">${icono('chat', 14)}</span>WhatsApp · SABERES</p>
    <p style="font-weight: 700; margin-top: 8px">${esc(aprendiz)} aprendió su ${esc(guia.titulo.toLowerCase())} gracias a usted.</p>
    <p style="margin-top: 4px">«${esc(mensaje)}»</p>`;
  await hablar(`Le enviamos su agradecimiento a ${guia.autor}.`);
}

/* =========================================================
   J4 · Por experiencia
   ========================================================= */
const EXPERIENCIAS = ['Todas', 'Estudio y trabajo', 'Primera generación', 'Cambié de rumbo', 'Cuidé a mi familia'];

function pintarExperiencia() {
  const filtros = $('#j4-filtros');
  filtros.innerHTML = '';
  EXPERIENCIAS.forEach(x => {
    const b = el(`<button type="button" class="chip ${filtroExperiencia === x ? 'on' : ''}" aria-pressed="${filtroExperiencia === x}" style="font-size: 17px">${esc(x)}</button>`);
    b.addEventListener('click', () => { filtroExperiencia = x; pintarExperiencia(); });
    filtros.append(b);
  });
  const lecciones = window.MOCK.lecciones().filter(l => filtroExperiencia === 'Todas' || l.etiqueta === filtroExperiencia);
  const lista = $('#j4-lista');
  lista.innerHTML = '';
  lecciones.forEach(l => {
    const card = el(`<article class="card leccion-card">
        <div style="display: flex; gap: 14px; align-items: center">
          ${avatar(l, 64)}
          <div><p style="font-weight: 700">${esc(l.autor)}${l.edad ? ', ' + l.edad : ''}</p><p style="font-size: 16px">${esc(l.comuna || '')}</p></div>
          ${l.nueva ? '<span class="pill" style="margin-left: auto; background: #2B1D14; color: #FFF8EE; font-size: 13px">Nueva</span>' : ''}
        </div>
        <span class="pill" style="align-self: flex-start; background: #E6EEDC; color: #2F451A; font-size: 14px">${esc(l.etiqueta)}</span>
        <h2 style="font-size: 22px; line-height: 1.2">«${esc(l.titulo)}»</h2>
        <p style="font-size: 17px">${esc(l.resumen)}</p>
        <p style="font-size: 17px; background: #FFF8EE; border-radius: 12px; padding: 12px 14px"><strong>Su consejo:</strong> ${esc(l.consejo)}</p>
        <button type="button" class="btn btn-s btn-sm" style="align-self: flex-start; margin-top: auto">${icono('play', 18)}<span>Escuchar · ${esc(l.minutos || '3 min')}</span></button>
      </article>`);
    card.querySelector('button').addEventListener('click', () => hablar(`${l.titulo}. ${l.autor} cuenta: ${l.resumen} Su consejo: ${l.consejo}`).catch(() => {}));
    lista.append(card);
  });
  if (!lecciones.length) lista.append(el('<p class="card" style="padding: 28px; grid-column: 1 / -1">Todavía no hay historias con esa experiencia.</p>'));
}

async function flujoExperiencia() {
  pintarJovenUsuario();
  pintarExperiencia();
}

/* =========================================================
   Escuchar esta página · tamaño de letra · teclado
   ========================================================= */
// Todo lo que se ve en la pantalla, en orden y una sola vez: títulos, globos, listas,
// tarjetas y botones grandes con descripción. Se saltan controles cortos y ayudas.
const NO_LEER = /^(SABERES le (dice|pregunta)|o presione la barra|La escucho|Escuchando|O escriba)/i;

function textoDePantalla() {
  const sec = document.querySelector('.pantalla:not([hidden])');
  if (!sec) return '';
  const vistos = new Set();
  const partes = [];
  for (const e of sec.querySelectorAll('h1, h2, h3, h4, p, li, blockquote, .steprow, button, a')) {
    if (!visible(e) || !e.getClientRects().length || e.closest('[aria-hidden="true"], label, .speaker-boton')) continue;
    const esControl = e.matches('button, a');
    // Un botón o link solo se lee si es una tarjeta con descripción (ej. «Quiero aprender · Le enseño…»)
    if (esControl && e.innerText.trim().split(/\s+/).length < 5) continue;
    // Se lee el elemento más externo que tenga el texto; lo de adentro ya va incluido
    if (!esControl && e.parentElement.closest('li, blockquote, .steprow, button, a') && sec.contains(e.parentElement)) continue;
    // Cada línea visible (título, descripción) termina en punto: así la voz hace la pausa
    const t = e.innerText.split(/\n+/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
      .map(s => (/[.!?…:»"]$/.test(s) ? s : s + '.')).join(' ');
    if (t.length < 3 || NO_LEER.test(t) || vistos.has(t)) continue;
    vistos.add(t);
    partes.push(t);
  }
  return partes.join(' ');
}

function alternarLectura() {
  const btn = $('#btn-escuchar-pagina');
  if (btn.classList.contains('on')) { callar(); setEstado(null); return; }
  const texto = textoDePantalla();
  if (!texto) return;
  hablar(texto).catch(() => {});
  btn.classList.add('on');
  btn.setAttribute('aria-pressed', 'true');
}

function ponerTamano(i) {
  $('#app').style.fontSize = `calc(var(--base) * ${ESCALAS[i] || 1})`;
  document.querySelectorAll('[data-fs]').forEach(b => {
    const on = Number(b.dataset.fs) === i;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  guardarLocal('saberes-letra', String(i));
}

// Barra espaciadora = tocar el micrófono visible
function teclado(e) {
  const tag = (e.target && e.target.tagName) || '';
  if (e.key === 'Escape' && !$('#demo').hidden) { $('#demo').hidden = true; return; }
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
  if (e.key === 'd' || e.key === 'D') { e.preventDefault(); alternarDemo(); return; }
  if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') {
    const mic = [...document.querySelectorAll('.pantalla:not([hidden]) .mic')].find(visible);
    if (mic) { e.preventDefault(); mic.click(); }
  }
}

// El parlante junto a cada globo «SABERES le dice» lee ese mensaje en voz alta
function hacerParlantesTocables() {
  document.querySelectorAll('.dice > .speaker').forEach(sp => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'speaker speaker-boton';
    b.innerHTML = sp.innerHTML;
    b.setAttribute('aria-label', 'Escuchar este mensaje');
    b.title = 'Escuchar este mensaje';
    b.addEventListener('click', () => {
      const burbuja = b.parentElement.querySelector('.bubble');
      const texto = [...burbuja.querySelectorAll('h1, p:not(.bubble-titulo)')].map(e => e.textContent.trim()).filter(Boolean).join(' ');
      if (texto) hablar(texto).catch(() => {});
    });
    sp.replaceWith(b);
  });
}

/* =========================================================
   Menú de demo (tecla D) para presentar frente al jurado
   ========================================================= */
const RELATO_DEMO = 'Ya, mijo, mire: primero se pone la harina en el mesón, harto espacio, y se le hace un hoyito al medio, como un volcán. La sal va por el ladito, nunca encima de la levadura, porque la mata. Después la manteca tibia, no caliente, y el agua de a poquito. Y ahí se amasa, se amasa harto, con la palma de la mano, unos diez minutos, hasta que la masa ya no se le pegue en los dedos. Mi mamá decía que el pan sabe a las manos que lo amasan.';

const GRUPOS_DEMO = [
  { g: 'BIENVENIDA', items: [['bienvenida', 'A · Portada'], ['entrar', 'Entrar con la voz']] },
  { g: 'REGISTRO', items: [['registro', 'B · Registro por voz'], ['perfil', 'B2 · Su perfil'], ['transicion', 'Transición emotiva']] },
  { g: 'INICIO Y APRENDER', items: [['inicio', 'C · Inicio'], ['aprender', 'D1 · ¿Qué quiere aprender?'], ['guia', 'D2 · Paso a paso'], ['logro', 'D3 · ¡Lo logró!']] },
  { g: 'ENSEÑAR', items: [['ensenar', 'E1 · Grabar'], ['ordenando', 'E2 · Ordenando'], ['guia-creada', 'E3 · Guía creada'], ['publicada', 'E4 · Publicada']] },
  { g: 'MI HISTORIA Y GRACIAS', items: [['mi-historia', 'F1 · Mi sueño'], ['leccion', 'F2 · Lección de vida'], ['mis-guias', 'G · Guías y gracias']] },
  { g: 'VISTA APRENDER', items: [['jovenes', 'J1 · Explorar'], ['guia-joven', 'J2 · Guía'], ['gracias-joven', 'J3 · Dar las gracias'], ['experiencia', 'J4 · Por experiencia']] }
];
const RECORRIDO_DEMO = [['bienvenida', 'Portada'], ['registro', 'Registro'], ['perfil', 'Perfil'], ['inicio', 'Inicio'], ['ensenar', 'Enseñar'],
  ['guia-creada', 'Guía creada'], ['publicada', 'Publicada'], ['jovenes', 'Alguien explora'], ['gracias-joven', 'Da las gracias'], ['mis-guias', 'WhatsApp'], ['mi-historia', 'Su sueño']];

async function irDemo(id) {
  $('#demo').hidden = true;
  const necesitaUsuario = !['bienvenida', 'entrar', 'registro', 'jovenes', 'guia-joven', 'gracias-joven', 'experiencia'].includes(id);
  if (necesitaUsuario && !usuario) { usuario = window.MOCK.usuarioDemo(); pintarBarraUsuario(); }
  if (id === 'registro') estadoRegistro = { paso: 0, respuestas: {} };
  const guias = await traerGuias();
  const pan = guias.find(x => x.id === 'g-pan-amasado') || guias[0];
  const video = guias.find(x => x.id === 'g-videollamada') || guias[0];
  const args = {
    guia: { guia: video }, logro: { guia: video }, ordenando: { relato: RELATO_DEMO },
    'guia-creada': { guia: pan }, publicada: { guia: pan }, 'guia-joven': { guia: pan }, 'gracias-joven': { guia: pan }
  }[id] || {};
  abrir(id, args);
}

function alternarDemo() {
  const d = $('#demo');
  d.hidden = !d.hidden;
  if (d.hidden) return;
  const actual = pantallaActual && pantallaActual.id;
  $('#demo-recorrido').innerHTML = '';
  RECORRIDO_DEMO.forEach(([id, l], i) => {
    const li = el(`<li><button type="button" class="chip ${id === actual ? 'on' : ''}" style="font-size: 15px; min-height: 44px">${i + 1} · ${l}</button></li>`);
    li.querySelector('button').addEventListener('click', () => irDemo(id));
    $('#demo-recorrido').append(li);
  });
  $('#demo-grupos').innerHTML = '';
  GRUPOS_DEMO.forEach(gr => {
    const caja = el(`<div style="background: #FFF8EE; border-radius: 16px; padding: 14px"><p style="font-weight: 700; font-size: 14px; letter-spacing: .04em; color: #8E3717; padding: 0 14px 6px">${gr.g}</p></div>`);
    gr.items.forEach(([id, l]) => {
      const b = el(`<button type="button" class="demo-item" style="${id === actual ? 'background: #2B1D14; color: #FFF8EE' : ''}">${l}</button>`);
      b.addEventListener('click', () => irDemo(id));
      caja.append(b);
    });
    $('#demo-grupos').append(caja);
  });
  $('#demo-cerrar').focus();
}

/* =========================================================
   Arranque
   ========================================================= */
function init() {
  pintarDibujos();
  document.querySelectorAll('[data-zona-voz]').forEach(construirZona);
  $('#e1-onda').innerHTML = Array.from({ length: 52 }, (_, i) => `<i style="height:${28 + (i * 53) % 72}%;animation-delay:${((i * 0.093) % 1.2).toFixed(2)}s"></i>`).join('');
  micEstado($('#e1-mic'), 'idle');
  micEstado($('#c-mic'), 'idle');
  if (modoMock) $('#aviso-mock').hidden = false;
  ponerTamano(Number(leerLocal('saberes-letra')) || 0);

  // Navegación por data-ir / data-accion
  document.addEventListener('click', (e) => {
    const ir = e.target.closest('[data-ir]');
    if (ir) { e.preventDefault(); return abrir(ir.dataset.ir); }
    const acc = e.target.closest('[data-accion]');
    if (acc && acc.dataset.accion === 'registro') { estadoRegistro = { paso: 0, respuestas: {} }; usuario = null; return abrir('registro'); }
    if (acc && acc.dataset.accion === 'entrar') return abrir('entrar');
    if (e.target.closest('[data-volver]')) return volver();
  });
  $('#btn-volver').addEventListener('click', volver);
  $('#btn-marca').addEventListener('click', () => abrir(usuario && document.body.dataset.barra === 'app' ? 'inicio' : 'bienvenida'));
  $('#btn-soy-mayor').addEventListener('click', () => abrir(usuario ? 'inicio' : 'bienvenida'));
  $('#btn-escuchar-pagina').addEventListener('click', alternarLectura);
  $('#btn-detener').addEventListener('click', () => { callar(); setEstado(null); });
  $('#btn-otra-vez').addEventListener('click', () => { if (ultimoTexto) hablar(ultimoTexto).catch(() => {}); });
  $('#btn-escuchar-joven').addEventListener('click', () => {
    const b = $('#btn-escuchar-joven');
    if (b.classList.contains('on')) { callar(); setEstado(null); return; }
    const t = textoDePantalla();
    if (t) { hablar(t).catch(() => {}); b.classList.add('on'); }
  });
  hacerParlantesTocables();
  document.querySelectorAll('[data-fs]').forEach(b => b.addEventListener('click', () => ponerTamano(Number(b.dataset.fs))));
  $('#j-buscar').addEventListener('submit', (e) => { e.preventDefault(); pintarListaJovenes(); });
  $('#buscador').addEventListener('input', pintarListaJovenes);
  $('#demo-fab').addEventListener('click', alternarDemo);
  $('#demo-cerrar').addEventListener('click', () => { $('#demo').hidden = true; });
  $('#demo').addEventListener('click', (e) => { if (e.target.id === 'demo') $('#demo').hidden = true; });
  document.addEventListener('keydown', teclado);

  pantallaActual = { id: 'bienvenida', args: {} };
  irA('bienvenida');
  ejecutar(flujoBienvenida);
}

init();
