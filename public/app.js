/* =========================================================
   SABERES · Interfaz
   Pantallas, voz (hablar / escuchar) y flujos de la demo.
   ========================================================= */
'use strict';

// ---------- Estado global (mínimo) ----------
let usuario = null;        // persona mayor con sesión
let velocidadVoz = 0.9;    // rate de la voz; "más lento" la baja a 0.75
let guiaActual = null;     // guía que se está siguiendo

// ---------- Estado interno ----------
const CANCELADO = { cancelado: true };   // se usa para cortar un flujo al cambiar de pantalla
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const ERRORES_MIC = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network'];
let micOk = !!SR;
let modoMock = new URLSearchParams(location.search).get('mock') === '1';
let vista = 'mayores';
let generacion = 0;        // sube cada vez que se cancela todo
let turnoHabla = 0;        // sube cada vez que se corta la voz
let reconActual = null;    // reconocimiento de voz en curso
let grabando = false;
let filtroCategoria = 'todas';
let guiasJovenes = [];
const pendientes = new Set();

const CATEGORIAS = {
  cocina: '🍞 Cocina', oficios: '🔧 Oficios', huerto: '🌱 Huerto',
  hogar: '🏠 Hogar', digital: '📱 Digital', historias: '📖 Historias'
};

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

function listaConY(a) {
  return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
}

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

/* =========================================================
   Estado visible y subtítulos
   ========================================================= */
const ESTADOS = {
  escuchando: ['🎤', 'Escuchando…'],
  pensando: ['💭', 'Pensando…'],
  hablando: ['🔊', 'Hablando']
};

function setEstado(tipo) {
  const e = $('#estado');
  if (!tipo) { e.hidden = true; e.className = 'estado'; return; }
  const [icono, texto] = ESTADOS[tipo];
  e.className = 'estado estado-' + tipo;
  e.innerHTML = `<span class="icono-estado" aria-hidden="true">${icono}</span><span>${texto}</span>`;
  e.hidden = false;
}

function mostrarSubtitulo(texto) {
  $('#subtitulo').textContent = texto;
  $('#subtitulos').classList.toggle('visible', !!texto);
}

// Muestra "Pensando…" mientras espera una respuesta
async function pensar(promesa) {
  setEstado('pensando');
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

function decir(trozo) {
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

function callar() {
  turnoHabla++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// Lee en voz alta y SIEMPRE muestra el subtítulo
function hablar(texto) {
  texto = String(texto ?? '').trim();
  mostrarSubtitulo(texto);
  if (!texto || !('speechSynthesis' in window)) return Promise.resolve();
  callar();
  const turno = turnoHabla;
  return cancelable(async (resolver) => {
    setEstado('hablando');
    await pausa(80);
    for (const parte of trozos(texto)) {
      if (turno !== turnoHabla) return resolver();
      await decir(parte);
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

// Reconoce una frase
function escuchar() {
  if (!micOk) return Promise.reject(new Error('sin-microfono'));
  callar();
  detenerEscucha();
  return new Promise((res, rej) => {
    const r = new SR();
    reconActual = r;
    r.lang = 'es-CL';
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 1;
    let texto = '', fallo = null;
    r.onresult = (e) => { texto = e.results[0][0].transcript; };
    r.onerror = (e) => {
      fallo = e.error;
      if (ERRORES_MIC.includes(e.error)) micOk = false;
    };
    r.onend = () => {
      if (reconActual === r) { reconActual = null; setEstado(null); }
      texto.trim() ? res(texto.trim()) : rej(new Error(fallo || 'sin-voz'));
    };
    setEstado('escuchando');
    try { r.start(); } catch (e) { reconActual = null; setEstado(null); rej(e); }
  });
}

// Si la voz falla, aparece un campo de texto grande
async function escucharConRespaldo() {
  const g = generacion;
  if (micOk) {
    try { return await escuchar(); } catch (e) { vigente(g); }
  }
  const motivo = micOk
    ? 'No le escuché bien. Puede intentarlo otra vez o escribirlo aquí:'
    : 'El micrófono no está disponible. Escríbalo aquí, por favor:';
  hablar(micOk ? 'No le escuché bien. Puede intentarlo otra vez, o escribirlo.' : 'Puede escribir su respuesta.').catch(() => {});
  return pedirTexto(motivo);
}

function pedirTexto(motivo) {
  return cancelable((resolver) => {
    const extra = micOk ? [boton('🎤 Hablar otra vez', 'btn-secundario', () => resolver(escucharConRespaldo()))] : [];
    const form = formularioTexto(motivo, 'Enviar', (texto) => { limpiarControles(); resolver(texto); }, extra);
    ponerControles(form);
    form.querySelector('input').focus();
  });
}

/* =========================================================
   Controles en pantalla (botones de respuesta)
   ========================================================= */
function limpiarControles() {
  $('#controles').innerHTML = '';
}

function ponerControles(...nodos) {
  const c = $('#controles');
  c.innerHTML = '';
  nodos.forEach(n => c.append(n));
  const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  c.scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' });
  return c;
}

function boton(texto, clase, accion) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + (clase || '');
  b.textContent = texto;
  if (accion) b.addEventListener('click', accion);
  return b;
}

function formularioTexto(etiqueta, textoBoton, alEnviar, extras = []) {
  const id = 'campo-' + Date.now();
  const form = el(`<form class="respaldo">
      <label for="${id}" class="etiqueta">${esc(etiqueta)}</label>
      <input id="${id}" class="campo-grande" type="text" autocomplete="off">
      <div class="fila-botones"></div>
    </form>`);
  const enviar = boton(textoBoton, 'btn-principal');
  enviar.type = 'submit';
  form.querySelector('.fila-botones').append(enviar, ...extras);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = form.querySelector('input').value.trim();
    if (v) alEnviar(v); else form.querySelector('input').focus();
  });
  return form;
}

/* =========================================================
   Esperar una orden: Listo, Repetir, Más lento, No entendí
   ========================================================= */
const ORDENES = [
  { tipo: 'listo', texto: '✅ Listo', clase: 'btn-principal' },
  { tipo: 'repetir', texto: '🔁 Repetir', clase: 'btn-secundario' },
  { tipo: 'lento', texto: '🐢 Más lento', clase: 'btn-secundario' },
  { tipo: 'duda', texto: '❓ No entendí', clase: 'btn-secundario' }
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

// Carrera entre la voz y los 4 botones. Resuelve { tipo, texto }
function esperarOrden() {
  const g = generacion;
  return cancelable((resolver) => {
    let hecho = false;
    const fin = (orden) => {
      if (hecho) return;
      hecho = true;
      detenerEscucha();
      limpiarControles();
      resolver(orden);
    };
    const fila = el('<div class="ordenes" role="group" aria-label="¿Cómo seguimos?"></div>');
    ORDENES.forEach(o => fila.append(boton(o.texto, o.clase, () => fin({ tipo: o.tipo, texto: o.tipo === 'duda' ? 'No entendí' : '' }))));
    const ayuda = el('<p class="ayuda-voz">Puede tocar un botón o decirlo: «listo», «repetir», «más lento» o «no entendí». Si tiene otra pregunta, hágala.</p>');
    ponerControles(ayuda, fila);

    // Sin micrófono: campo para escribir la duda
    const campoDuda = () => {
      if (hecho || $('#controles .respaldo')) return;
      $('#controles').append(formularioTexto('¿Tiene una duda? Escríbala aquí:', 'Preguntar', (texto) => fin({ tipo: 'duda', texto })));
    };

    (async () => {
      while (!hecho && g === generacion) {
        if (!micOk) { campoDuda(); return; }
        try {
          const t = await escuchar();
          if (!hecho && g === generacion) fin({ tipo: clasificarOrden(t), texto: t });
        } catch (e) { await pausa(300); }
      }
    })();
  });
}

/* =========================================================
   Confirmar: voz (sí, bueno, ya, dale, claro) o botones
   ========================================================= */
function clasificarSiNo(t, opciones) {
  const n = normal(t);
  if ((opciones.vozNo || []).some(p => n.includes(p))) return false;
  if ((opciones.vozSi || []).some(p => n.includes(p))) return true;
  if (/^(no|nop|tampoco|para nada)\b/.test(n) || /\b(repet|repit|corregir|corrige|cambiar|otra vez|esta mal)/.test(n)) return false;
  if (/\b(si|bueno|ya|dale|claro|correcto|esta bien|ok|okey|perfecto|exacto|de acuerdo|obvio|por supuesto|publica\w*)\b/.test(n)) return true;
  return null;
}

function confirmar(opciones = {}) {
  const { si = 'Sí', no = 'No' } = opciones;
  const g = generacion;
  return cancelable((resolver) => {
    let hecho = false;
    const fin = (v) => {
      if (hecho) return;
      hecho = true;
      detenerEscucha();
      limpiarControles();
      resolver(v);
    };
    const fila = el('<div class="fila-botones" role="group"></div>');
    fila.append(boton(si, 'btn-principal', () => fin(true)), boton(no, 'btn-secundario', () => fin(false)));
    const ayuda = el(`<p class="ayuda-voz">Toque un botón o diga «${esc(si.toLowerCase())}» o «${esc(no.toLowerCase())}».</p>`);
    ponerControles(ayuda, fila);

    (async () => {
      while (!hecho && g === generacion && micOk) {
        try {
          const v = clasificarSiNo(await escuchar(), opciones);
          if (v !== null && !hecho && g === generacion) fin(v);
        } catch (e) { await pausa(300); }
      }
    })();
  });
}

/* =========================================================
   Grabar hasta que toque "Terminé"
   ========================================================= */
function grabarHastaQueToque() {
  const g = generacion;
  const btn = $('#btn-terminar');
  const caja = $('#transcripcion');
  caja.value = '';
  caja.readOnly = true;
  $('#ensenar-aviso-mic').hidden = true;

  return cancelable((resolver) => {
    let final = '';
    const pintar = (parcial = '') => {
      caja.value = (final + parcial).trim();
      caja.scrollTop = caja.scrollHeight;
    };
    const modoEscritura = () => {
      grabando = false;
      detenerEscucha();
      caja.readOnly = false;
      caja.placeholder = 'Escriba aquí lo que quiere enseñar…';
      $('#ensenar-aviso-mic').hidden = false;
      btn.classList.remove('latiendo');
      setEstado(null);
      caja.focus();
    };
    const iniciar = () => {
      if (!grabando || g !== generacion) return;
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
        if (ERRORES_MIC.includes(e.error)) { micOk = false; modoEscritura(); }
      };
      // Chrome corta la grabación cada cierto rato: se reanuda sola
      r.onend = () => {
        if (reconActual === r) reconActual = null;
        if (grabando && g === generacion) setTimeout(iniciar, 250);
      };
      try { r.start(); setEstado('escuchando'); } catch (e) { setTimeout(iniciar, 500); }
    };

    btn.textContent = '⏹️ Terminé';
    btn.disabled = false;
    btn.onclick = () => {
      grabando = false;
      detenerEscucha();
      btn.classList.remove('latiendo');
      btn.disabled = true;
      setEstado(null);
      resolver(caja.value.trim());
    };

    if (micOk) {
      grabando = true;
      btn.classList.add('latiendo');
      callar();
      iniciar();
    } else {
      modoEscritura();
    }
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
    if (res.status < 500 && datos && datos.error) return datos;   // error "normal", p. ej. clave equivocada
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

/* =========================================================
   Navegación
   ========================================================= */
function irA(idPantalla) {
  document.querySelectorAll('.pantalla').forEach(s => { s.hidden = s.id !== idPantalla; });
  const casa = $('#btn-casa');
  casa.hidden = ['bienvenida', 'inicio', 'jovenes'].includes(idPantalla);
  casa.textContent = vista === 'jovenes' ? '← Volver a las guías' : '🏠 Volver al inicio';
  window.scrollTo(0, 0);
  const titulo = document.querySelector(`#${idPantalla} [tabindex="-1"]`);
  if (titulo) titulo.focus({ preventScroll: true });
}

function pantallaInicial() {
  if (vista === 'jovenes') return 'jovenes';
  return usuario ? 'inicio' : 'bienvenida';
}

// Detiene voz, micrófono y esperas pendientes
function cancelarTodo() {
  generacion++;
  grabando = false;
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
  inicio: (g) => flujoInicio(g),
  aprender: (g) => flujoAprender(g),
  ensenar: (g) => flujoEnsenar(g),
  'mis-guias': (g) => flujoMisGuias(g),
  jovenes: (g) => flujoJovenes(g)
};

function abrir(idPantalla) {
  return ejecutar(async (g) => {
    irA(idPantalla);
    if (ENTRADAS[idPantalla]) await ENTRADAS[idPantalla](g);
  });
}

function manejarError(e) {
  console.error('[SABERES]', e);
  setEstado(null);
  const aviso = el('<div class="aviso-error" role="alert"><p>Disculpe, algo no funcionó. No es su culpa.</p></div>');
  const texto = vista === 'jovenes' ? '← Volver a las guías' : '🏠 Volver al inicio';
  ponerControles(aviso, boton(texto, 'btn-principal', () => abrir(pantallaInicial())));
  hablar('Disculpe, algo no funcionó. No es su culpa. Puede volver al inicio cuando quiera.').catch(() => {});
}

/* =========================================================
   Avatares y tarjetas
   ========================================================= */
const COLORES_AVATAR = ['#1F5E4A', '#1E4A72', '#7A3E1D', '#5B3F8C', '#8A2E4B', '#2F5D62'];

function iniciales(nombre) {
  const p = String(nombre || '?').split(/\s+/)
    .filter(w => !/^(señora|senora|señor|senor|don|doña|dona|sra\.?|sr\.?)$/i.test(w));
  return ((p[0] || '?')[0] + ((p[1] || '')[0] || '')).toUpperCase();
}

function avatarHTML(guia, clase = '') {
  if (guia.foto) return `<img class="avatar ${clase}" src="${esc(guia.foto)}" alt="">`;
  const n = String(guia.autor || '');
  const color = COLORES_AVATAR[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORES_AVATAR.length];
  return `<span class="avatar ${clase}" style="background:${color}" aria-hidden="true">${esc(iniciales(n))}</span>`;
}

function textoAprendieron(n) {
  n = Number(n) || 0;
  return n === 1 ? '1 persona aprendió' : `${n} aprendieron`;
}

function tarjetaMayor(guia, alTocar) {
  const revision = guia.estado === 'en revisión' ? '<span class="insignia insignia-revision">⏳ En revisión</span>' : '';
  const b = el(`<button type="button" class="tarjeta-guia">
      ${avatarHTML(guia)}
      <span class="tg-cuerpo">
        <span class="tg-titulo">${esc(guia.titulo)}</span>
        <span class="tg-meta">De ${esc(guia.autor)}${guia.comuna ? ', ' + esc(guia.comuna) : ''}</span>
        <span class="tg-meta">${CATEGORIAS[guia.categoria] || esc(guia.categoria)} · ${textoAprendieron(guia.aprendieron)}</span>
        ${revision}
      </span>
    </button>`);
  b.addEventListener('click', alTocar);
  return b;
}

function tarjetaJoven(guia, alTocar) {
  const datos = [guia.edad ? `${guia.edad} años` : '', guia.comuna].filter(Boolean).join(' · ');
  const b = el(`<button type="button" class="tarjeta-joven">
      <span class="tj-autor">
        ${avatarHTML(guia)}
        <span><span class="tj-nombre">${esc(guia.autor)}</span><span class="tj-datos">${esc(datos)}</span></span>
      </span>
      <span class="tj-titulo">${esc(guia.titulo)}</span>
      <span class="tj-pie">
        <span class="chip">${CATEGORIAS[guia.categoria] || esc(guia.categoria)}</span>
        <span class="tj-aprendieron">${textoAprendieron(guia.aprendieron)}</span>
      </span>
    </button>`);
  b.addEventListener('click', alTocar);
  return b;
}

const abrirGuia = (guia) => () => ejecutar((g) => correrGuia(g, guia));

/* =========================================================
   Registro y entrar por voz
   ========================================================= */
const PREGUNTAS_REGISTRO = [
  { clave: 'nombre', texto: 'Bienvenido a SABERES. ¿Cómo se llama?' },
  { clave: 'comuna', texto: '¿De qué comuna es?' },
  { clave: 'aprender', texto: '¿Qué le gustaría aprender?' },
  { clave: 'ensenar', texto: '¿Qué sabe hacer que le gustaría enseñar a otros?' },
  { clave: 'clave', texto: 'Elija una palabra fácil de recordar, por ejemplo el nombre de una flor. Esa será su clave.' },
  { clave: 'telefono', texto: "Si quiere, dígame el celular de un familiar. Si no, diga 'no'." }
];

// Quita "me llamo", "soy de", etc.
function limpiarRespuesta(clave, texto) {
  let t = String(texto).trim().replace(/[.¡!¿?]+$/, '').trim();
  const prefijos = {
    nombre: /^(hola,?\s*)?(me llamo|mi nombre es|yo me llamo|yo soy|soy)\s+/i,
    comuna: /^(yo\s+)?(soy|vivo)?\s*(de|en)\s+(la comuna de\s+)?/i,
    aprender: /^(me gustar[ií]a aprender|quiero aprender|aprender)(\s+a)?\s+/i,
    ensenar: /^(s[eé] hacer|me gustar[ií]a enseñar|quiero enseñar|puedo enseñar|enseñar|s[eé])(\s+a)?\s+/i,
    clave: /^(mi (palabra clave|palabra|clave) (es|ser[aá])|la palabra (es|ser[aá])|elijo|que sea)\s+/i
  };
  if (prefijos[clave]) t = t.replace(prefijos[clave], '');
  if (clave === 'telefono') {
    if (/^no\b/.test(normal(t))) return '';
    const digitos = t.replace(/[^\d+]/g, '');
    return digitos.length >= 8 ? digitos : '';
  }
  if (clave === 'nombre' || clave === 'comuna') {
    t = t.split(' ').map((w, i) => (i > 0 && /^(de|del|la|las|los|y)$/i.test(w)) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  if (clave === 'clave') t = t.toLowerCase();
  return t;
}

function mostrarPregunta(texto, progreso) {
  $('#registro-pregunta').textContent = texto;
  $('#registro-progreso').textContent = progreso || '';
  $('#registro-respuesta').hidden = true;
}

function mostrarRespuesta(texto) {
  const r = $('#registro-respuesta');
  r.textContent = texto;
  r.hidden = false;
}

// Pregunta, escucha y confirma hasta que la persona diga que está bien
async function preguntarYConfirmar(p, progreso) {
  while (true) {
    mostrarPregunta(p.texto, progreso);
    await hablar(p.texto);
    const valor = limpiarRespuesta(p.clave, await escucharConRespaldo());
    if (!valor && p.clave !== 'telefono') {
      await hablar('Disculpe, no alcancé a entender. Vamos de nuevo.');
      continue;
    }
    const enPantalla = p.clave === 'telefono' && !valor ? 'no' : valor;
    const enVoz = p.clave === 'telefono'
      ? (valor ? `Escuché: ${valor.split('').join(' ')}. ¿Está bien?` : 'Entendido, sin celular. ¿Está bien?')
      : `Escuché: ${valor}. ¿Está bien?`;
    mostrarRespuesta(`Usted dijo: «${enPantalla}»`);
    await hablar(enVoz);
    if (await confirmar({ si: 'Sí, está bien', no: 'Repetir' })) return valor;
  }
}

function mostrarPerfil(u) {
  const filas = [
    ['Nombre', u.nombre],
    ['Comuna', u.comuna],
    ['Quiere aprender', (u.intereses || []).join(', ')],
    ['Puede enseñar', (u.saberes || []).join(', ')],
    ['Palabra clave', u.palabra_clave],
    ['Celular de un familiar', u.telefono || 'No indicó']
  ].filter(f => f[1]);
  mostrarPregunta(`¡Listo, ${u.nombre}!`, 'Su perfil');
  const caja = $('#registro-perfil');
  caja.innerHTML = `<h3>Esto es lo que anoté</h3><dl class="perfil">${filas.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  caja.hidden = false;
}

async function flujoRegistro(g) {
  irA('registro');
  $('#registro-perfil').hidden = true;
  const respuestas = {};
  for (let i = 0; i < PREGUNTAS_REGISTRO.length; i++) {
    const p = PREGUNTAS_REGISTRO[i];
    respuestas[p.clave] = await preguntarYConfirmar(p, `Pregunta ${i + 1} de ${PREGUNTAS_REGISTRO.length}`);
  }
  mostrarPregunta('Un momento, estoy armando su perfil…', '');
  const datos = await pensar(post('/api/registro', { respuestas }));
  vigente(g);
  if (!datos || datos.error) throw new Error(datos?.error || 'No se pudo registrar');
  usuario = datos;
  mostrarPerfil(usuario);
  await hablar(usuario.bienvenida || `Listo, ${usuario.nombre}. Ya tiene su cuenta.`);
  irA('inicio');
  await flujoInicio(g);
}

async function flujoEntrar(g) {
  irA('registro');
  $('#registro-perfil').hidden = true;
  const nombre = await preguntarYConfirmar({ clave: 'nombre', texto: 'Qué gusto verle de nuevo. ¿Cómo se llama?' }, 'Entrar · 1 de 2');
  const clave = await preguntarYConfirmar({ clave: 'clave', texto: '¿Cuál es su palabra clave?' }, 'Entrar · 2 de 2');
  mostrarPregunta('Buscando su cuenta…', '');
  const datos = await pensar(post('/api/entrar', { nombre, clave }));
  vigente(g);
  if (!datos || datos.error) {
    mostrarPregunta('No encontré su cuenta', '');
    await hablar(`${datos?.error || 'No encontré una cuenta con ese nombre y esa palabra clave.'} No se preocupe. ¿Lo intentamos de nuevo?`);
    const otraVez = await confirmar({ si: 'Intentar de nuevo', no: 'Volver al inicio', vozSi: ['intent', 'de nuevo', 'otra vez'], vozNo: ['volver', 'inicio'] });
    return otraVez ? flujoEntrar(g) : abrir('bienvenida');
  }
  usuario = datos;
  await hablar(`Hola de nuevo, ${usuario.nombre}.`);
  irA('inicio');
  await flujoInicio(g);
}

/* =========================================================
   Inicio (menú por voz o botones)
   ========================================================= */
async function flujoInicio(g) {
  if (!usuario) return abrir('bienvenida');
  $('#inicio-saludo').textContent = `Hola, ${usuario.nombre}`;
  await hablar(`Hola, ${usuario.nombre}. ¿Qué quiere hacer hoy? Puede decir: aprender, enseñar, o mis guías. También puede tocar un botón.`);
  const menu = { aprender: ['aprend'], ensenar: ['ensen'], 'mis-guias': ['mis guias', 'guias', 'mis'] };
  while (g === generacion && micOk) {
    try {
      const n = normal(await escuchar());
      const destino = Object.keys(menu).find(k => menu[k].some(p => n.includes(p)));
      if (destino && g === generacion) return abrir(destino);
      if (g === generacion) await hablar('Disculpe, no le entendí. Diga «aprender», «enseñar» o «mis guías».');
    } catch (e) {
      if (e === CANCELADO) throw e;
      await pausa(300);
    }
  }
}

/* =========================================================
   Aprender
   ========================================================= */
async function flujoAprender(g) {
  const lista = $('#lista-aprender');
  lista.innerHTML = '<p class="cargando">Buscando guías…</p>';
  const guias = await pensar(get('/api/guias'));
  vigente(g);
  const publicadas = (Array.isArray(guias) ? guias : []).filter(x => x.estado !== 'en revisión');
  lista.innerHTML = '';
  publicadas.forEach(guia => lista.append(tarjetaMayor(guia, abrirGuia(guia))));
  if (!publicadas.length) lista.innerHTML = '<p class="vacio">Todavía no hay guías publicadas.</p>';
  await hablar('Toque el botón verde y dígame qué quiere aprender. También puede elegir una guía de la lista.');
}

async function flujoBuscar(g) {
  await hablar('¿Qué le gustaría aprender? Dígalo con sus palabras.');
  const pregunta = await escucharConRespaldo();
  const guia = await pensar(post('/api/buscar', { pregunta }));
  vigente(g);
  if (!guia || guia.error || !Array.isArray(guia.pasos)) {
    await hablar(`${guia?.error || 'No encontré una guía sobre eso.'} Puede intentarlo otra vez, o elegir una guía de la lista.`);
    return;
  }
  await hablar(`Encontré: ${guia.titulo}, de ${guia.autor}. ¿Empezamos?`);
  if (await confirmar({ si: 'Sí, empecemos', no: 'No, otra cosa' })) return correrGuia(g, guia);
  await hablar('Bueno. Toque el botón para pedir otra cosa, o elija una guía de la lista.');
}

/* =========================================================
   Guía paso a paso (mayores y jóvenes)
   ========================================================= */
function pintarCabeceraGuia(guia) {
  $('#guia-avatar').innerHTML = avatarHTML(guia, 'avatar-grande');
  $('#guia-titulo').textContent = guia.titulo;
  $('#guia-autor').textContent = `Una guía de ${guia.autor}${guia.edad ? `, ${guia.edad} años` : ''}`;
  $('#guia-comuna').textContent = guia.comuna || '';
  $('#guia-ayuda').hidden = true;
}

function pintarProgreso(n, total, etiqueta) {
  $('#guia-progreso-texto').textContent = etiqueta || `Paso ${n} de ${total}`;
  const pct = total ? Math.round(n / total * 100) : 0;
  $('#guia-barra-relleno').style.width = pct + '%';
  $('#guia-barra').setAttribute('aria-valuenow', pct);
}

function pintarMateriales(guia) {
  const mat = guia.materiales || [];
  const adv = guia.advertencias || [];
  $('#guia-paso').innerHTML =
    (mat.length
      ? `<p class="etiqueta-paso">Va a necesitar:</p><ul class="lista-materiales">${mat.map(m => `<li>${esc(m)}</li>`).join('')}</ul>`
      : '<p>Prepárese: vamos a empezar.</p>') +
    (adv.length ? `<div class="advertencia"><strong>⚠️ Importante</strong>${adv.map(a => `<p>${esc(a)}</p>`).join('')}</div>` : '');
}

function pintarPaso(texto) {
  $('#guia-paso').textContent = texto;
  $('#guia-ayuda').hidden = true;
}

function pintarAyuda(texto) {
  const caja = $('#guia-ayuda');
  caja.innerHTML = `<strong>💬 Se lo explico</strong>${esc(texto)}`;
  caja.hidden = false;
}

function pintarCelebracion(guia) {
  const consejo = (guia.consejos || [])[0];
  $('#guia-paso').innerHTML = `<div class="celebracion">
      <span class="celebracion-icono" aria-hidden="true">🎉</span>
      <p class="celebracion-texto">¡Lo logró!</p>
      ${consejo ? `<p class="consejo">💡 Consejo de ${esc(guia.autor)}: ${esc(consejo)}</p>` : ''}
    </div>`;
  $('#guia-ayuda').hidden = true;
}

// Lee un texto y espera "listo"; atiende repetir, más lento y dudas
async function leerHastaListo(g, texto, paso) {
  await hablar(texto);
  while (true) {
    const orden = await esperarOrden();
    if (orden.tipo === 'listo') return;
    if (orden.tipo === 'repetir') {
      await hablar(texto);
    } else if (orden.tipo === 'lento') {
      velocidadVoz = 0.75;
      await hablar('Claro, ahora más despacio.');
      await hablar(texto);
    } else if (orden.tipo === 'esperar') {
      await hablar('No hay apuro. Cuando quiera seguir, dígame «listo».');
    } else {
      const r = await pensar(post('/api/ayuda', { guia: guiaActual, paso, duda: orden.texto || 'No entendí' }));
      vigente(g);
      const explicacion = r?.texto || `Se lo leo otra vez, con calma. ${texto}`;
      pintarAyuda(explicacion);
      await hablar(`${explicacion} Cuando quiera seguir, dígame «listo».`);
    }
  }
}

async function correrGuia(g, guia) {
  guiaActual = guia;
  const pasos = guia.pasos || [];
  const total = pasos.length;
  irA('guia');
  pintarCabeceraGuia(guia);
  pintarProgreso(0, total, 'Antes de empezar');
  pintarMateriales(guia);

  await hablar(`${guia.titulo}. Una guía de ${guia.autor}${guia.comuna ? ', de ' + guia.comuna : ''}.`);
  if (guia.advertencias?.length) await hablar('Algo importante: ' + guia.advertencias.join(' '));
  const materiales = guia.materiales?.length ? `Va a necesitar: ${listaConY(guia.materiales)}. ` : '';
  await leerHastaListo(g, `${materiales}Cuando esté preparado, dígame «listo» y empezamos.`, 'Materiales: ' + (guia.materiales || []).join(', '));

  for (let i = 0; i < total; i++) {
    pintarProgreso(i + 1, total);
    pintarPaso(pasos[i]);
    await leerHastaListo(g, `Paso ${i + 1}. ${pasos[i]}`, pasos[i]);
  }
  await terminarGuia(g, guia);
}

async function terminarGuia(g, guia) {
  const total = (guia.pasos || []).length;
  pintarProgreso(total, total, '¡Guía terminada!');
  pintarCelebracion(guia);
  await hablar('¡Lo logró! Muy bien hecho.');
  if (guia.consejos?.length) await hablar(`Un consejo de ${guia.autor}: ${guia.consejos[0]}`);

  if (vista === 'jovenes') return graciasJoven(g, guia);

  if (!esMia(guia)) {
    await hablar(`¿Quiere darle las gracias a ${guia.autor}? Le llegará un mensaje.`);
    if (await confirmar({ si: 'Sí, dar las gracias', no: 'No, gracias' })) {
      const r = await pensar(post('/api/aprendi', { guiaId: guia.id, aprendiz: usuario?.nombre || 'Una persona' }));
      vigente(g);
      if (r?.aprendieron != null) guia.aprendieron = r.aprendieron;
      ponerControles(el(`<p class="mensaje-gracias">Le enviamos su agradecimiento a ${esc(guia.autor)} 💌</p>`));
      await hablar(`Le enviamos su agradecimiento a ${guia.autor}.`);
    }
  }
  ponerControles(
    boton('🎓 Aprender otra cosa', 'btn-principal', () => abrir('aprender')),
    boton('🏠 Volver al inicio', 'btn-secundario', () => abrir(pantallaInicial()))
  );
  await hablar('¿Qué hacemos ahora? Puede aprender otra cosa o volver al inicio.');
}

// Vista jóvenes: botón final para dar las gracias
async function graciasJoven(g, guia) {
  const quiere = await cancelable((resolver) => {
    ponerControles(
      boton(`¡Aprendí! Dar las gracias a ${guia.autor}`, 'btn-principal btn-gigante', () => resolver(true)),
      boton('Volver a las guías', 'btn-secundario', () => resolver(false))
    );
  });
  if (!quiere) return abrir('jovenes');
  limpiarControles();
  const aprendiz = $('#nombre-joven').value.trim() || 'Una persona joven';
  const r = await pensar(post('/api/aprendi', { guiaId: guia.id, aprendiz }));
  vigente(g);
  if (r?.aprendieron != null) guia.aprendieron = r.aprendieron;
  ponerControles(
    el(`<p class="mensaje-gracias">Le enviamos su agradecimiento a ${esc(guia.autor)} 💌</p>`),
    boton('Ver más guías', 'btn-principal', () => abrir('jovenes'))
  );
  await hablar(`Le enviamos su agradecimiento a ${guia.autor}.`);
}

/* =========================================================
   Enseñar
   ========================================================= */
function pintarGuiaOrdenada(guia) {
  const lista = (arr, tag = 'ul') => `<${tag}>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</${tag}>`;
  const revision = guia.estado === 'en revisión';
  const caja = $('#ensenar-resultado');
  caja.innerHTML = `<article class="guia-ordenada">
      <div class="go-cabecera">
        ${avatarHTML(guia)}
        <div>
          <p class="go-autor">${esc(guia.autor)}${guia.comuna ? ' · ' + esc(guia.comuna) : ''}</p>
          <span class="insignia ${revision ? 'insignia-revision' : 'insignia-ok'}">${revision ? '⏳ Quedará en revisión' : '✅ Lista para publicar'}</span>
        </div>
      </div>
      <h3 class="go-titulo">${esc(guia.titulo)}</h3>
      <p class="go-categoria">${CATEGORIAS[guia.categoria] || esc(guia.categoria || '')}</p>
      ${guia.materiales?.length ? `<h4>🧺 Materiales</h4>${lista(guia.materiales)}` : ''}
      <h4>👣 Pasos</h4>${lista(guia.pasos || [], 'ol')}
      ${guia.consejos?.length ? `<h4>💡 Consejos</h4>${lista(guia.consejos)}` : ''}
      ${guia.advertencias?.length ? `<div class="advertencia"><strong>⚠️ Advertencias</strong>${lista(guia.advertencias)}</div>` : ''}
    </article>`;
  caja.hidden = false;
}

async function flujoEnsenar(g) {
  if (!usuario) return abrir('bienvenida');
  const btn = $('#btn-terminar');
  $('#ensenar-resultado').hidden = true;
  $('#ensenar-grabacion').hidden = false;
  $('#transcripcion').value = '';
  btn.disabled = true;
  btn.textContent = 'Escuche las instrucciones…';

  await hablar('Cuénteme lo que quiere enseñar, como si se lo explicara a un nieto. Diga qué se necesita y cómo se hace, paso por paso. Cuando termine, toque el botón rojo que dice «Terminé».');
  mostrarSubtitulo('Le escucho. Hable con calma; cuando termine, toque «Terminé».');
  const relato = await grabarHastaQueToque();

  if (normal(relato).split(' ').filter(Boolean).length < 4) {
    await hablar('No alcancé a escuchar lo suficiente. Probemos otra vez, con calma.');
    return flujoEnsenar(g);
  }

  $('#ensenar-grabacion').hidden = true;
  const caja = $('#ensenar-resultado');
  caja.innerHTML = '<p class="cargando">Ordenando su guía…</p>';
  caja.hidden = false;
  const guia = await pensar(post('/api/ensenar', { usuarioId: usuario.id, relato }));
  vigente(g);

  if (!guia || guia.error || !Array.isArray(guia.pasos)) {
    caja.hidden = true;
    await hablar('Disculpe, no pude ordenar su guía esta vez. No es su culpa. ¿Probamos de nuevo?');
    const otraVez = await confirmar({ si: 'Sí, grabar de nuevo', no: 'Volver al inicio', vozNo: ['volver', 'inicio'] });
    return otraVez ? flujoEnsenar(g) : abrir('inicio');
  }

  pintarGuiaOrdenada(guia);
  await hablar(guia.resumen_voz || `Su guía se llama ${guia.titulo}.`);
  if (guia.estado === 'en revisión') {
    await hablar('Como su guía habla de un tema delicado, una persona del equipo la va a revisar antes de publicarla. Es solo para cuidar a quienes la lean. Muchas gracias por su paciencia.');
  }
  await hablar('¿La publico así?');
  const publicar = await confirmar({ si: 'Publicar', no: 'Corregir' });

  if (!publicar) {
    if (modoMock && window.MOCK.descartar) window.MOCK.descartar(guia.id);
    await hablar('Bueno, grabemos de nuevo. Tómese su tiempo.');
    return flujoEnsenar(g);
  }
  usuario.ensenados = (Number(usuario.ensenados) || 0) + 1;
  await hablar(guia.estado === 'en revisión'
    ? 'Listo. Apenas la revisemos, quedará publicada con su nombre.'
    : `¡Listo! Su guía ya está publicada con su nombre. Gracias por compartir lo que sabe, ${usuario.nombre}.`);
  irA('mis-guias');
  await flujoMisGuias(g);
}

/* =========================================================
   Mis guías
   ========================================================= */
function esMia(guia) {
  if (!usuario) return false;
  if (guia.autorId && guia.autorId === usuario.id) return true;
  const autor = normal(guia.autor).split(' ');
  const nombre = normal(usuario.nombre).split(' ')[0];
  return !!nombre && autor.includes(nombre);
}

async function flujoMisGuias(g) {
  if (!usuario) return abrir('bienvenida');
  const lista = $('#lista-mis-guias');
  lista.innerHTML = '<p class="cargando">Buscando sus guías…</p>';
  const todas = await pensar(get('/api/guias'));
  vigente(g);
  const mias = (Array.isArray(todas) ? todas : []).filter(esMia);
  const total = mias.reduce((s, x) => s + (Number(x.aprendieron) || 0), 0);
  const frase = total === 1 ? 'persona aprendió con usted' : 'personas aprendieron con usted';
  $('#contador-numero').textContent = total;
  $('#contador-texto').textContent = frase;

  lista.innerHTML = '';
  if (!mias.length) {
    lista.append(el('<p class="vacio">Todavía no tiene guías. Lo que usted sabe le puede servir a mucha gente.</p>'));
    lista.append(boton('🎙️ Quiero enseñar', 'btn-azul', () => abrir('ensenar')));
    await hablar('Todavía no tiene guías publicadas. Cuando quiera, puede enseñar algo: toque «Quiero enseñar».');
    return;
  }
  mias.forEach(guia => lista.append(tarjetaMayor(guia, abrirGuia(guia))));
  await hablar(`${total} ${frase}. ¡Gracias por compartir lo que sabe!`);
}

/* =========================================================
   Vista jóvenes
   ========================================================= */
function pintarFiltros() {
  const caja = $('#filtros');
  caja.innerHTML = '';
  const opciones = [['todas', 'Todas'], ...Object.entries(CATEGORIAS)];
  for (const [clave, texto] of opciones) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filtro';
    b.textContent = texto;
    b.setAttribute('aria-pressed', String(clave === filtroCategoria));
    b.addEventListener('click', () => {
      filtroCategoria = clave;
      pintarFiltros();
      pintarListaJovenes();
    });
    caja.append(b);
  }
}

function pintarListaJovenes() {
  const palabras = normal($('#buscador').value).split(' ').filter(Boolean);
  const lista = $('#lista-jovenes');
  const visibles = guiasJovenes.filter(guia => {
    if (filtroCategoria !== 'todas' && guia.categoria !== filtroCategoria) return false;
    const texto = normal([guia.titulo, guia.categoria, guia.autor, guia.comuna, ...(guia.materiales || [])].join(' '));
    return palabras.every(p => texto.includes(p));
  });
  lista.innerHTML = '';
  visibles.forEach(guia => lista.append(tarjetaJoven(guia, abrirGuia(guia))));
  if (!visibles.length) lista.innerHTML = '<p class="vacio">No hay guías con esa búsqueda todavía. Pruebe con otra palabra o categoría.</p>';
}

async function flujoJovenes(g) {
  pintarFiltros();
  $('#lista-jovenes').innerHTML = '<p class="cargando">Cargando guías…</p>';
  const guias = await pensar(get('/api/guias'));
  vigente(g);
  guiasJovenes = (Array.isArray(guias) ? guias : []).filter(x => x.estado !== 'en revisión');
  pintarListaJovenes();
}

function cambiarVista(nueva) {
  vista = nueva;
  document.body.classList.toggle('vista-mayores', nueva === 'mayores');
  document.body.classList.toggle('vista-jovenes', nueva === 'jovenes');
  $('#vista-mayores').setAttribute('aria-pressed', String(nueva === 'mayores'));
  $('#vista-jovenes').setAttribute('aria-pressed', String(nueva === 'jovenes'));
  mostrarSubtitulo('');
  abrir(pantallaInicial());
}

/* =========================================================
   Arranque
   ========================================================= */
function init() {
  if (modoMock) $('#aviso-mock').hidden = false;

  // "Empezar" es el primer clic que Chrome exige para la voz
  $('#btn-empezar').addEventListener('click', () => ejecutar(flujoRegistro));
  $('#btn-tengo-cuenta').addEventListener('click', () => ejecutar(flujoEntrar));
  document.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => abrir(b.dataset.ir)));
  $('#btn-decir-tema').addEventListener('click', () => ejecutar(flujoBuscar));
  $('#btn-casa').addEventListener('click', () => abrir(pantallaInicial()));
  $('#vista-mayores').addEventListener('click', () => cambiarVista('mayores'));
  $('#vista-jovenes').addEventListener('click', () => cambiarVista('jovenes'));
  $('#buscador').addEventListener('input', pintarListaJovenes);

  irA('bienvenida');
}

init();
