// Sirve la página en http://localhost:3000 para probar en local.
// El backend vive en Supabase (supabase/functions/api); la URL está en public/config.js.
import express from "express";

const app = express();
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SABERES en http://localhost:${PORT}`));
