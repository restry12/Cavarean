// =========================================================
// SABERES · Voz (Mistral Voxtral TTS)
// Convierte un texto corto en audio MP3 con una voz tranquila.
// Usa la misma MISTRAL_API_KEY que la IA. Si falla, lanza error
// y el frontend vuelve a la voz del navegador.
// =========================================================

const env = (k) => (globalThis.Deno ? Deno.env.get(k) : process.env[k]);

// Voz por defecto: "SABERES Chile", clonada de una hablante chilena de
// OpenSLR 71 (CC BY-SA 4.0, ver README). Vive en la cuenta de la MISTRAL_API_KEY.
const VOZ_POR_DEFECTO = "01a0f880-4807-7025-a8ad-15a50f81a12b";
const MAX_CARACTERES = 600;

export const hayVoz = () => Boolean(env("MISTRAL_API_KEY"));

export async function sintetizar(texto) {
  texto = String(texto ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CARACTERES);
  if (!texto) throw new Error("Texto vacío");
  const r = await fetch("https://api.mistral.ai/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("MISTRAL_API_KEY")}` },
    body: JSON.stringify({
      model: env("MISTRAL_TTS_MODEL") || "voxtral-mini-tts-2603",
      input: texto,
      voice_id: env("MISTRAL_VOICE_ID") || VOZ_POR_DEFECTO,
      response_format: "mp3",
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Mistral voz ${r.status}: ${(await r.text()).slice(0, 200)}`);
  // Mistral responde { audio_data: <mp3 en base64> }
  const { audio_data } = await r.json();
  return Uint8Array.from(atob(audio_data), (c) => c.charCodeAt(0));
}
