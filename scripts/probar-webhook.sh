#!/usr/bin/env bash
# Prueba el flujo "curso por WhatsApp" sin WhatsApp: manda a /webhooks/zavu
# un mensaje de texto (nombre del curso) y luego uno de audio, sin firma.
# Requisitos: `npm start` corriendo y SIN ZAVU_WEBHOOK_SECRET en .env (modo demo).
#
#   MEDIA_URL_PRUEBA=https://.../audio.mp3 scripts/probar-webhook.sh
#
# Sin MEDIA_URL_PRUEBA, en macOS se graba un audio de prueba con `say`
# en public/media/prueba.mp3 y se sirve desde el mismo servidor.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${BASE:-http://localhost:3000}"
TEL="${TEL:-+56900000000}"
TITULO="${TITULO:-Sopaipillas pasadas}"
ID="prueba-$(date +%s)"

if [ -z "${MEDIA_URL_PRUEBA:-}" ]; then
  command -v say >/dev/null || { echo "Defina MEDIA_URL_PRUEBA con la URL de un audio (mp3/ogg)."; exit 1; }
  mkdir -p public/media
  say -v Paulina -o public/media/prueba.aiff "Mire, para las sopaipillas pasadas primero hace la chancaca: \
la pone en una olla con agua, una rama de canela y cáscara de naranja, y la deja hervir hasta que espese. \
Después fríe las sopaipillas en aceite bien caliente. Cuando estén doraditas, las mete en la chancaca \
y las deja un ratito para que se empapen. Ojo con el aceite, que salta."
  FFMPEG=$(node -e 'import("ffmpeg-static").then(m=>process.stdout.write(m.default))')
  "$FFMPEG" -y -loglevel error -i public/media/prueba.aiff -ac 1 -ar 16000 public/media/prueba.mp3
  rm -f public/media/prueba.aiff
  MEDIA_URL_PRUEBA="$BASE/media/prueba.mp3"
fi

enviar() {
  curl -sS -X POST "$BASE/webhooks/zavu" -H "Content-Type: application/json" -d "$1"
  echo
}

antes=$(curl -sS "$BASE/api/guias" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')

echo "1) Texto: \"$TITULO\""
enviar "{\"type\":\"message.inbound\",\"prueba\":true,\"data\":{\"messageId\":\"$ID-t\",\"from\":\"$TEL\",\"to\":\"+12024494825\",\"channel\":\"whatsapp\",\"messageType\":\"text\",\"text\":\"$TITULO\",\"profileName\":\"Rosa Prueba\"}}"
sleep 1

echo "2) Audio: $MEDIA_URL_PRUEBA"
enviar "{\"type\":\"message.inbound\",\"prueba\":true,\"data\":{\"messageId\":\"$ID-a\",\"from\":\"$TEL\",\"to\":\"+12024494825\",\"channel\":\"whatsapp\",\"messageType\":\"audio\",\"profileName\":\"Rosa Prueba\",\"content\":{\"mediaId\":\"prueba\",\"mimeType\":\"audio/mpeg\",\"mediaUrl\":\"$MEDIA_URL_PRUEBA\"}}}"

echo "3) Esperando la guía nueva (hasta 90 s)…"
for _ in $(seq 1 45); do
  sleep 2
  nueva=$(curl -sS "$BASE/api/guias" | ANTES="$antes" node -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
      const g=JSON.parse(s); if (g.length<=Number(process.env.ANTES)) return;
      const n=g.find(x=>x.origen==="whatsapp"); if (!n) return;
      console.log(JSON.stringify({id:n.id,titulo:n.titulo,pasos:n.pasos.length,estado:n.estado,media:n.media,transcripcion:n.transcripcion.slice(0,90)+"…"},null,2));
    })')
  if [ -n "$nueva" ]; then echo "$nueva"; echo "Ábrala en: $BASE/?guia=$(echo "$nueva" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).id))')"; exit 0; fi
done
echo "No apareció la guía. Revise la consola de npm start."; exit 1
