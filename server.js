// Sirve la página en http://localhost:3000 y reenvía /api/* al backend en Supabase
// (supabase/functions/api). Así el frontend llama a /api/... sin cambios.
import express from "express";

const API = process.env.SABERES_API || "https://qpaolqiurfnpdhzilxwe.supabase.co/functions/v1";

const app = express();
app.use(express.static("public"));
app.use("/api", express.raw({ type: "*/*", limit: "1mb" }));

app.all("/api/*ruta", async (req, res) => {
  try {
    const r = await fetch(API + req.originalUrl, {
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
app.listen(PORT, () => console.log(`SABERES en http://localhost:${PORT} · API: ${API}`));
