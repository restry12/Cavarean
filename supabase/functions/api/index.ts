// =========================================================
// SABERES · Backend (Supabase Edge Function "api")
// Atiende todos los /api/* que usa el frontend. Los datos viven en
// Postgres (tablas usuarios y guias, con RLS: solo esta función entra).
// La IA se usa solo en /ensenar (ordenar) y /ayuda (explicar).
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { ordenarGuia, explicarPaso, tipoNombre } from "./ia.js";
import { avisarGracias } from "./avisos.js";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---------- Utilidades ----------
const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
const mayus = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Temas delicados: se revisan siempre, aunque la IA diga "bajo"
const DELICADO = /\b(gas|electric\w*|enchufe\w*|cable\w*|corriente|remedio\w*|medicament\w*|pastilla\w*|dosis|fiebre|escalera\w*|cloro|veneno\w*|insulina|soldar|taladro)\b/;

function telefonoLimpio(t: unknown) {
  const d = String(t ?? "").replace(/[^\d+]/g, "");
  if (d.replace("+", "").length < 8) return "";
  if (/^9\d{8}$/.test(d)) return "+56" + d;
  if (/^569\d{8}$/.test(d)) return "+" + d;
  return d;
}

// La base usa snake_case; el frontend espera la forma de mock.js
// deno-lint-ignore no-explicit-any
const aGuia = ({ autor_id, relato, creado_en, ...g }: any) => ({ ...g, autorId: autor_id });
// deno-lint-ignore no-explicit-any
const aUsuario = ({ creado_en, ...u }: any) => u;
const COLUMNAS_GUIA = "id,titulo,categoria,autor,autor_id,edad,comuna,foto,materiales,pasos,ayudas,consejos,advertencias,claves,riesgo,estado,aprendieron,resumen_voz";

async function leerGuias(soloPublicadas = false) {
  let q = db.from("guias").select(COLUMNAS_GUIA).order("creado_en", { ascending: false });
  if (soloPublicadas) q = q.eq("estado", "publicada");
  const { data, error } = await q;
  if (error) throw error;
  return data.map(aGuia);
}

// ---------- Registro y entrada (sin IA) ----------
async function registro({ respuestas: r = {} }: any) {
  const nombre = tipoNombre(String(r.nombre ?? "").trim());
  if (!nombre) return json({ error: "Me faltó su nombre." }, 400);
  const fila = {
    nombre,
    comuna: tipoNombre(String(r.comuna ?? "").trim()),
    oficio: String(r.oficio ?? "").trim(),
    sueno: String(r.sueno ?? "").trim(),
    intereses: r.aprender ? [String(r.aprender).trim()] : [],
    saberes: r.ensenar ? [String(r.ensenar).trim()] : [],
    palabra_clave: String(r.clave ?? "").trim().toLowerCase().replace(/[.!?¡¿]/g, ""),
    telefono: telefonoLimpio(r.telefono),
  };
  const { data: u, error } = await db.from("usuarios").insert(fila).select().single();
  if (error) throw error;
  // Mismo texto que mock.js: la pantalla de perfil lo lee y pregunta si está bien
  u.bienvenida = [
    `Así quedó su perfil: ${u.nombre}${u.comuna ? ", de " + u.comuna : ""}.`,
    u.oficio && `Se dedicó a ${u.oficio.toLowerCase()}`,
    u.sueno ? `${u.oficio ? "y" : "Usted"} soñaba con ${u.sueno.toLowerCase()}.` : (u.oficio ? "." : ""),
    r.ensenar && `Puede enseñar ${r.ensenar}.`,
    "¿Está todo bien?",
  ].filter(Boolean).join(" ").replace(" .", ".");
  return json(aUsuario(u));
}

async function entrar({ nombre, clave }: any) {
  const n = norm(nombre), c = norm(clave);
  const { data, error } = await db.from("usuarios").select("*").neq("palabra_clave", "");
  if (error) throw error;
  const u = data.find((x) => {
    const nx = norm(x.nombre), k = norm(x.palabra_clave);
    const mismoNombre = nx === n || nx.split(" ")[0] === n.split(" ")[0];
    return mismoNombre && k && (c === k || c.split(" ").includes(k));
  });
  if (!u) return json({ error: "No encontré una cuenta con ese nombre y esa palabra clave." }, 404);
  return json(aUsuario(u));
}

// ---------- Buscar (sin IA: palabras en común con título, categoría y claves) ----------
const VACIAS = new Set(["quiero", "aprender", "como", "hacer", "para", "una", "uno", "las", "los", "del", "que",
  "por", "favor", "gustaria", "saber", "ensename", "ensenar", "necesito", "algo", "sobre", "mas", "menos"]);

async function buscar({ pregunta = "" }: any) {
  const palabras = norm(pregunta).split(" ").filter((w) => w.length > 2 && !VACIAS.has(w));
  let mejor = null, puntaje = 0;
  for (const g of await leerGuias(true)) {
    const t = norm([g.titulo, g.categoria, ...(g.claves || [])].join(" "));
    const p = palabras.reduce((s, w) => s + (t.includes(w) || t.includes(w.slice(0, -1)) ? 1 : 0), 0);
    if (p > puntaje) { mejor = g; puntaje = p; }
  }
  return json(mejor || { error: "Todavía no tengo una guía sobre eso." });
}

// ---------- Explicar (IA) ----------
async function ayuda(body: any) {
  const { paso = "", duda = "No entendí" } = body;
  // La IA explica solo con lo que está en la enciclopedia: la guía guardada en la base,
  // nunca la que manda el navegador. Si no está, no se llama a la IA.
  const { data } = await db.from("guias").select(COLUMNAS_GUIA).eq("id", body.guia?.id ?? "").maybeSingle();
  const guia = data ? aGuia(data) : null;
  const i = guia ? guia.pasos.indexOf(paso) : -1;
  const ayudaBase = i >= 0 ? guia.ayudas?.[i] : null;
  try {
    if (!guia) throw new Error("guía no está en la base");
    return json({ texto: await explicarPaso({ guia, paso, duda, ayudaBase }) });
  } catch (e) {
    console.warn("[ayuda] sin IA:", (e as Error).message);
    const texto = ayudaBase ? `Se lo explico de otra forma. ${ayudaBase}`
      : String(paso).startsWith("Materiales") ? "No se preocupe si le falta algo. Puede reemplazarlo por algo parecido que tenga en casa."
      : `No se preocupe, vamos de a poco. Lo importante de este paso es esto: ${paso} Hágalo con calma; no hay apuro.`;
    return json({ texto });
  }
}

// ---------- Ordenar (IA) ----------
function guiaSinIA(relato: string, autor: string) {
  const frases = relato.split(/(?<=[.!?;])\s+|\s+(?:después|luego|entonces)\s+/i)
    .map((f) => f.trim()).filter((f) => f.split(" ").length >= 3);
  const pasos = (frases.length ? frases : [relato]).slice(0, 10).map((f) => mayus(f.replace(/[.;]*$/, ".")));
  return {
    titulo: `Lo que sabe ${autor}`, categoria: "hogar", materiales: [], pasos, ayudas: pasos,
    consejos: ["Hágalo con calma: la práctica hace al maestro."], advertencias: [] as string[], claves: [],
    riesgo: "bajo", resumen_voz: `Muy bien, ${autor}. Ordené su guía en ${pasos.length} pasos.`,
  };
}

async function ensenar(body: any) {
  const relato = String(body.relato ?? "").trim().slice(0, 6000);
  if (relato.split(/\s+/).length < 4) return json({ error: "El relato es muy corto." }, 400);
  const { data: u } = await db.from("usuarios").select("*").eq("id", body.usuarioId ?? "").maybeSingle();
  if (!u) return json({ error: "No encontré su cuenta." }, 404);

  let g;
  try {
    g = await ordenarGuia(relato, u.nombre);
  } catch (e) {
    console.warn("[ensenar] sin IA:", (e as Error).message);
    g = guiaSinIA(relato, u.nombre);
  }
  if (DELICADO.test(norm(relato + " " + g.titulo))) g.riesgo = "alto";
  if (g.riesgo === "alto" && !g.advertencias.length) {
    g.advertencias.push("Es un tema delicado: hágalo con cuidado y, ante cualquier duda, pida ayuda a alguien con experiencia.");
  }

  const { data, error } = await db.from("guias").insert({
    ...g, relato,
    autor: u.nombre, autor_id: u.id, edad: u.edad, comuna: u.comuna,
    estado: g.riesgo === "alto" ? "en revisión" : "publicada",
  }).select(COLUMNAS_GUIA).single();
  if (error) throw error;
  await db.from("usuarios").update({ ensenados: (u.ensenados || 0) + 1 }).eq("id", u.id);
  return json(aGuia(data));
}

// "Corregir": la autora descarta la guía recién creada antes de publicarla
async function descartar({ id, usuarioId }: any) {
  const { data, error } = await db.from("guias").delete()
    .eq("id", id ?? "").eq("autor_id", usuarioId ?? "").eq("aprendieron", 0).select("id");
  if (error) throw error;
  if (!data.length) return json({ ok: false, error: "No encontré esa guía." }, 404);
  const { data: u } = await db.from("usuarios").select("ensenados").eq("id", usuarioId).maybeSingle();
  if (u) await db.from("usuarios").update({ ensenados: Math.max(0, u.ensenados - 1) }).eq("id", usuarioId);
  return json({ ok: true });
}

// ---------- El gracias al autor (envío y hitos en avisos.js) ----------
async function aprendi({ guiaId, aprendiz, mensaje }: any) {
  const { data: total, error } = await db.rpc("sumar_aprendieron", { guia_id: guiaId ?? "" });
  if (error) throw error;
  if (total == null) return json({ ok: false, error: "No encontré esa guía." }, 404);

  const { data: g } = await db.from("guias").select("titulo,autor,autor_id").eq("id", guiaId).single();
  const { data: autor } = await db.from("usuarios").select("telefono").eq("id", g!.autor_id ?? "").maybeSingle();
  const nombre = String(aprendiz || "Alguien").trim().slice(0, 40);
  // El mensaje del joven va al WhatsApp de una persona mayor: sin links ni teléfonos
  const nota = String(mensaje ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const seguro = nota && !/https?:\/\/|www\.|\b[\w-]+\.(?:cl|com|net|org|ly)\b|(?:\d[\s.-]?){7,}/i.test(nota);
  // Se responde al tiro; el mensaje (solo en hitos) sigue saliendo en segundo plano
  const envio = avisarGracias({
    telefono: autor?.telefono, autor: g!.autor, titulo: g!.titulo,
    aprendiz: nombre, aprendieron: total, nota: seguro ? nota : "",
  });
  // @ts-ignore EdgeRuntime existe en Supabase
  globalThis.EdgeRuntime?.waitUntil(envio);
  return json({ ok: true, aprendieron: total });
}

// ---------- Enrutador ----------
// deno-lint-ignore no-explicit-any
const RUTAS: Record<string, (body: any) => Promise<Response>> = {
  "POST /registro": registro,
  "POST /entrar": entrar,
  "POST /buscar": buscar,
  "POST /ayuda": ayuda,
  "POST /ensenar": ensenar,
  "POST /descartar": descartar,
  "POST /aprendi": aprendi,
  "GET /guias": async () => json(await leerGuias()),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // La URL llega como /api/<ruta> (nombre de la función + ruta)
  const ruta = new URL(req.url).pathname.replace(/^.*?\/api(?=\/|$)/, "") || "/";
  const manejar = RUTAS[`${req.method} ${ruta}`];
  if (!manejar) return json({ error: "Ruta no encontrada." }, 404);
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    return await manejar(body);
  } catch (e) {
    console.error(`[${ruta}]`, e);
    return json({ error: "Algo falló en el servidor." }, 500);
  }
});
