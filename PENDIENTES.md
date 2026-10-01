# SABERES – Qué falta (vs. "Plan completo Hack4Seniors")

> Revisado el 1 de octubre de 2026 contra `main` (`4afffd0`).
> **El flujo principal está hecho:** enseñar → aprender paso a paso → "gracias" por WhatsApp, más registro por voz, vista de jóvenes y filtro de seguridad.
> Lo que falta es sobre todo **entrega y demo**.

## ✅ Ya cumple el plan

| Parte del plan | En el repo |
|---|---|
| Endpoints `registro`, `entrar`, `ensenar`, `buscar`, `ayuda`, `aprendi`, `guias` | Todos (+ `descartar`), en Supabase Edge Function |
| Respaldo Mistral → OpenRouter | `supabase/functions/api/ia.js` |
| Filtro de seguridad (gas, electricidad, remedios → "en revisión") | Sí, con lista propia además de la IA |
| Voz: `hablar`, `escuchar`, `grabarHastaQueToque`, `es-CL`, "más lento" | En `public/app.js` |
| "Gracias" por WhatsApp (Zavu) + Telegram de respaldo | `avisos.js`, solo en hitos (1, 10, 50, 100, cada 100) |
| 5 guías precargadas con los autores del plan | `supabase/seed.sql` |
| Respaldo si la IA tarda > 10 s | Pasa a `mock.js` (modo simulado) |
| Pantallas, botones de 84 px, campo para escribir si falla el micrófono | Sí (20 pantallas) |
| `.env` fuera del repo | Sí |

---

## 🎨 P1 – Interfaz

- [ ] **Borrar restos de la idea anterior (MODO SENIOR+)**, que nadie usa: `public/demo.json`, `public/semaforo.json` y `public/fotos/` (7 SVG). El respaldo real es `mock.js`.
- [ ] **Guion de la demo:** en el momento 3, el jurado debe abrir **la guía nueva de Rosa** (parte en 0). Si abre una precargada (ej. 58 → 59) **no sale WhatsApp** por los hitos. Destacarla primero en la vista de jóvenes ayuda.
- [ ] Verificar el **clic inicial** para que Chrome permita el audio (riesgo del plan).
- [ ] **Capturas de pantalla** de las vistas para el README y las slides.
- [ ] Decidir si se suma la pregunta opcional del **celular de un familiar** (el plan la tiene; hoy no está). Para la demo es mejor sin ella: el aviso siempre llega a `NUMERO_DEMO`.
- [ ] Día de la demo: **maneja la vista de mayores**.

## 🧠 P2 – IA y backend

- [ ] **Cargar secretos** en Supabase → Edge Functions → Secrets: `ZAVUDEV_API_KEY`, `NUMERO_DEMO` (y opcional `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`).
- [ ] **Volver a desplegar** la función `api` con los avisos de P3.
- [ ] **Actualizar el README**: hoy describe Express, `data/*.json`, `voz.js` y `node server.js`. Debe decir Supabase, `npm install && npm start`, y el diagrama de arquitectura real.
- [ ] **Seguridad** (encontrado en revisión automática; no bloquea la demo):
  - `/ensenar` confía en el `usuarioId` del navegador → se puede publicar a nombre de otra persona.
  - `/descartar` igual → se puede borrar la guía de otra persona (si nadie aprendió con ella).
  - `server.js` pega la URL tal cual a Supabase → con `../` se podría llegar a otras funciones del proyecto.
  - `/aprendi` sin límite → se podría inflar el contador y disparar WhatsApp en los hitos.
- [ ] Día de la demo: **maneja la vista de jóvenes**.

## 🔌 P3 – Integraciones

- [ ] **Dejar funcionando WhatsApp con Zavu** y probarlo con un envío real:
  - Llave `zv_test_`: el celular de `NUMERO_DEMO` inscrito como miembro del equipo en Zavu.
  - Llave `zv_live_`: requiere WhatsApp Business; el celular debe escribir primero al número de Zavu (ventana de 24 h).
- [ ] **Plan B: Telegram** configurado (`@BotFather` → `/newbot` → escribirle al bot → `chat.id` en `getUpdates`). Ojo: el canal de Zavu ahora es solo WhatsApp, así que el plan B del plan (`ZAVU_CANAL=sms`) ya no aplica.
- [ ] **Hacer el repo público** (hoy GitHub responde 404) antes de las 16:45, sin el `.env`.
- [ ] **Prueba de punta a punta:** registro → enseñar → jurado aprende la guía nueva → llega el WhatsApp.
- [ ] **Grabar el video de respaldo** de la demo completa (15:30).
- [ ] Opcional: **modo demo** para que el aviso salga aunque el jurado aprenda con una guía precargada.
- [ ] Día de la demo: **tener el celular que recibe el "gracias"**, cargado y con el chat abierto; entregarlo al jurado antes de empezar.

---

## 📣 Entre todos (pitch y entrega)

- [ ] Checkpoint 1 enviado (12:45).
- [ ] Slides subidas antes de las 16:45: datos del problema, capturas y diagrama de arquitectura.
- [ ] Pitch ensayado 3 veces en 4:00 exactos.

## Fuera de alcance (a propósito)

"Preguntarle al autor" y "pedir clase por videollamada" (sección Conecto del plan) no están; queda como "próximo paso". El plan lo respalda: *un flujo completo funcionando perfecto vale más que todas las funciones a medias.*
