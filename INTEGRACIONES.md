# P3 – Integraciones: avisos al autor

Cuando alguien aprende con una guía, al autor le llega un mensaje de agradecimiento.
Para no saturarlo, **solo se avisa en hitos**: la primera persona, 10, 50, 100 y luego cada 100 (200, 300…).

## Archivos

| Archivo | Qué es |
|---|---|
| `avisos.js` | Módulo sin dependencias (usa `fetch` de Node 20+). Expone `avisarGracias`. |
| `.env.example` | Plantilla de variables; copiar como `.env`. |

## Cómo conectarlo (P2, en `server.js`)

En `/api/aprendi`, **después** de sumar +1 a `guia.aprendieron`:

```js
const { avisarGracias } = require('./avisos');

avisarGracias({
  autor: guia.autor,
  titulo: guia.titulo,
  aprendiz,                        // nombre de quien aprendió
  aprendieron: guia.aprendieron    // total ya incrementado
});
```

- Sin `await`: la respuesta al usuario no espera el envío.
- Nunca lanza errores; si todo falla, el mensaje queda en consola.
- Si no se pasa `aprendieron`, envía siempre (sin filtro de hitos).

Devuelve `{ ok, enviado, canal?, texto?, id?, motivo?, errores[] }`.

## Canales

1. **Zavu** (`POST https://api.zavu.dev/v1/messages`, `Authorization: Bearer ZAVUDEV_API_KEY`) a `NUMERO_DEMO`.
2. **Telegram** de respaldo (`TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`).
3. Consola, si ninguno funciona.

`AVISO=telegram` invierte el orden.

## Mensajes

- Primera persona: *"¡Hola, Rosa! 💌 Tomás es la primera persona que aprendió «Sopaipillas pasadas» gracias a usted. ¡Gracias por enseñar lo que sabe! — SABERES"*
- Hitos: *"¡Hola, Rosa! 🎉 Ya son 50 personas que aprendieron «Sopaipillas pasadas» gracias a usted. La última fue Tomás. …"*

Los hitos se cambian en `HITOS` y `CADA_DESPUES` al inicio de `avisos.js`.

## Probar

```bash
node avisos.js       # simula la 1.ª persona
node avisos.js 50    # hito 50
node avisos.js 2     # no es hito: no envía
```

## Ojo para la demo

- **Llave `zv_test_`** (sandbox): solo WhatsApp y solo a celulares de miembros del equipo en Zavu. `NUMERO_DEMO` debe estar inscrito.
- **Llave `zv_live_`**: WhatsApp solo permite texto libre si ese número escribió en las últimas 24 h. Antes de la demo, mandar un "hola" desde `NUMERO_DEMO` al número de Zavu.
- La guía nueva de Rosa parte en 0, así que el primer aprendiz dispara el aviso de "primera persona".
