# SABERES 🎓🎙️

**Aprenda, enseñe y deje su huella.**
Una enciclopedia por voz donde las personas de 50+ **aprenden paso a paso con una IA paciente**, **enseñan lo que saben solo hablando** y los jóvenes **aprenden de ellas**.

Proyecto desarrollado en **Hack4Seniors UDD 2026** (1 de octubre, La Nave – Plaza_i, Universidad del Desarrollo).
Eje: **Vida diaria de la persona mayor**: autonomía, propósito y relación con los demás.

---

## 🧭 El problema

Las personas de 50+ en Chile **quieren aprender, pero nadie tiene tiempo ni paciencia para enseñarles**. Al mismo tiempo, **lo que ellas saben no tiene dónde quedar**, y muchas se sienten solas y sin un rol.

| Qué pasa | El dato |
|---|---|
| El país envejece rápido | El **14%** de la población tiene 65+ y ya hay **79 personas de 65+ por cada 100 menores de 15** (Censo 2024) |
| Quieren aprender | El **82%** de las personas de 60+ quiere desarrollar más habilidades digitales y el **66%** se siente obligado a aprender tecnología para no quedar excluido |
| Pero no logran hacerlo solas | El **88%** tiene internet en casa, pero solo el **42%** lo usa y apenas el **17%** hace trámites digitales de forma independiente |
| Casi nadie les enseña | Solo el **5%** ha recibido capacitación digital formal |
| Se sienten solas | El **49,2%** siente soledad no deseada y el **32%** no tiene ni un amigo |
| Quieren seguir siendo útiles | El **49%** de las personas mayores que trabaja lo hace por bienestar o para mantenerse activa |

> *"Conectar no es incluir. La inclusión comienza cuando alguien puede usar la tecnología para tomar decisiones de manera autónoma."* — Paulina Núñez, presidenta del Senado

---

## 💡 La solución

Todo se usa **hablando**, incluso el registro.

| Parte | Qué hace |
|---|---|
| **🗣️ Registro por voz** | La app pregunta nombre, comuna, qué quiere aprender, qué sabe enseñar y una palabra clave. La IA arma el perfil sin que la persona teclee nada. |
| **🎓 Aprendo** | La persona pide una guía hablando y la IA la da **paso a paso**: espera a que diga *"listo"* y entiende *"repita"*, *"más lento"* y *"no entendí"*. |
| **🎙️ Enseño** | La persona explica algo como si se lo contara a un nieto, y la IA lo convierte en una **guía ordenada** (materiales, pasos, consejos y advertencias) que se publica con su nombre. |
| **🤝 Conecto** | Los jóvenes buscan guías y aprenden de quien sabe. Al terminar dan las gracias y **al autor le llega un WhatsApp**: *"Tomás aprendió su pan amasado gracias a usted"*. |

**Por qué es preventiva:** da **propósito**, mantiene la **mente activa**, crea **vínculos entre generaciones** y aumenta la **autonomía**.

---

## 🎬 Demo

1. **Registro por voz:** la "señora Rosa" responde 4 preguntas hablando y la app le lee su perfil.
2. **Enseñar:** Rosa explica en 40 segundos cómo hace sopaipillas y aparece la guía ordenada con su nombre.
3. **Aprender:** un joven sigue esa guía paso a paso; dice *"no entendí"* y la IA se lo explica de otra forma.
4. **El gracias:** el joven toca *"¡Aprendí!"* y el celular de Rosa recibe el mensaje.

> 🎥 Video de la demo: _[agregar link]_

---

## 🏗️ Arquitectura

```
[Vista personas mayores]  ─┐
  voz + botones gigantes   │
                           ├──HTTP──►  [Backend Node/Express]  ──►  Mistral (principal)
[Vista jóvenes]           ─┘             /api/registro               guía, editor y búsqueda
  buscar, aprender, gracias              /api/entrar           ──►  OpenRouter (respaldo)
                                         /api/ensenar                si Mistral falla
                                         /api/buscar           ──►  Zavu / Telegram
                                         /api/ayuda                  el "gracias" al autor
                                         /api/aprendi
                                         /api/guias
                                              │
                                        data/usuarios.json · data/guias.json
```

| Componente | Tecnología |
|---|---|
| Frontend | HTML, CSS y JavaScript; Web Speech API (voz a texto y texto a voz) |
| Backend | Node.js 20 + Express |
| IA | **Mistral** (`mistral-small-latest`), con respaldo automático en **OpenRouter** |
| Mensajería | **Zavu** (WhatsApp o SMS) y Telegram como respaldo |
| Datos | Archivos JSON (prototipo) |

---

## 🚀 Cómo correrlo

### Requisitos
- Node.js 20 o superior
- Google Chrome (para voz y reconocimiento de voz)
- Llaves de API de Mistral, OpenRouter y Zavu (Telegram opcional)

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
NUMERO_DEMO=+569XXXXXXXX
TELEGRAM_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
AVISO=zavu                   # o telegram
```

### Ejecutar

```bash
node server.js
```

Abre **http://localhost:3000** en Chrome y toca "Empezar" (el navegador necesita un clic para permitir el audio).
Para probar sin backend ni llaves, usa el **modo simulado**: **http://localhost:3000/?mock=1**

---

## 📁 Estructura

```
Caravean/
├─ server.js            # backend: registro, guías, IA con respaldo, avisos
├─ .env                 # llaves (no se sube)
├─ data/
│  ├─ usuarios.json     # perfiles creados por voz
│  └─ guias.json        # guías publicadas (5 precargadas)
└─ public/
   ├─ index.html        # vistas para personas mayores y jóvenes
   ├─ estilos.css
   ├─ app.js            # pantallas, registro por voz, guía paso a paso, enseñar
   ├─ voz.js            # hablar, escuchar, confirmar, grabar
   ├─ mock.js           # modo simulado para desarrollo y demo
   └─ demo.json         # respuestas de respaldo
```

---

## ♿ Accesibilidad

- Letra de 28 px o más y botones de 84 px en la vista para personas mayores.
- Voz y texto siempre juntos: todo lo que la app dice aparece como subtítulo.
- Un paso a la vez, sin límites de tiempo que apuren.
- Si el micrófono falla, siempre aparece un campo para escribir.

## 🔒 Seguridad

- La IA **no inventa pasos**: ordena lo que la persona dijo.
- Las guías sobre temas delicados (electricidad, gas, salud, remedios) llevan advertencias y quedan **en revisión** antes de publicarse.
- Registro con nombre y palabra clave en el prototipo; la versión real sumaría verificación por celular.
- Respaldo automático: si Mistral falla responde OpenRouter, y si no hay red la demo usa `demo.json`.

> ⚠️ Prototipo de hackatón con datos y autores ficticios.

---

## 🗺️ Próximos pasos

- [ ] Piloto con un club de adulto mayor y una universidad (vinculación con el medio)
- [ ] Clases por videollamada entre autores y jóvenes
- [ ] Moderación comunitaria de guías
- [ ] App móvil y versión para parlantes inteligentes

---

## 👥 Equipo

| Nombre | Rol |
|---|---|
| _[Nombre]_ | P1 – Interfaz |
| _[Nombre]_ | P2 – IA y backend |
| _[Nombre]_ | P3 – Integraciones |
| _[Nombre]_ | P4 – Pitch y contenido |

---

## 📚 Fuentes

- [Censo 2024 – Forbes Chile](https://forbes.cl/actualidad/2025-03-27/sigue-en-aumento-el-envejecimiento-poblacional-en-chile-mayores-de-65-anos-alcanzaron-el-14-en-2024)
- [Radiografía Digital Senior Tech, ClaroVTR y Criteria (2024)](https://www.gerontologia.org/chile-personas-mayores-66-se-ha-sentido-presionada-por-adoptar-nuevas-tecnologias/)
- [Infogate – Brecha digital en adultos mayores persiste pese a mayor acceso (2026)](https://infogate.cl/2026/04/brecha-digital-en-adultos-mayores-persiste-pese-a-mayor-acceso/)
- [El Mostrador – Brecha digital en Chile (2025)](https://www.elmostrador.cl/agenda-pais/agenda-digital/2025/09/24/brecha-digital-en-chile-el-desafio-de-los-adultos-mayores-en-la-era-tecnologica/)
- [UC – Soledad no deseada (2025)](https://www.uc.cl/noticias/soledad-no-deseada-casi-la-mitad-de-la-poblacion-mayor-declara-sentirse-en-soledad/)
- [UC – El 32% de los adultos mayores no tiene amigos](https://www.uc.cl/academia-en-los-medios/el-32-de-los-adultos-mayores-en-chile-no-tienen-amigos/)
- [ASIMET / Cipem – Motivos para trabajar de las personas mayores](https://www.asimet.cl/estudio-27-de-los-adultos-mayores-trabaja-porque-sus-pensiones-son-bajas/)
- [La Tercera – Inclusión digital de las personas mayores](https://www.latercera.com/tendencias/noticia/como-incluir-a-las-personas-mayores-en-un-estado-cada-vez-mas-digitalizado-el-desafio-que-enfrenta-chile/)

---

Hecho con ❤️ en Hack4Seniors UDD 2026.
