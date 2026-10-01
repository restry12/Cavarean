import express from "express";
import fs from "fs";
import "dotenv/config";
import { hayIA, armarPerfil, ordenarGuia, elegirGuia, explicarPaso } from "./ia.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

// ---------- Datos (data/*.json se crean desde data/*.base.json) ----------
const ARCHIVOS = { usuarios: "data/usuarios.json", guias: "data/guias.json" };
const base = (f) => f.replace(".json", ".base.json");
const reiniciarDatos = () => Object.values(ARCHIVOS).forEach((f) => fs.copyFileSync(base(f), f));
Object.values(ARCHIVOS).forEach((f) => { if (!fs.existsSync(f)) fs.copyFileSync(base(f), f); });
const leer = (k) => JSON.parse(fs.readFileSync(ARCHIVOS[k], "utf8"));
const guardar = (k, datos) => fs.writeFileSync(ARCHIVOS[k], JSON.stringify(datos, null, 2) + "\n");

// ---------- Utilidades ----------
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
const mayus = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const nuevoId = (p) => `${p}-${Date.now().toString(36)}`;

// Temas delicados: se revisan siempre, aunque la IA diga "bajo"
const DELICADO = /\b(gas|electric\w*|enchufe\w*|cable\w*|corriente|remedio\w*|medicament\w*|pastilla\w*|dosis|escalera\w*|cloro|veneno\w*|insulina|soldar|taladro)\b/;

function telefonoLimpio(t) {
  const d = String(t || "").replace(/[^\d+]/g, "");
  if (d.replace("+", "").length < 8) return "";
  if (/^9\d{8}$/.test(d)) return "+56" + d;
  if (/^569\d{8}$/.test(d)) return "+" + d;
  return d;
}

// ---------- Registro y entrada ----------
app.post("/api/registro", async (req, res) => {
  const r = req.body.respuestas || {};
  if (!String(r.nombre || "").trim()) return res.status(400).json({ error: "Me faltó su nombre." });

  let perfil;
  try {
    perfil = await armarPerfil({ nombre: r.nombre, comuna: r.comuna, aprender: r.aprender, ensenar: r.ensenar });
  } catch (e) {
    console.warn("[registro] sin IA:", e.message);
    perfil = { nombre: mayus(String(r.nombre).trim()), comuna: mayus(String(r.comuna || "").trim()),
      intereses: r.aprender ? [r.aprender] : [], saberes: r.ensenar ? [r.ensenar] : [] };
  }

  // El nombre de la IA solo vale si todas sus palabras salen de lo que la persona dijo
  const dicho = norm(r.nombre).split(" ");
  const nombreIA = norm(perfil.nombre).split(" ").filter(Boolean);
  const u = {
    id: nuevoId("u"),
    nombre: nombreIA.length && nombreIA.every((w) => w.length > 1 && dicho.includes(w)) ? perfil.nombre : mayus(String(r.nombre).trim()),
    comuna: perfil.comuna,
    intereses: perfil.intereses,
    saberes: perfil.saberes,
    palabra_clave: String(r.clave || "").trim().toLowerCase().replace(/[.!?¡¿]/g, ""),
    telefono: telefonoLimpio(r.telefono),
    ensenados: 0,
  };
  u.bienvenida = [
    perfil.bienvenida || `¡Le damos la bienvenida a SABERES, ${u.nombre}!`,
    u.palabra_clave && `Su palabra clave es «${u.palabra_clave}». Guárdela bien.`,
    "Ya puede empezar.",
  ].filter(Boolean).join(" ");

  const usuarios = leer("usuarios");
  usuarios.push(u);
  guardar("usuarios", usuarios);
  res.json(u);
});

app.post("/api/entrar", (req, res) => {
  const n = norm(req.body.nombre), c = norm(req.body.clave);
  const u = leer("usuarios").find((x) => {
    const nx = norm(x.nombre), k = norm(x.palabra_clave);
    const mismoNombre = nx === n || nx.split(" ")[0] === n.split(" ")[0];
    return mismoNombre && k && (c === k || c.split(" ").includes(k));
  });
  if (!u) return res.status(404).json({ error: "No encontré una cuenta con ese nombre y esa palabra clave." });
  res.json(u);
});

// ---------- Guías ----------
app.get("/api/guias", (req, res) => res.json(leer("guias")));

// Respaldo sin IA: cuenta palabras en común
function buscarPorPalabras(pregunta, guias) {
  const vacias = new Set(["quiero", "aprender", "como", "hacer", "para", "una", "uno", "las", "los", "del", "que",
    "por", "favor", "gustaria", "saber", "ensename", "ensenar", "necesito", "algo", "sobre", "mas", "menos"]);
  const palabras = norm(pregunta).split(" ").filter((w) => w.length > 2 && !vacias.has(w));
  let mejor = null, puntaje = 0;
  for (const g of guias) {
    const t = norm([g.titulo, g.categoria, ...(g.claves || [])].join(" "));
    const p = palabras.reduce((s, w) => s + (t.includes(w) || t.includes(w.slice(0, -1)) ? 1 : 0), 0);
    if (p > puntaje) { mejor = g; puntaje = p; }
  }
  return mejor;
}

app.post("/api/buscar", async (req, res) => {
  const pregunta = String(req.body.pregunta || "").trim();
  const publicadas = leer("guias").filter((g) => g.estado !== "en revisión");
  let guia;
  try {
    guia = await elegirGuia(pregunta, publicadas);
  } catch (e) {
    console.warn("[buscar] sin IA:", e.message);
    guia = buscarPorPalabras(pregunta, publicadas);
  }
  res.json(guia || { error: "Todavía no tengo una guía sobre eso." });
});

app.post("/api/ayuda", async (req, res) => {
  const { paso = "", duda = "No entendí" } = req.body;
  // Se usa la guía guardada, no la que manda el navegador
  const guia = leer("guias").find((g) => g.id === req.body.guia?.id) || req.body.guia || {};
  const i = (guia.pasos || []).indexOf(paso);
  const ayudaBase = i >= 0 ? guia.ayudas?.[i] : null;
  try {
    res.json({ texto: await explicarPaso({ guia, paso, duda, ayudaBase }) });
  } catch (e) {
    console.warn("[ayuda] sin IA:", e.message);
    const texto = ayudaBase ? `Se lo explico de otra forma. ${ayudaBase}`
      : String(paso).startsWith("Materiales") ? "No se preocupe si le falta algo. Puede reemplazarlo por algo parecido que tenga en casa."
      : `No se preocupe, vamos de a poco. Lo importante de este paso es esto: ${paso} Hágalo con calma; no hay apuro.`;
    res.json({ texto });
  }
});

// Respaldo sin IA: una frase por paso
function guiaSinIA(relato, autor) {
  const frases = relato.split(/(?<=[.!?;])\s+|\s+(?:después|luego|entonces)\s+/i)
    .map((f) => f.trim()).filter((f) => f.split(" ").length >= 3);
  const pasos = (frases.length ? frases : [relato]).slice(0, 10).map((f) => mayus(f.replace(/[.;]*$/, ".")));
  return {
    titulo: `Lo que sabe ${autor}`, categoria: "hogar", materiales: [], pasos, ayudas: [],
    consejos: ["Hágalo con calma: la práctica hace al maestro."], advertencias: [], claves: [], riesgo: "bajo",
    resumen_voz: `Muy bien, ${autor}. Ordené su guía en ${pasos.length} pasos.`,
  };
}

app.post("/api/ensenar", async (req, res) => {
  const relato = String(req.body.relato || "").trim().slice(0, 6000);
  if (relato.split(/\s+/).length < 4) return res.status(400).json({ error: "El relato es muy corto." });
  const usuarios = leer("usuarios");
  const u = usuarios.find((x) => x.id === req.body.usuarioId);
  if (!u) return res.status(404).json({ error: "No encontré su cuenta." });

  let g;
  try {
    g = await ordenarGuia(relato, u.nombre);
  } catch (e) {
    console.warn("[ensenar] sin IA:", e.message);
    g = guiaSinIA(relato, u.nombre);
  }
  if (DELICADO.test(norm(relato + " " + g.titulo))) g.riesgo = "alto";
  if (g.riesgo === "alto" && !g.advertencias.length) {
    g.advertencias.push("Es un tema delicado: hágalo con cuidado y, ante cualquier duda, pida ayuda a alguien con experiencia.");
  }

  const guia = {
    id: nuevoId("g"), ...g,
    autor: u.nombre, autorId: u.id, edad: u.edad || null, comuna: u.comuna || "", foto: null,
    estado: g.riesgo === "alto" ? "en revisión" : "publicada",
    aprendieron: 0,
  };
  const guias = leer("guias");
  guias.unshift(guia);
  guardar("guias", guias);
  u.ensenados = (Number(u.ensenados) || 0) + 1;
  guardar("usuarios", usuarios);
  res.json(guia);
});

// "Corregir": la autora descarta la guía recién creada antes de publicarla
app.post("/api/descartar", (req, res) => {
  const guias = leer("guias");
  const i = guias.findIndex((g) => g.id === req.body.id && g.autorId === req.body.usuarioId && !g.aprendieron);
  if (i < 0) return res.status(404).json({ ok: false, error: "No encontré esa guía." });
  guias.splice(i, 1);
  guardar("guias", guias);
  const usuarios = leer("usuarios");
  const u = usuarios.find((x) => x.id === req.body.usuarioId);
  if (u) { u.ensenados = Math.max(0, (Number(u.ensenados) || 0) - 1); guardar("usuarios", usuarios); }
  res.json({ ok: true });
});

// ---------- El gracias al autor ----------
async function enviarZavu(to, texto) {
  // Verificar endpoint y campos en la documentación de Zavu antes de la demo
  const r = await fetch("https://api.zavu.dev/v1/messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.ZAVUDEV_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, text: texto, channel: process.env.ZAVU_CANAL || "whatsapp" }),
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error("Zavu respondió " + r.status);
}

async function enviarTelegram(texto) {
  if (!process.env.TELEGRAM_TOKEN) throw new Error("Telegram sin configurar");
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: texto }),
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error("Telegram respondió " + r.status);
}

async function avisarAutor(to, texto) {
  try {
    if (process.env.AVISO === "zavu" && to) return await enviarZavu(to, texto);
  } catch (e) { console.warn("[aviso] Zavu falló, uso Telegram:", e.message); }
  try { await enviarTelegram(texto); }
  catch (e) { console.warn(`[aviso] simulado (${e.message}): ${texto}`); }
}

app.post("/api/aprendi", (req, res) => {
  const guias = leer("guias");
  const g = guias.find((x) => x.id === req.body.guiaId);
  if (!g) return res.status(404).json({ ok: false, error: "No encontré esa guía." });
  g.aprendieron = (Number(g.aprendieron) || 0) + 1;
  guardar("guias", guias);

  const autor = leer("usuarios").find((u) => u.id === g.autorId);
  const aprendiz = String(req.body.aprendiz || "Alguien").trim().slice(0, 40);
  const texto = `${aprendiz} aprendió «${g.titulo}» gracias a usted. ¡Gracias por enseñar en SABERES! 💛`;
  avisarAutor(autor?.telefono || process.env.NUMERO_DEMO, texto);   // no se espera: la respuesta sale al tiro
  res.json({ ok: true, aprendieron: g.aprendieron });
});

// Para repetir la demo desde cero
app.post("/api/reiniciar", (req, res) => { reiniciarDatos(); res.json({ ok: true }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SABERES en http://localhost:${PORT} · IA: ${hayIA() ? "sí" : "no (respaldo sin IA)"}`));
