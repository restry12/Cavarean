// SABERES · Guías en el servidor local (Node)
// estructurarGuia es la misma de /api/ensenar (supabase/functions/api/guias.js).
// guardarGuia la deja en Supabase si hay SUPABASE_SERVICE_ROLE_KEY en .env;
// si no, en data/guias.json (modo local), y server.js la suma a GET /api/guias.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
export { estructurarGuia } from "../supabase/functions/api/guias.js";

const ARCHIVO = "data/guias.json";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://qpaolqiurfnpdhzilxwe.supabase.co";
const llave = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lo que ve el navegador: sin teléfono ni relato crudo (igual que aGuia en index.ts)
const aGuia = ({ autor_id, relato, creado_en, telefono, ...g }) => ({ ...g, autorId: autor_id ?? g.autorId ?? null });

async function leerArchivo() {
  try { return JSON.parse(await readFile(ARCHIVO, "utf8")); } catch { return []; }
}

export async function leerGuiasLocales() {
  return (await leerArchivo()).map(aGuia);
}

// Las escrituras al archivo van en fila, para que dos cursos a la vez no se pisen
let fila = Promise.resolve();

export async function guardarGuia(guia) {
  if (llave()) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/guias`, {
      method: "POST",
      headers: {
        apikey: llave(), Authorization: `Bearer ${llave()}`,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify(guia),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`Supabase no guardó la guía (${r.status}): ${await r.text()}`);
    return aGuia((await r.json())[0]);
  }
  const nueva = { id: "g-" + randomBytes(5).toString("hex"), creado_en: new Date().toISOString(), ...guia };
  const escribir = fila.then(async () => {
    const todas = await leerArchivo();
    todas.unshift(nueva);
    await mkdir("data", { recursive: true });
    await writeFile(ARCHIVO, JSON.stringify(todas, null, 2));
  });
  fila = escribir.catch(() => {});
  await escribir;
  return aGuia(nueva);
}
