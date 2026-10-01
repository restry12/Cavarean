// SABERES · Crear un curso por WhatsApp (Zavu)
// 1) La persona manda el nombre del curso (texto).
// 2) Manda un audio o video explicando → se transcribe, se ordena y se publica.
// 3) Le respondemos con el link.
// Se monta ANTES de express.json(): la firma se calcula sobre el cuerpo crudo.
import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { crearCurso, descargar } from "./curso.js";

const ZAVU = "https://api.zavu.dev/v1";
const env = (k) => process.env[k];
const zavuHeaders = () => ({ Authorization: `Bearer ${env("ZAVUDEV_API_KEY")}`, "Content-Type": "application/json" });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const primerNombre = (n) => String(n || "").trim().split(/\s+/)[0] || "";

// teléfono → { titulo, autor } del curso que está armando
const pendientes = new Map();

// "t=<unix>,v2=<hex>"; v2 = HMAC-SHA256(`${t}.${rawBody}`, ZAVU_WEBHOOK_SECRET)
export function firmaValida(cabecera, cuerpo, secreto, ahora = Date.now() / 1000) {
  const partes = Object.fromEntries(String(cabecera || "").split(",").map((p) => p.trim().split("=")));
  const t = Number(partes.t);
  if (!t || !partes.v2 || Math.abs(ahora - t) > 300) return false;
  const esperado = createHmac("sha256", secreto).update(`${t}.`).update(cuerpo).digest();
  const recibido = Buffer.from(partes.v2, "hex");
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

async function responder(to, text, { soloConsola = false } = {}) {
  if (soloConsola || !env("ZAVUDEV_API_KEY")) return console.log(`[zavu → ${to}] ${text}`);
  try {
    const r = await fetch(`${ZAVU}/messages`, {
      method: "POST", headers: zavuHeaders(),
      body: JSON.stringify({ to, text, channel: "whatsapp" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) console.error(`[zavu] no se envió a ${to} (${r.status}):`, (await r.text()).slice(0, 200));
  } catch (e) { console.error("[zavu] no se envió:", e.message); }
}

// La URL del archivo: content.mediaUrl del mensaje (tarda unos segundos en aparecer);
// si no, la de /attachments (temporal: se descarga al tiro).
async function bajarArchivo(messageId) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${ZAVU}/messages/${encodeURIComponent(messageId)}`, { headers: zavuHeaders(), signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const m = await r.json();
      const url = (m.message || m.data || m).content?.mediaUrl;
      if (url) return descargar(url);
    }
    await espera(2000);
  }
  const r = await fetch(`${ZAVU}/messages/${encodeURIComponent(messageId)}/attachments`, { headers: zavuHeaders(), signal: AbortSignal.timeout(10000) });
  const url = r.ok ? (await r.json()).items?.[0]?.downloadUrl : null;
  if (!url) throw new Error("Zavu no entregó el archivo");
  return descargar(url);
}

const urlCurso = (id) => `${(env("URL_PUBLICA") || "http://localhost:3000").replace(/\/+$/, "")}/?guia=${encodeURIComponent(id)}`;

async function procesar(evento, fns, { soloConsola, modoDemo }) {
  const d = evento.data || {};
  const tel = d.from;
  if (!tel) return;
  const decir = (t) => responder(tel, t, { soloConsola });
  const nombre = primerNombre(d.profileName);

  try {
    if (d.messageType === "text") {
      const titulo = String(d.text || "").replace(/\s+/g, " ").trim().slice(0, 80);
      if (!titulo) return;
      pendientes.set(tel, { titulo, autor: d.profileName || "" });
      return decir(`¡Qué bueno${nombre ? ", " + nombre : ""}! 🙌 Ahora mándeme un audio o video contando cómo se hace "${titulo}". Hable tranquilo, como si se lo explicara a un nieto.`);
    }

    if (d.messageType === "audio" || d.messageType === "video") {
      await decir("¡Recibido! Estoy armando su curso, deme un minutito… ⏳");
      const p = pendientes.get(tel) || { titulo: "", autor: d.profileName || "" };
      // MEDIA_URL_PRUEBA (scripts/probar-webhook.sh) manda content.mediaUrl y se salta la consulta a Zavu.
      // Solo sin secreto (modo demo): con firma, el archivo siempre se pide a Zavu.
      const prueba = modoDemo && d.content?.mediaUrl;
      const datos = prueba ? await descargar(prueba) : await bajarArchivo(d.messageId);
      const guia = await crearCurso({
        id: d.messageId || String(Date.now()), datos, tipo: d.messageType, mime: d.content?.mimeType,
        titulo: p.titulo, autor: p.autor, telefono: tel, origen: "whatsapp",
      }, fns);
      pendientes.delete(tel);
      const n = guia.pasos?.length || 0;
      const revision = guia.estado === "en revisión"
        ? " Como es un tema delicado, una persona del equipo lo revisará antes de mostrarlo a todos." : "";
      return decir(`🎉 ¡Listo! Su curso "${guia.titulo}" ya está publicado en SABERES con ${n} pasos. Véalo aquí: ${urlCurso(guia.id)}.${revision} Le avisaré cada vez que alguien aprenda de usted. 💛`);
    }

    return decir("¡Hola! 👋 Para crear su curso en SABERES: 1️⃣ mándeme el nombre del curso (por ejemplo: Pan amasado) y 2️⃣ después un audio o video contando cómo se hace. Yo me encargo del resto. 💛");
  } catch (e) {
    console.error("[zavu] error armando el curso:", e);
    return decir("Tuve un problema armando su curso. ¿Lo intentamos de nuevo? 🙏");
  }
}

export function montarZavu(app, fns) {
  app.post("/webhooks/zavu", express.raw({ type: "*/*", limit: "1mb" }), (req, res) => {
    const secreto = env("ZAVU_WEBHOOK_SECRET");
    const cuerpo = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (secreto && !firmaValida(req.get("X-Zavu-Signature"), cuerpo, secreto)) {
      return res.status(401).json({ error: "Firma inválida" });
    }
    let evento;
    try { evento = JSON.parse(cuerpo.toString("utf8")); } catch { return res.status(400).json({ error: "JSON inválido" }); }
    // Zavu exige 2xx en menos de 30 s: se responde al tiro y se procesa en segundo plano
    res.status(200).json({ ok: true });
    if (evento.type !== "message.inbound" || evento.data?.channel !== "whatsapp") return;
    // Sin secreto (modo demo) y con "prueba": true, las respuestas van solo a la consola
    setImmediate(() => procesar(evento, fns, { modoDemo: !secreto, soloConsola: !secreto && evento.prueba === true }));
  });
}
