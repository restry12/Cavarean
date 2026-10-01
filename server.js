// Sirve la página en http://localhost:3000 y reenvía /api/* al backend en Supabase
// (supabase/functions/api). Así el frontend llama a /api/... sin cambios.
import "dotenv/config";
import express from "express";
import multer from "multer";
import { hayVoz, sintetizar } from "./supabase/functions/api/voz.js";
import { estructurarGuia, guardarGuia, leerGuiasLocales } from "./lib/guias.js";
import { crearCurso } from "./lib/curso.js";
import { montarZavu } from "./lib/zavu-entrada.js";

const API = process.env.SABERES_API || "https://qpaolqiurfnpdhzilxwe.supabase.co/functions/v1";

const app = express();
app.use(express.static("public"));

// Cursos por WhatsApp: va antes de cualquier parser (la firma usa el cuerpo crudo)
montarZavu(app, { estructurarGuia, guardarGuia });

// Plan B sin WhatsApp: subir un audio o video desde la pantalla Enseñar
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });
app.post("/api/subir-curso", subida.single("archivo"), async (req, res) => {
  const f = req.file;
  const tipo = /^video\//.test(f?.mimetype) ? "video" : /^audio\//.test(f?.mimetype) ? "audio" : null;
  if (!f || !tipo) return res.status(400).json({ error: "Mande un archivo de audio o de video." });
  try {
    const b = req.body || {};
    const guia = await crearCurso({
      id: `subida-${Date.now()}`, datos: f.buffer, tipo, mime: f.mimetype,
      titulo: b.titulo, autor: b.autor, comuna: b.comuna, autorId: b.usuarioId || undefined,
      origen: "subida", mock: req.query.mock === "1",
    }, { estructurarGuia, guardarGuia });
    res.json(guia);
  } catch (e) {
    console.error("[subir-curso]", e);
    res.status(500).json({ error: "No pude armar el curso con ese archivo." });
  }
});

// Las guías: las de Supabase más los cursos guardados en local (data/guias.json, sin SUPABASE_SERVICE_ROLE_KEY)
app.get("/api/guias", async (req, res) => {
  let remotas = [];
  try {
    const r = await fetch(API + "/api/guias", { signal: AbortSignal.timeout(15000) });
    if (r.ok) remotas = await r.json();
  } catch (e) { console.warn("[api] Supabase no respondió:", e.message); }
  const ids = new Set(remotas.map((g) => g.id));
  const locales = (await leerGuiasLocales()).filter((g) => g.origen && !ids.has(g.id));
  if (!remotas.length && !locales.length) return res.status(502).json({ error: "El servidor no respondió." });
  res.json([...locales, ...remotas]);
});

// La voz se genera aquí mismo si hay MISTRAL_API_KEY en .env (para probar en local)
if (hayVoz()) {
  app.post("/api/voz", express.json(), async (req, res) => {
    try {
      res.type("audio/mpeg").send(Buffer.from(await sintetizar(req.body?.texto)));
    } catch (e) {
      console.warn("[voz]", e.message);
      res.status(502).json({ error: "La voz no respondió." });
    }
  });
}
app.use("/api", express.raw({ type: "*/*", limit: "1mb" }));

// Solo se reenvían las rutas del backend: así nadie puede usar este servidor
// (por ejemplo con "../") para llegar a otras funciones del proyecto.
const RUTAS_API = /^\/api\/(registro|entrar|buscar|ayuda|ensenar|descartar|aprendi|voz|guias)$/;

app.all("/api/*ruta", async (req, res) => {
  if (!RUTAS_API.test(req.path)) return res.status(404).json({ error: "Ruta no encontrada." });
  try {
    const r = await fetch(API + req.path, {
      method: req.method,
      headers: { "Content-Type": req.get("Content-Type") || "application/json" },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
      signal: AbortSignal.timeout(15000),
    });
    res.status(r.status).type(r.headers.get("Content-Type") || "application/json").send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.warn("[api] Supabase no respondió:", e.message);
    res.status(502).json({ error: "El servidor no respondió." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SABERES en http://localhost:${PORT} · API: ${API} · voz: ${hayVoz() ? "Mistral (local)" : "Supabase"}`));
