// =========================================================
// SABERES · Relato → guía (compartido)
// Lo usan /api/ensenar (Edge Function, Deno) y la entrada por
// WhatsApp y por archivo (server.js, Node). Mismo prompt y misma
// IA (ordenarGuia en ia.js); si la IA falla, se ordena sin IA.
// Guardar la guía depende de dónde corre: cada lado tiene su guardarGuia.
// =========================================================
import { ordenarGuia } from "./ia.js";

export const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
const mayus = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Temas delicados: se revisan siempre, aunque la IA diga "bajo"
const DELICADO = /\b(gas|electric\w*|enchufe\w*|cable\w*|corriente|remedio\w*|medicament\w*|pastilla\w*|dosis|fiebre|escalera\w*|cloro|veneno\w*|insulina|soldar|taladro)\b/;

function guiaSinIA(relato, autor) {
  const frases = relato.split(/(?<=[.!?;])\s+|\s+(?:después|luego|entonces)\s+/i)
    .map((f) => f.trim()).filter((f) => f.split(" ").length >= 3);
  const pasos = (frases.length ? frases : [relato]).slice(0, 10).map((f) => mayus(f.replace(/[.;]*$/, ".")));
  return {
    titulo: `Lo que sabe ${autor}`, categoria: "hogar", materiales: [], pasos, ayudas: pasos,
    consejos: ["Hágalo con calma: la práctica hace al maestro."], advertencias: [], claves: [],
    riesgo: "bajo", resumen_voz: `Muy bien, ${autor}. Ordené su guía en ${pasos.length} pasos.`,
  };
}

// Devuelve la guía lista para guardar (sin id: lo pone la base).
// Si viene titulo (por ejemplo, el que mandó por WhatsApp), se respeta.
export async function estructurarGuia({ texto, titulo = "", autor = "", telefono = "", comuna = "" }) {
  const relato = String(texto ?? "").trim().slice(0, 6000);
  const nombre = String(autor ?? "").trim() || "Una persona de SABERES";
  let g;
  try {
    g = await ordenarGuia(relato, nombre);
  } catch (e) {
    console.warn("[guía] sin IA:", e.message);
    g = guiaSinIA(relato, nombre);
  }
  const propio = String(titulo ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (propio) g.titulo = mayus(propio);
  if (DELICADO.test(norm(relato + " " + g.titulo))) g.riesgo = "alto";
  if (g.riesgo === "alto" && !g.advertencias.length) {
    g.advertencias.push("Es un tema delicado: hágalo con cuidado y, ante cualquier duda, pida ayuda a alguien con experiencia.");
  }
  return {
    ...g, relato,
    autor: nombre, comuna: String(comuna ?? ""), telefono: String(telefono ?? ""),
    estado: g.riesgo === "alto" ? "en revisión" : "publicada",
    aprendieron: 0,
  };
}
