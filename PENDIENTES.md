# SABERES – Qué falta (vs. [Plan completo Hack4Seniors](docs/plan-completo-saberes.pdf))

> Revisado el 1 de octubre de 2026 contra `main` (`4afffd0`). **Actualizado por P2 a las 14:20** (estado de la IA, el backend y Supabase).
> **El flujo principal está hecho:** enseñar → aprender paso a paso → "gracias" por WhatsApp, más registro por voz, vista de jóvenes y filtro de seguridad.
> Lo que falta es sobre todo **entrega y demo**.

## ✅ Ya cumple el plan

| Parte del plan | En el repo |
|---|---|
| Endpoints `registro`, `entrar`, `ensenar`, `buscar`, `ayuda`, `aprendi`, `guias` | Todos (+ `descartar`), en Supabase Edge Function |
| Respaldo Mistral → OpenRouter | `supabase/functions/api/ia.js`, con **Mistral Medium 3.5** (`mistral-medium-2604`): ganó a Small y Large en `npm run probar-ia` |
| Filtro de seguridad (gas, electricidad, remedios → "en revisión") | Sí, con lista propia además de la IA |
| Voz: `hablar`, `escuchar`, `grabarHastaQueToque`, `es-CL`, "más lento" | En `public/app.js` |
| "Gracias" por WhatsApp (Zavu) + Telegram de respaldo | `avisos.js`, solo en hitos (1, 10, 50, 100, cada 100) |
| 5 guías precargadas con los autores del plan | `supabase/seed.sql` |
| Respaldo si la IA tarda > 10 s | Pasa a `mock.js` (modo simulado) |
| Pantallas, botones de 84 px, campo para escribir si falla el micrófono | Sí (20 pantallas) |
| `.env` fuera del repo | Sí |
| IA ordena el relato y corrige el dictado en silencio, sin inventar consejos | `ia.js` (probado con "gaffiter / ca ñería" → "gásfiter / cañería") |
| IA explica **solo** con la guía guardada en la base | `/api/ayuda` ignora la guía que manda el navegador |
| Función `api` desplegada con los avisos de P3 | Supabase, versión 6 |
| README actualizado (Supabase, `npm start`, arquitectura real) | `README.md` |

---

## 🎨 P1 – Interfaz

- [x] ~~Borrar restos de MODO SENIOR+~~ → borrados `demo.json`, `semaforo.json` y `public/fotos/` (nadie los usaba).
- [x] ~~Destacar la guía nueva de Rosa~~ → las guías con 0 aprendieron salen **primero** y con la etiqueta *Nueva*, en la vista de jóvenes y en la bienvenida.
- [ ] **Guion de la demo:** en el momento 3, el jurado abre **la primera guía de la lista** (la nueva de Rosa, en 0). Si abre una precargada (ej. 58 → 59) **no sale WhatsApp** por los hitos. Antes de la demo, correr `reiniciar_demo()` para que no quede otra guía de prueba en 0 que le gane el primer lugar.
- [x] ~~Verificar el clic inicial del audio~~ → la bienvenida no habla sola; la primera voz sale siempre después de un toque, y Chrome recuerda ese toque para toda la página (probado en Chrome con la voz de Mistral). Si se recarga la página a mitad de la demo, tocar cualquier botón antes de que hable.
- [x] ~~Capturas~~ → `docs/capturas/` (bienvenida, explorar guías, guía paso a paso), ya en el README. Faltan las de la vista de mayores con sesión iniciada si se quieren en las slides.
- [x] ~~Celular de un familiar~~ → **no se suma**: para la demo el aviso siempre llega a `NUMERO_DEMO`. Queda como próximo paso.
- [ ] Día de la demo: **maneja la vista de mayores**.

## 🧠 P2 – IA y backend

- [x] ~~Volver a desplegar la función `api` con los avisos de P3~~ → hecho (versión 6, probada: hitos 1, 10, 50, 100 y cada 100).
- [x] ~~Actualizar el README~~ → ahora describe Supabase, `npm start`, la arquitectura real y qué hace la IA.
- [ ] **Cargar secretos de Zavu en Supabase** → [Edge Functions → Secrets](https://supabase.com/dashboard/project/qpaolqiurfnpdhzilxwe/functions/secrets):
  - `ZAVUDEV_API_KEY`: la llave `zv_test_` ya la tiene P2 (está en su `.env` local).
  - `NUMERO_DEMO`: el número ya lo tiene P2 (está en su `.env` local). Con llave `zv_test_` ese celular debe estar inscrito como miembro del equipo en Zavu.
  - Opcional: `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`.
  - No hace falta volver a desplegar: los secretos se leen solos.
- [x] ~~Seguridad: `server.js` reenviaba cualquier ruta a Supabase~~ → ahora solo reenvía las rutas de `/api` conocidas (probado con `../` y `%2e%2e`: 404).
- [x] ~~Seguridad: `/aprendi` sin límite~~ → cuenta 1 vez por persona (IP) y guía cada 10 minutos; si no suma, no manda WhatsApp (función SQL `contar_aprendizaje`, desplegada en la v10).
- [ ] **Seguridad pendiente:** `/ensenar` y `/descartar` confían en el `usuarioId` del navegador → se puede publicar o borrar a nombre de otra persona. Necesita un token de sesión que devuelvan registro y entrar, y que `app.js` lo mande. **Se deja para después de la demo:** el menú de demo (tecla D) entra como Rosa sin token, así que exigirlo hoy rompería la presentación.
- [x] ~~Voz con Mistral Voxtral~~ → en `main` y desplegada.
- [x] ~~"Escuchar esta página" leía solo el título~~ → ahora lee todo el contenido visible; verificado en Chrome: 0 textos sin voz en las 20 pantallas.
- [ ] Día de la demo: **maneja la vista de jóvenes**.
- Para repetir la demo desde cero: `select public.reiniciar_demo();` en el SQL Editor de Supabase (también borra el registro de "¡Aprendí!", así el primero vuelve a avisar).
- Ojo en los ensayos: desde un mismo computador, "¡Aprendí!" en la **misma guía** cuenta una sola vez cada 10 minutos. Usen una guía nueva o corran `reiniciar_demo()`.

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
