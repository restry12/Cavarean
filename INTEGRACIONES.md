# P3 – Integraciones: avisos al autor

Cuando alguien aprende con una guía, al autor le llega un mensaje de agradecimiento.
Para no saturarlo, **solo se avisa en hitos**: la primera persona, 10, 50, 100 y luego cada 100 (200, 300…).

## Dónde está

| Archivo | Qué es |
|---|---|
| `supabase/functions/api/avisos.js` | Módulo de avisos (P3). Funciona en Deno (Edge Function) y en Node. |
| `supabase/functions/api/index.ts` | Backend (P2). La ruta `POST /aprendi` llama a `avisarGracias`. |

Ya está conectado en `aprendi()`, después de `sumar_aprendieron`:

```ts
avisarGracias({
  telefono: autor?.telefono, autor: g.autor, titulo: g.titulo,
  aprendiz: nombre, aprendieron: total, nota: seguro ? nota : "",
});
```

- Se responde al tiro; el envío sigue en segundo plano (`EdgeRuntime.waitUntil`).
- Nunca lanza errores; si todo falla, el mensaje queda en los logs de la función.
- La `nota` del aprendiz ya viene filtrada por `index.ts` (sin links ni teléfonos). Si no es hito, la nota no se envía.

Devuelve `{ ok, enviado, canal?, texto?, id?, motivo?, errores[] }`.

## Canal: WhatsApp por Zavu

1. **WhatsApp a través de Zavu**: `POST https://api.zavu.dev/v1/messages` con `channel: "whatsapp"` y `Authorization: Bearer ZAVUDEV_API_KEY`, al `telefono` del autor o a `NUMERO_DEMO`.
2. Si Zavu falla, **Telegram** de respaldo (`TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`), si está configurado.
3. Si nada funciona, queda en consola.

Las variables van como secretos de la Edge Function (Supabase → Edge Functions → Secrets). Ver `.env.example`.

## Mensajes

- Primera persona: *"¡Hola, Rosa! 💌 Tomás es la primera persona que aprendió «Sopaipillas pasadas» gracias a usted. Le dice: "¡Me quedaron ricas!" ¡Gracias por enseñar en SABERES! 💛"*
- Hitos: *"¡Hola, Rosa! 🎉 Ya son 50 personas que aprendieron «Sopaipillas pasadas» gracias a usted. La última fue Tomás. ¡Gracias por enseñar en SABERES! 💛"*

Los hitos se cambian en `HITOS` y `CADA_DESPUES` al inicio de `avisos.js`.

## Probar en local (Node)

```js
// probar.mjs
import "dotenv/config";
import { avisarGracias } from "./supabase/functions/api/avisos.js";
console.log(await avisarGracias({ autor: "Rosa Pérez", titulo: "Sopaipillas", aprendiz: "Tomás", aprendieron: 1 }));
```

## Ojo para la demo

- **Llave `zv_test_`** (sandbox): solo WhatsApp y solo a celulares de miembros del equipo en Zavu. El número de destino debe estar inscrito.
- **Llave `zv_live_`**: WhatsApp solo permite texto libre si ese número escribió en las últimas 24 h. Antes de la demo, mandar un "hola" desde el celular de destino al número de Zavu.
- Una guía nueva parte en 0, así que el primer aprendiz dispara el aviso de "primera persona".
