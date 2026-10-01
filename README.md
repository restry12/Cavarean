# MODO SENIOR+ 📱✨

**El celular que se adapta a ti, hace lo que le pides y te avisa a tiempo cuando tu cuerpo empieza a cambiar.**

Proyecto desarrollado en **Hack4Seniors UDD 2026** (1 de octubre, La Nave – Plaza_i, Universidad del Desarrollo).
Eje: **Vida diaria de la persona mayor**, con foco en **prevención y autonomía** para personas de 50 años o más.

---

## 🧭 El problema

Los celulares se diseñan para personas de 25 años. Desde los 50, el cuerpo empieza a cambiar (vista, audición, precisión de las manos, forma de caminar) y la tecnología no se adapta:

- Solo **1 de cada 4 personas mayores** hace trámites digitales sin ayuda.
- Las estafas por SMS y teléfono contra personas mayores **aumentaron un 467%** entre 2018 y 2025.
- Las señales tempranas de cambio (agrandar la letra cada vez más, subir el volumen al máximo, equivocarse más al tocar) **pasan desapercibidas** hasta que se pierde la autonomía.

## 💡 La solución

MODO SENIOR+ tiene **3 capas**:

| Capa | Qué hace |
|---|---|
| **1. Se adapta** | Con un botón, el celular se vuelve simple: botones grandes, letra legible y contactos con foto. Además se **ajusta solo** según lo que detecta: agranda la letra, los botones o mejora el contraste. |
| **2. Lo hace por ti (agente de IA)** | La persona habla y el agente **ejecuta la tarea**: enviar una foto, llamar, leer un mensaje, crear un recordatorio. Siempre confirma antes de enviar algo. Botón **"Me perdí"** que mira la pantalla, explica dónde está la persona y **detecta estafas**. |
| **3. Te cuida** | Registra **cómo** se usa el celular (nunca el contenido) y entrega un **Semáforo de Autonomía** con 4 señales (Ver, Oír, Manos, Caminar), conectado a recursos de la comuna: óptica municipal, CESFAM, GES de audífonos y talleres de actividad física. |

---

## 🎬 Demo

1. Se activa el **Modo Senior** y la pantalla se transforma.
2. *"Mándale a mi hija la foto del almuerzo"* → el agente elige la foto, pregunta *"¿Se la envío a Carolina?"* y, al decir que sí, **la envía de verdad** a un celular real.
3. Llega un **SMS falso** → la persona aprieta "Me perdí" → la IA revisa la pantalla y aparece la **alerta roja**.
4. *"No veo bien"* → el agente agranda la letra en vivo.
5. *"Recuerda que el jueves a las 10 tengo kinesiólogo"* → luego *"¿Qué tengo el jueves?"* → responde de memoria.
6. **Semáforo de Autonomía** de "Patricia, 58 años", con tendencias de 12 semanas y recomendaciones locales.

> 🎥 Video de la demo: _[agregar link]_

---

## 🏗️ Arquitectura

```
[Celular simulado (navegador)]  ──HTTP──►  [Backend Node/Express]
  Modo Senior + agente                       /api/agente
  Me perdí + estafas                         /api/meperdi
  Semáforo de autonomía                      /api/eventos
  respaldo demo.json                         /api/semaforo
                                             /api/enviar
                                                │
                      ┌─────────────────────────┼─────────────────────────┐
                      ▼                         ▼                         ▼
               Mistral (principal)      OpenRouter (respaldo)       Zavu / Telegram
               agente + visión          si Mistral falla            mensaje real a la familia
```

| Componente | Tecnología |
|---|---|
| Frontend (celular simulado) | HTML, CSS y JavaScript; Web Speech API (voz); html2canvas; Chart.js |
| Backend | Node.js 20 + Express |
| Agente de IA | **Mistral** (`mistral-small-latest` con *function calling*) |
| Visión ("Me perdí" y estafas) | **Mistral** (`pixtral-large-latest`) |
| Respaldo de IA | **OpenRouter** (modelo con entrada de imagen) |
| Mensajería real | **Zavu** (WhatsApp o SMS) y Telegram como respaldo |

---

## 🤖 Herramientas del agente

| Herramienta | Ejemplo de pedido | Confirma antes |
|---|---|---|
| `llamar` | "Llama al doctor" | No |
| `enviar_mensaje` | "Dile a Pedro que llego a las 6" | ✅ Sí |
| `enviar_foto` | "Mándale a mi hija la foto del almuerzo" | ✅ Sí |
| `leer_mensajes` | "¿Qué me escribió Carolina?" | No |
| `crear_recordatorio` | "Recuérdame el kinesiólogo el jueves a las 10" | No |
| `revisar_pantalla` | "¿Este mensaje es real?" | No |
| `ajustar_interfaz` | "No veo bien" | No |
| `ensenar_paso_a_paso` | "Enséñame a mandar fotos" | No |
| `recordar_dato` | "Recuerda que tomo losartán en la mañana" | No |

---

## 🚀 Cómo correrlo

### Requisitos

- Node.js 20 o superior
- Google Chrome (para voz y reconocimiento de voz)
- Llaves de API de Mistral, OpenRouter y Zavu (y opcionalmente un bot de Telegram)

### Instalación

```bash
git clone https://github.com/restry12/Caravean.git
cd Caravean
npm install
```

### Variables de entorno

Crea un archivo `.env` en la raíz (**no lo subas al repositorio**):

```env
MISTRAL_API_KEY=tu_llave
OPENROUTER_API_KEY=tu_llave
OPENROUTER_MODEL=google/gemini-2.0-flash-001
ZAVUDEV_API_KEY=tu_llave
ZAVU_CANAL=whatsapp          # o sms
NUMERO_HIJA=+569XXXXXXXX
TELEGRAM_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
AVISO=zavu                   # o telegram
```

### Ejecutar

```bash
node server.js
```

Abre **http://localhost:3000** en Chrome. Haz un clic en la página antes de empezar para que el navegador permita el audio.

---

## 📁 Estructura

```
Caravean/
├─ server.js          # backend: agente, visión, eventos, semáforo, envíos
├─ perfil.json        # perfil que aprende: contactos, preferencias, memoria, métricas
├─ .env               # llaves (no se sube)
└─ public/
   ├─ index.html      # celular simulado + panel del Semáforo
   ├─ estilos.css
   ├─ app.js          # Modo Senior, agente, Me perdí, adaptación
   ├─ semaforo.json   # 12 semanas de datos de ejemplo
   ├─ demo.json       # respuestas de respaldo
   └─ fotos/          # galería y contactos de ejemplo
```

---

## 🔒 Privacidad y seguridad

- El agente **nunca** hace transferencias ni compras, ni pide claves.
- **Confirma siempre** antes de enviar mensajes o fotos.
- Registra **cómo** se usa el celular (tamaño de letra, volumen, toques fallidos, pasos) y **nunca el contenido** de los mensajes.
- El Semáforo **no diagnostica**: detecta tendencias y recomienda consultar.
- Respaldo automático: si Mistral falla, responde OpenRouter; si no hay red, la demo usa `demo.json`.

> ⚠️ Prototipo de hackatón con datos ficticios. La versión real en Android usaría el **servicio de accesibilidad** del sistema para guiar y actuar dentro de otras apps.

---

## 🗺️ Próximos pasos

- [ ] App Android nativa con servicio de accesibilidad
- [ ] Medición de la marcha con los sensores del propio celular
- [ ] Validación con personas de 50+ en una comuna piloto
- [ ] Integración con ópticas municipales, CESFAM y talleres comunales
- [ ] Más herramientas para el agente (agenda de horas médicas, lectura de documentos)

---

## 👥 Equipo

| Nombre | Rol |
|---|---|
| _[Nombre]_ | Interfaz |
| _[Nombre]_ | IA y backend |
| _[Nombre]_ | Integraciones |
| _[Nombre]_ | Pitch y validación |

---

## 📚 Referencias

- [La Tercera – Solo el 23% de las personas mayores hace trámites digitales sin ayuda](https://www.latercera.com/tendencias/noticia/como-incluir-a-las-personas-mayores-en-un-estado-cada-vez-mas-digitalizado-el-desafio-que-enfrenta-chile/)
- [Meganoticias – Estafas a adultos mayores 2025](https://www.meganoticias.cl/nacional/517212-estafas-adultos-mayores-aumento-denuncias-chile-fraudes-sms-llamadas-17-03-2026.html)
- [JAMA – Velocidad de marcha y supervivencia en personas mayores (Studenski, 2011)](https://jamanetwork.com/journals/jama/fullarticle/644554)
- [Scientific Reports – Dinámica de tecleo como biomarcador digital (meta-análisis)](https://www.nature.com/articles/s41598-022-11865-7)
- [Comisión Lancet 2024 – Pérdida auditiva y demencia](https://hearingpractitionernews.com.au/hearing-loss-equal-biggest-modifiable-risk-factor-for-dementia-lancet-commission/)

---

Hecho con ❤️ en Hack4Seniors UDD 2026.
