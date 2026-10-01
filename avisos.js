// avisos.js — P3 Integraciones
// Avisa al autor de una guía cuando alcanza un hito de personas que aprendieron
// (la primera, 10, 50, 100 y luego cada 100), para no mandarle un mensaje por cada una.
// Canal principal según AVISO (zavu | telegram); si falla, prueba el otro.
// Nunca lanza errores: si todo falla, deja el mensaje en consola y la app sigue.
//
// Uso desde server.js, después de sumar +1 a guia.aprendieron:
//   const { avisarGracias } = require('./avisos');
//   avisarGracias({ autor: guia.autor, titulo: guia.titulo, aprendiz, aprendieron: guia.aprendieron });

const TIEMPO_MAXIMO = 8000; // ms por intento, para no dejar colgada la demo
const HITOS = [1, 10, 50, 100];
const CADA_DESPUES = 100; // pasado el último hito: 200, 300, 400...

function esHito(n) {
  if (HITOS.includes(n)) return true;
  const ultimo = HITOS[HITOS.length - 1];
  return n > ultimo && n % CADA_DESPUES === 0;
}

function textoGracias({ autor, titulo, aprendiz, aprendieron }) {
  const nombre = autor ? `, ${autor.split(' ')[0]}` : '';
  const quien = aprendiz || 'Una persona';
  if (aprendieron > 1) {
    return `¡Hola${nombre}! 🎉 Ya son ${aprendieron} personas que aprendieron «${titulo}» gracias a usted. La última fue ${quien}. ¡Gracias por enseñar lo que sabe! — SABERES`;
  }
  return `¡Hola${nombre}! 💌 ${quien} es la primera persona que aprendió «${titulo}» gracias a usted. ¡Gracias por enseñar lo que sabe! — SABERES`;
}

async function enviarZavu({ telefono, texto }) {
  const llave = process.env.ZAVUDEV_API_KEY;
  if (!llave) throw new Error('Falta ZAVUDEV_API_KEY');
  if (!telefono) throw new Error('No hay número de destino (NUMERO_DEMO)');

  const cuerpo = { to: telefono, text: texto };
  // Las llaves zv_test_ solo permiten WhatsApp; sin canal, Zavu elige el mejor.
  const canal = process.env.ZAVU_CANAL || (llave.startsWith('zv_test_') ? 'whatsapp' : '');
  if (canal) cuerpo.channel = canal;

  const r = await fetch('https://api.zavu.dev/v1/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(TIEMPO_MAXIMO)
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Zavu ${r.status}: ${datos.message || datos.error || JSON.stringify(datos)}`);
  return { id: datos.message?.id, estado: datos.message?.status };
}

async function enviarTelegram({ texto }) {
  const token = process.env.TELEGRAM_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) throw new Error('Faltan TELEGRAM_TOKEN o TELEGRAM_CHAT_ID');

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: texto }),
    signal: AbortSignal.timeout(TIEMPO_MAXIMO)
  });
  const datos = await r.json().catch(() => ({}));
  if (!datos.ok) throw new Error(`Telegram ${r.status}: ${datos.description || 'error desconocido'}`);
  return { id: datos.result?.message_id };
}

const CANALES = { zavu: enviarZavu, telegram: enviarTelegram };

// Devuelve { ok, enviado, canal?, texto?, id?, errores[] }
// enviado: false cuando no es un hito (no corresponde avisar).
async function avisarGracias({ autor, titulo, aprendiz, telefono, aprendieron } = {}) {
  const n = Number(aprendieron);
  if (Number.isFinite(n) && n > 0 && !esHito(n)) {
    return { ok: true, enviado: false, motivo: `${n} no es un hito`, errores: [] };
  }
  const texto = textoGracias({ autor, titulo, aprendiz, aprendieron: n });
  const destino = telefono || process.env.NUMERO_DEMO;
  const principal = process.env.AVISO === 'telegram' ? 'telegram' : 'zavu';
  const orden = [principal, principal === 'zavu' ? 'telegram' : 'zavu'];
  const errores = [];

  for (const canal of orden) {
    try {
      const r = await CANALES[canal]({ telefono: destino, texto });
      console.info(`[avisos] Enviado por ${canal} a ${autor || 'autor'}: "${texto}"`);
      return { ok: true, enviado: true, canal, texto, ...r, errores };
    } catch (e) {
      errores.push(`${canal}: ${e.message}`);
      console.warn(`[avisos] Falló ${canal}: ${e.message}`);
    }
  }

  console.info(`[avisos] Sin canal disponible. Mensaje para ${autor || 'autor'}: "${texto}"`);
  return { ok: false, enviado: false, canal: 'consola', texto, errores };
}

module.exports = { avisarGracias, textoGracias, esHito, HITOS };

// Prueba rápida: node avisos.js [aprendieron]  (lee el .env de la raíz)
if (require.main === module) {
  try { process.loadEnvFile(); } catch { console.warn('[avisos] No se encontró .env'); }
  const aprendieron = Number(process.argv[2] || 1);
  avisarGracias({ autor: 'Rosa Pérez', titulo: 'Sopaipillas pasadas', aprendiz: 'Tomás', aprendieron })
    .then(r => console.log(JSON.stringify(r, null, 2)));
}
