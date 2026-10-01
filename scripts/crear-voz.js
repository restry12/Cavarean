// Crea una voz propia en Mistral a partir de una grabación y la deja en .env
// Uso: npm run crear-voz -- ruta/al/audio.mp3 "Nombre de la voz"
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const [archivo, nombre = "SABERES"] = process.argv.slice(2);
if (!archivo || !fs.existsSync(archivo)) {
  console.error('Uso: npm run crear-voz -- ruta/al/audio.mp3 "Nombre de la voz"');
  process.exit(1);
}
if (!process.env.MISTRAL_API_KEY) {
  console.error("Falta MISTRAL_API_KEY en .env");
  process.exit(1);
}

const r = await fetch("https://api.mistral.ai/v1/audio/voices", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
  body: JSON.stringify({
    name: nombre,
    sample_audio: fs.readFileSync(archivo).toString("base64"),
    sample_filename: path.basename(archivo),
    languages: ["es"],
    tags: ["calm", "warm"],
  }),
});
const datos = await r.json().catch(() => ({}));
if (!r.ok || !datos.id) {
  console.error("Mistral no creó la voz:", r.status, JSON.stringify(datos).slice(0, 400));
  process.exit(1);
}

// Guarda (o reemplaza) MISTRAL_VOICE_ID en .env
const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const linea = `MISTRAL_VOICE_ID=${datos.id}`;
fs.writeFileSync(".env", /^MISTRAL_VOICE_ID=.*$/m.test(env)
  ? env.replace(/^MISTRAL_VOICE_ID=.*$/m, linea)
  : env.replace(/\n?$/, "\n") + linea + "\n");

console.log(`Voz "${datos.name}" creada: ${datos.id}`);
console.log("Quedó en .env. Reinicie el servidor y, para producción, agregue el mismo valor como secreto en Supabase.");
