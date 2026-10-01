// SABERES · Audio o video → curso publicado
// Lo comparten WhatsApp (lib/zavu-entrada.js) y la subida desde la web
// (/api/subir-curso): guardar archivo → ffmpeg → Voxtral → estructurarGuia → guardarGuia.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpeg from "ffmpeg-static";

const correr = promisify(execFile);
export const CARPETA_MEDIA = "public/media";
const MAX_BYTES = 60 * 1024 * 1024;

// Texto usado cuando no hay MISTRAL_API_KEY o se pide ?mock=1: así la demo funciona sin llaves
const TRANSCRIPCION_DEMO = "Lo primero es lavarse bien las manos. Después ponga la harina en un bol grande y hágale un hoyito al medio. "
  + "Luego eche la manteca derretida tibia y el agua con sal, de a poco. Entonces amase hasta que la masa no se pegue en las manos. "
  + "Después deje reposar la masa tapada con un paño. Al final forme los panes y hornéelos hasta que estén doraditos.";

// Descarga una URL de archivo (http/https) con límite de tamaño y tiempo
export async function descargar(url, headers = {}) {
  if (!/^https?:\/\//i.test(url)) throw new Error("URL de archivo inválida");
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`No pude descargar el archivo (${r.status})`);
  const datos = Buffer.from(await r.arrayBuffer());
  if (datos.length > MAX_BYTES) throw new Error("El archivo es muy grande");
  return datos;
}

const extension = (tipo, mime = "") =>
  tipo === "video" ? (/webm/.test(mime) ? ".webm" : /quicktime/.test(mime) ? ".mov" : ".mp4")
    : /mpeg|mp3/.test(mime) ? ".mp3" : /mp4|m4a|aac/.test(mime) ? ".m4a" : /wav/.test(mime) ? ".wav"
    : /webm/.test(mime) ? ".webm" : ".ogg";

// Saca el audio en mono a 16 kHz (lo que mejor entiende Voxtral)
async function aMp3(entrada, salida) {
  await correr(ffmpeg, ["-y", "-loglevel", "error", "-i", entrada, "-vn", "-ac", "1", "-ar", "16000", salida], { timeout: 120000 });
}

export async function transcribir(rutaMp3, { mock = false } = {}) {
  const llave = process.env.MISTRAL_API_KEY;
  if (mock || !llave) {
    console.warn("[voxtral] sin MISTRAL_API_KEY (o ?mock=1): uso una transcripción de demo");
    return TRANSCRIPCION_DEMO;
  }
  const form = new FormData();
  form.append("model", process.env.MISTRAL_STT_MODEL || "voxtral-mini-latest");
  form.append("language", "es");
  form.append("file", new Blob([await readFile(rutaMp3)], { type: "audio/mpeg" }), "audio.mp3");
  const r = await fetch("https://api.mistral.ai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${llave}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) throw new Error(`Voxtral respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const texto = String((await r.json()).text || "").trim();
  if (!texto) throw new Error("Voxtral no devolvió texto");
  return texto;
}

/**
 * @param {{ id: string, datos: Buffer, tipo: "audio"|"video", mime?: string,
 *   titulo?: string, autor?: string, telefono?: string, comuna?: string, autorId?: string,
 *   origen: string, mock?: boolean }} curso
 * @param {{ estructurarGuia: Function, guardarGuia: Function }} fns
 */
export async function crearCurso(curso, { estructurarGuia, guardarGuia }) {
  const { id, datos, tipo, mime = "", titulo, autor, telefono, comuna, autorId, origen, mock } = curso;
  const nombre = String(id).replace(/[^\w-]/g, "").slice(0, 80) || String(Date.now());
  // Para la demo en vivo nada corta el flujo: si falla el archivo, ffmpeg o Voxtral,
  // el curso se publica igual (sin reproductor o con la transcripción de demo).
  let media = null, texto = "";
  if (datos?.length) {
    try {
      await mkdir(CARPETA_MEDIA, { recursive: true });
      const original = `${CARPETA_MEDIA}/${nombre}${extension(tipo, mime)}`;
      await writeFile(original, datos);
      if (tipo === "video") media = { tipo, url: "/" + original.replace(/^public\//, "") };
      const mp3 = `${CARPETA_MEDIA}/${nombre}${original.endsWith(".mp3") ? "-16k" : ""}.mp3`;
      await aMp3(original, mp3);
      // El audio se sirve en mp3 (los de WhatsApp son .ogg, que Safari no reproduce)
      if (tipo !== "video") media = { tipo, url: "/" + mp3.replace(/^public\//, "") };
      texto = await transcribir(mp3, { mock });
    } catch (e) {
      console.error("[curso] el archivo falló, sigo igual:", e.message);
    }
  }
  // Solo si no se entendió nada se usa el relato de ejemplo; si dijo algo, aunque sea poco, se usa lo que dijo
  if (!texto.trim()) {
    console.warn("[curso] sin transcripción: uso la de demo");
    texto = TRANSCRIPCION_DEMO;
  }
  const g = await estructurarGuia({ texto, titulo, autor, telefono, comuna });
  if (media) g.media = media;
  g.transcripcion = texto;
  g.origen = origen;
  if (autorId) g.autor_id = autorId;
  return guardarGuia(g);
}
