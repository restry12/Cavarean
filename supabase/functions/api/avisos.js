// =========================================================
// SABERES · Avisos al autor (P3 – Integraciones)
// El "gracias" llega solo en hitos (la primera persona, 10, 50, 100 y luego
// cada 100) para no saturar a la persona con un mensaje por cada aprendiz.
// Se envía por WhatsApp a través de Zavu. Si falla, Telegram de respaldo y,
// si nada funciona, queda en consola. Nunca lanza errores.
// Funciona en Deno (Edge Function) y en Node (pruebas locales).
// =========================================================
const env = (k) => (globalThis.Deno ? Deno.env.get(k) : process.env[k]);

const TIEMPO_MAXIMO = 9000; // ms por intento
export const HITOS = [1, 10, 50, 100];
const CADA_DESPUES = 100; // pasado el último hito: 200, 300, 400...

export function esHito(n) {
  if (HITOS.includes(n)) return true;
  return n > HITOS[HITOS.length - 1] && n % CADA_DESPUES === 0;
}

// nota: mensaje del aprendiz, ya filtrado por index.ts (sin links ni teléfonos)
export function textoGracias({ autor, titulo, aprendiz, aprendieron, nota }) {
  const hola = autor ? `¡Hola, ${String(autor).split(" ")[0]}!` : "¡Hola!";
  const quien = aprendiz || "Alguien";
  const dice = nota ? ` Le dice: "${nota}"` : "";
  const cierre = " ¡Gracias por enseñar en SABERES! 💛";
  if (aprendieron > 1) {
    return `${hola} 🎉 Ya son ${aprendieron} personas que aprendieron «${titulo}» gracias a usted. La última fue ${quien}.${dice}${cierre}`;
  }
  return `${hola} 💌 ${quien} es la primera persona que aprendió «${titulo}» gracias a usted.${dice}${cierre}`;
}

async function enviarZavu(to, texto) {
  const llave = env("ZAVUDEV_API_KEY");
  if (!llave) throw new Error("falta ZAVUDEV_API_KEY");
  if (!to) throw new Error("no hay teléfono ni NUMERO_DEMO");
  const r = await fetch("https://api.zavu.dev/v1/messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, text: texto, channel: "whatsapp" }),
    signal: AbortSignal.timeout(TIEMPO_MAXIMO),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Zavu ${r.status}: ${datos.message || datos.error || "error"}`);
  return datos.message?.id;
}

async function enviarTelegram(_to, texto) {
  const token = env("TELEGRAM_TOKEN"), chat = env("TELEGRAM_CHAT_ID");
  if (!token || !chat) throw new Error("faltan TELEGRAM_TOKEN o TELEGRAM_CHAT_ID");
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: texto }),
    signal: AbortSignal.timeout(TIEMPO_MAXIMO),
  });
  const datos = await r.json().catch(() => ({}));
  if (!datos.ok) throw new Error(`Telegram ${r.status}: ${datos.description || "error"}`);
  return datos.result?.message_id;
}

const CANALES = { zavu: enviarZavu, telegram: enviarTelegram };

// aprendieron: total ya incrementado. Si no viene, se envía igual.
// Devuelve { ok, enviado, canal?, texto?, id?, motivo?, errores[] }
export async function avisarGracias({ telefono, autor, titulo, aprendiz, aprendieron, nota } = {}) {
  const n = Number(aprendieron);
  if (Number.isFinite(n) && n > 0 && !esHito(n)) {
    return { ok: true, enviado: false, motivo: `${n} no es un hito`, errores: [] };
  }
  const texto = textoGracias({ autor, titulo, aprendiz, aprendieron: n, nota });
  const to = telefono || env("NUMERO_DEMO") || "";
  const errores = [];

  for (const canal of ["zavu", "telegram"]) {
    try {
      const id = await CANALES[canal](to, texto);
      console.info(`[aviso] enviado por ${canal}: ${texto}`);
      return { ok: true, enviado: true, canal, texto, id, errores };
    } catch (e) {
      errores.push(`${canal}: ${e.message}`);
      console.warn(`[aviso] falló ${canal}: ${e.message}`);
    }
  }
  console.info(`[aviso] simulado: ${texto}`);
  return { ok: false, enviado: false, canal: "consola", texto, errores };
}
