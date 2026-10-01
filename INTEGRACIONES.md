# P3 – Integraciones: el "gracias" por WhatsApp

> Estado: **unido a `main`** junto con el backend de P2 (`andy-backend`).
> Falta cargar los secretos de Zavu en Supabase y volver a desplegar la función (ver checklist).

## Qué hace

Cuando alguien aprende con una guía, al autor le llega un **WhatsApp a través de Zavu**.

Para no saturar a la persona mayor, **solo se avisa en hitos**:
**la primera persona, 10, 50, 100 y luego cada 100** (200, 300…).

Ejemplos:

- 1.ª persona: *"¡Hola, Rosa! 💌 Tomás es la primera persona que aprendió «Sopaipillas pasadas» gracias a usted. Le dice: "¡Me quedaron ricas!" ¡Gracias por enseñar en SABERES! 💛"*
- Hito: *"¡Hola, Rosa! 🎉 Ya son 50 personas que aprendieron «Sopaipillas pasadas» gracias a usted. La última fue Tomás. ¡Gracias por enseñar en SABERES! 💛"*

La nota del aprendiz ("Le dice…") se mantiene, con el mismo filtro de P2 (sin links ni teléfonos). Si no es hito, no se envía nada.

## Dónde está el código

| Archivo | Cambio |
|---|---|
| `supabase/functions/api/avisos.js` | **Nuevo.** Módulo de avisos: hitos, WhatsApp por Zavu, respaldo. Mismo estilo que `ia.js`; funciona en Deno y Node. |
| `supabase/functions/api/index.ts` | Cambio mínimo: `import { avisarGracias } from "./avisos.js"`, `aprendi()` lo llama y se quita `avisarAutor`. |
| `.env.example` | Se quitan `AVISO` y `ZAVU_CANAL` (ya no se usan). |

Llamada dentro de `aprendi()`, después de `sumar_aprendieron`:

```ts
avisarGracias({
  telefono: autor?.telefono, autor: g.autor, titulo: g.titulo,
  aprendiz: nombre, aprendieron: total, nota: seguro ? nota : "",
});
```

- Responde al tiro; el envío sigue en segundo plano (`EdgeRuntime.waitUntil`).
- Nunca lanza errores: si Zavu falla prueba **Telegram** (si está configurado) y, si no, queda en los logs.

## Envío

`POST https://api.zavu.dev/v1/messages`
`Authorization: Bearer ZAVUDEV_API_KEY`
`{ "to": "<telefono del autor o NUMERO_DEMO>", "text": "...", "channel": "whatsapp" }`

## ✅ Checklist por persona

**P2 (backend)**
- [x] ~~Unir `p3-integraciones`~~ (ya está en `main`). Si sigues trabajando en `andy-backend`, haz `git merge main` para traer los avisos.
- [ ] Cargar secretos en Supabase → Edge Functions → Secrets: `ZAVUDEV_API_KEY`, `NUMERO_DEMO` (opcional: `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`).
- [ ] Volver a desplegar la función `api`.
- [ ] `AVISO` y `ZAVU_CANAL`, si ya estaban cargados, ahora se ignoran.

**Todo el equipo (antes de la demo)**
- [ ] Con llave **`zv_test_`** (sandbox): el celular de `NUMERO_DEMO` debe estar inscrito como miembro del equipo en Zavu.
- [ ] Con llave **`zv_live_`**: desde el celular de destino, mandar un "hola" al número de Zavu (WhatsApp solo deja texto libre si la persona escribió en las últimas 24 h).
- [ ] Probar con una guía nueva: parte en 0, así que el primer "¡Aprendí!" dispara el WhatsApp de "primera persona".

**P4 (pitch)**
- Los avisos por hitos son parte del discurso: *"no la saturamos; le avisamos cuando su saber llega a la primera persona, a 10, a 50, a 100…"*.

## Ajustes rápidos

- Cambiar hitos: `HITOS` y `CADA_DESPUES` al inicio de `avisos.js`.
- Cambiar textos: función `textoGracias` en `avisos.js`.
- **Modo demo:** secreto `AVISAR_SIEMPRE=1` en Supabase → avisa en cada "¡Aprendí!", aunque la guía no esté en un hito (ej. el jurado abre una precargada en 58 → 59). Se lee solo, sin volver a desplegar. Borrarlo después de la demo.

## Probar en local (Node)

```js
// probar.mjs  →  node probar.mjs
import "dotenv/config";
import { avisarGracias } from "./supabase/functions/api/avisos.js";
console.log(await avisarGracias({ autor: "Rosa Pérez", titulo: "Sopaipillas", aprendiz: "Tomás", aprendieron: 1 }));
```

Dudas: P3 – Integraciones.
