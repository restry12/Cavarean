/* =========================================================
   SABERES · Modo simulado
   Responde todos los endpoints sin backend. Se usa con ?mock=1
   o automáticamente si el backend falla o tarda más de 10 s.
   Autores y datos ficticios.
   ========================================================= */
(function () {
  'use strict';

  // ---------- Guías de ejemplo ----------
  const GUIAS = [
    {
      id: 'g-videollamada',
      titulo: 'Cómo hacer una videollamada por WhatsApp',
      categoria: 'digital',
      autor: 'Equipo SABERES', autorId: 'u-equipo', edad: null, comuna: 'Santiago', foto: null,
      materiales: ['Su celular con WhatsApp', 'Conexión a internet o wifi'],
      pasos: [
        'Abra WhatsApp, el ícono verde con un teléfono blanco.',
        'Toque el chat de la persona a la que quiere llamar.',
        'Arriba a la derecha, toque el dibujo de la cámara de video.',
        'Espere a que la otra persona conteste. Verá su cara en grande.',
        'Sostenga el celular frente a su cara, a la altura de los ojos.',
        'Para cortar, toque el botón rojo de abajo.'
      ],
      ayudas: [
        'Busque en su celular un dibujo verde y redondo, con un teléfono blanco adentro. Tóquelo una vez con la yema del dedo.',
        'En la lista de conversaciones, busque el nombre de la persona y toque encima de su nombre. Se abre la conversación.',
        'Arriba de la pantalla, al lado del nombre, hay dos dibujos: un teléfono y una camarita. Toque la camarita: esa es la llamada con imagen.',
        'El celular va a sonar como llamando. Puede que se demore un poquito; no toque nada mientras tanto.',
        'Póngalo derechito, como si fuera un espejo, para que la otra persona le vea la cara y no el techo.',
        'Abajo aparece un botón redondo y rojo con un teléfono. Tóquelo una vez y la llamada termina.'
      ],
      consejos: ['Si se escucha mal, acérquese al router del wifi o a una ventana.'],
      advertencias: [],
      claves: ['videollamada', 'video', 'llamada', 'llamar', 'whatsapp', 'camara', 'nietos', 'celular'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 58,
      resumen_voz: 'Una guía para hablar con video por WhatsApp, en seis pasos.'
    },
    {
      id: 'g-estafa',
      titulo: 'Cómo saber si un mensaje es una estafa',
      categoria: 'digital',
      autor: 'Equipo SABERES', autorId: 'u-equipo', edad: null, comuna: 'Santiago', foto: null,
      materiales: ['Su celular', 'El mensaje que le llegó'],
      pasos: [
        'No toque ningún enlace del mensaje todavía.',
        'Fíjese si le apuran: «urgente», «hoy», «su cuenta será bloqueada».',
        'Fíjese si le piden claves, códigos o datos de su tarjeta. El banco nunca los pide por mensaje.',
        'Mire quién lo envía: un número desconocido o un correo raro es mala señal.',
        'Si dice ser un familiar con número nuevo, llámelo al número de siempre.',
        'Ante la duda, borre el mensaje y llame usted a su banco, al número que sale en su tarjeta.'
      ],
      ayudas: [
        'Un enlace es un texto azul o subrayado; a veces empieza con «http». Si lo toca, lo pueden llevar a una página falsa. Por ahora, solo mire.',
        'Los estafadores quieren que usted se asuste y actúe rápido, sin pensar. Si el mensaje le apura, es una señal de alerta.',
        'Ningún banco ni empresa seria le pide su clave por mensaje o por teléfono. Si se la piden, es estafa.',
        'Si el mensaje viene de un número que usted no tiene guardado, o de un correo con letras raras, desconfíe.',
        'Es un engaño común: «Hola mamá, cambié de número». Llame a su familiar al número que usted ya conoce y pregúntele.',
        'Puede borrar el mensaje sin miedo. Para hablar con su banco, use el número que está detrás de su tarjeta, nunca el del mensaje.'
      ],
      consejos: ['Si alguien le apura, desconfíe. Lo que es verdad puede esperar una llamada.'],
      advertencias: ['Nunca entregue la clave o el código que le llega por SMS, ni a alguien que diga ser del banco.'],
      claves: ['estafa', 'estafas', 'mensaje', 'fraude', 'engano', 'banco', 'cuento', 'phishing', 'sms', 'seguridad'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 41,
      resumen_voz: 'Seis señales para reconocer un mensaje falso.'
    },
    {
      id: 'g-pan-amasado',
      titulo: 'Pan amasado',
      categoria: 'cocina',
      autor: 'Señora Rosa', autorId: 'u-rosa', edad: 72, comuna: 'Maipú', foto: null,
      materiales: ['1 kilo de harina', '1 cucharada de sal', '10 gramos de levadura seca', '125 gramos de manteca', '2 tazas de agua tibia', 'El horno prendido a 200 grados'],
      pasos: [
        'Disuelva la levadura en media taza de agua tibia con una pizca de azúcar y déjela reposar 10 minutos.',
        'En un bol grande, mezcle la harina con la sal y haga un hoyo al medio.',
        'Derrita la manteca, que quede tibia, y échela al hoyo junto con la levadura.',
        'Agregue el resto del agua de a poco, mientras mezcla con la mano.',
        'Amase unos 10 minutos, hasta que la masa esté suave y no se pegue.',
        'Haga bolitas, aplástelas un poco, píncheles con un tenedor y déjelas reposar tapadas 20 minutos.',
        'Hornee de 20 a 25 minutos, hasta que estén doraditas.'
      ],
      ayudas: [
        'La levadura es lo que hace que el pan se infle. Póngala en una taza con agua tibia, como para bañar a una guagua, y una pizca de azúcar. Si a los 10 minutos hace espuma, está viva y lista.',
        'Ponga la harina en un bol grande, eche la sal y con la mano haga un hueco al centro, como un volcán.',
        'Caliente la manteca en una olla chica hasta que se derrita, y espere que se entibie para no matar la levadura. Échela al hueco junto con la levadura.',
        'Eche el agua de a chorritos y vaya juntando la harina desde los bordes hacia el centro, hasta que se forme una masa.',
        'Amasar es empujar la masa con la palma de la mano, doblarla y volver a empujar. Cuando ya no se le pegue en los dedos, está lista.',
        'Saque pedazos del porte de un huevo, hágalos bolita, aplástelos con la mano y píncheles tres veces con un tenedor. Tápelos con un paño y déjelos descansar.',
        'Ponga los panes en una lata con un poco de harina y métalos al horno caliente. Están listos cuando se ven dorados por encima.'
      ],
      consejos: [
        'El agua tiene que estar tibia, como para bañar a una guagua. Si está caliente, mata la levadura.',
        'Tape la masa con un paño limpio y déjela cerca de la cocina, que ahí sube mejor.'
      ],
      advertencias: ['Use un paño o un guante para sacar la lata del horno.'],
      claves: ['pan', 'amasado', 'hallulla', 'masa', 'hornear', 'harina', 'once'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 34,
      resumen_voz: 'La receta de pan amasado de la Señora Rosa, en siete pasos.'
    },
    {
      id: 'g-tomates',
      titulo: 'Plantar tomates en macetero',
      categoria: 'huerto',
      autor: 'Don Luis', autorId: 'u-luis', edad: 68, comuna: 'La Florida', foto: null,
      materiales: ['Un macetero de al menos 30 centímetros de hondo, con hoyos abajo', 'Tierra de hoja', 'Un almácigo de tomate', 'Un palo o caña de un metro', 'Piedritas', 'Agua'],
      pasos: [
        'Ponga piedritas en el fondo del macetero para que el agua escurra.',
        'Llene el macetero con tierra hasta cuatro dedos antes del borde.',
        'Haga un hoyo al medio, del porte del vasito del almácigo.',
        'Ponga la plantita y entiérrela un poco más honda de lo que venía.',
        'Clave el palo al lado y amarre el tallo suavecito con una lana.',
        'Riegue hasta que salga agua por abajo y deje el macetero al sol.'
      ],
      ayudas: [
        'En el fondo del macetero ponga un puñado de piedritas o pedazos de ladrillo. Así el agua no se queda estancada y la raíz no se pudre.',
        'Eche tierra hasta que quede un espacio como de cuatro dedos juntos entre la tierra y el borde. Ese espacio sirve para regar.',
        'Con la mano o una cuchara, haga un hoyo en el centro, más o menos del tamaño del vasito donde viene la plantita.',
        'Saque la plantita del vasito con cuidado, sin tirarla del tallo. Póngala en el hoyo y tape con tierra hasta un poco más arriba de donde estaba.',
        'El palo sirve para que la planta se apoye cuando crezca. Amárrela con una lana floja, como una pulsera suelta, para no apretar el tallo.',
        'Riegue despacito hasta que vea salir agua por los hoyos de abajo. Deje el macetero donde le dé sol por lo menos 6 horas al día.'
      ],
      consejos: [
        'Riegue en la mañana temprano o al atardecer, nunca a pleno sol.',
        'Sáquele los brotecitos que salen entre el tallo y las hojas; así da más tomates.'
      ],
      advertencias: [],
      claves: ['tomate', 'tomates', 'plantar', 'macetero', 'huerto', 'sembrar', 'planta', 'jardin', 'cultivar'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 21,
      resumen_voz: 'Cómo plantar tomates en un macetero, en seis pasos.'
    },
    {
      id: 'g-boton',
      titulo: 'Coser un botón que se salió',
      categoria: 'hogar',
      autor: 'Señora Carmen', autorId: 'u-carmen', edad: 75, comuna: 'Ñuñoa', foto: null,
      materiales: ['El botón', 'Una aguja', 'Hilo del mismo color, unos 50 centímetros', 'Tijeras', 'Un alfiler o un fósforo'],
      pasos: [
        'Enhebre la aguja, junte las dos puntas del hilo y hágales un nudo.',
        'Busque las marcas del botón antiguo en la tela, para ponerlo en el mismo lugar.',
        'Entre la aguja por el revés de la tela y sáquela por un hoyito del botón.',
        'Ponga un alfiler encima del botón y cosa pasando por arriba del alfiler, unas 6 veces.',
        'Saque el alfiler, saque la aguja entre el botón y la tela, y enrolle el hilo 3 veces debajo del botón.',
        'Pase la aguja al revés, haga dos puntaditas para rematar y corte el hilo.'
      ],
      ayudas: [
        'Pase la punta del hilo por el hoyito de la aguja. Si le cuesta, moje la punta del hilo. Luego junte las dos puntas y haga un nudo.',
        'Mire la tela donde estaba el botón: van a quedar hoyitos o pedacitos de hilo. Ahí va el botón, para que calce con el ojal.',
        'El revés es el lado de adentro de la ropa. Entre la aguja desde adentro, para que el nudo quede escondido, y sáquela por uno de los hoyitos del botón.',
        'El alfiler encima del botón sirve para dejarlo un poquito suelto. Pase la aguja por un hoyito, por encima del alfiler, y baje por el otro hoyito. Repítalo unas seis veces.',
        'Saque el alfiler. Ahora el botón queda un poco separado de la tela: pase la aguja por ese espacio y enrolle el hilo tres vueltas alrededor, como un cuellito.',
        'Pase la aguja al lado de adentro, haga dos puntaditas chiquitas en el mismo lugar para asegurar, y corte el hilo que sobra.'
      ],
      consejos: ['El alfiler deja el botón un poquito suelto; así abrocha fácil y no se vuelve a salir.'],
      advertencias: [],
      claves: ['boton', 'botones', 'coser', 'costura', 'aguja', 'hilo', 'ropa', 'camisa'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 12,
      resumen_voz: 'Cómo coser un botón para que no se vuelva a salir, en seis pasos.'
    }
  ];

  // Usuaria de demo para "Ya tengo cuenta": Rosa / clavel
  const USUARIOS_BASE = [{
    id: 'u-rosa', nombre: 'Rosa', comuna: 'Maipú', edad: 72,
    intereses: ['hacer videollamadas'], saberes: ['pan amasado'],
    palabra_clave: 'clavel', telefono: '', ensenados: 1,
    bienvenida: 'Hola de nuevo, Rosa.'
  }];

  // ---------- Memoria (usuarios en localStorage, el resto en memoria) ----------
  const LLAVE = 'saberes-mock-usuarios';
  const usuarios = USUARIOS_BASE.concat(leerUsuarios());

  function leerUsuarios() {
    try { return JSON.parse(localStorage.getItem(LLAVE)) || []; } catch (e) { return []; }
  }
  function guardarUsuarios() {
    try { localStorage.setItem(LLAVE, JSON.stringify(usuarios.filter(u => u.id !== 'u-rosa'))); } catch (e) { /* sin almacenamiento */ }
  }

  // ---------- Utilidades ----------
  const copia = (x) => JSON.parse(JSON.stringify(x));
  const demora = () => new Promise(r => setTimeout(r, 500 + Math.random() * 500));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const mayus = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const frase = (s) => { s = mayus(s.trim()); return /[.!?]$/.test(s) ? s : s + '.'; };
  const listaConY = (a) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];

  // ---------- Endpoints simulados ----------
  function registro({ respuestas = {} }) {
    const r = respuestas;
    const u = {
      id: 'u-' + Date.now().toString(36),
      nombre: r.nombre || 'Amigo',
      comuna: r.comuna || '',
      intereses: r.aprender ? [r.aprender] : [],
      saberes: r.ensenar ? [r.ensenar] : [],
      palabra_clave: String(r.clave || '').toLowerCase(),
      telefono: r.telefono || '',
      ensenados: 0
    };
    u.bienvenida = [
      `¡Le damos la bienvenida a SABERES, ${u.nombre}!`,
      'Esto es lo que anoté.',
      u.comuna && `Usted es de ${u.comuna}.`,
      r.aprender && `Quiere aprender ${r.aprender}.`,
      r.ensenar && `Y puede enseñar ${r.ensenar}; eso le va a servir a mucha gente.`,
      u.palabra_clave && `Su palabra clave es «${u.palabra_clave}». Guárdela bien.`,
      u.telefono && 'También anoté el celular de su familiar.',
      'Ya puede empezar.'
    ].filter(Boolean).join(' ');
    usuarios.push(u);
    guardarUsuarios();
    return u;
  }

  function entrar({ nombre, clave }) {
    const n = norm(nombre), c = norm(clave);
    const u = usuarios.find(x => {
      const nx = norm(x.nombre), k = norm(x.palabra_clave);
      const mismoNombre = nx === n || nx.split(' ')[0] === n.split(' ')[0];
      return mismoNombre && k && (c === k || c.split(' ').includes(k));
    });
    return u || { error: 'No encontré una cuenta con ese nombre y esa palabra clave.' };
  }

  function buscar({ pregunta = '' }) {
    const vacias = new Set(['quiero', 'aprender', 'como', 'hacer', 'para', 'una', 'uno', 'unos', 'unas', 'las', 'los', 'del',
      'que', 'por', 'favor', 'gustaria', 'saber', 'ensename', 'ensenar', 'necesito', 'algo', 'sobre', 'mas', 'menos']);
    const palabras = norm(pregunta).split(' ').filter(w => w.length > 2 && !vacias.has(w));
    let mejor = null, puntaje = 0;
    for (const g of GUIAS) {
      if (g.estado === 'en revisión') continue;
      const texto = norm([g.titulo, g.categoria, ...(g.claves || [])].join(' '));
      const p = palabras.reduce((s, w) => s + (texto.includes(w) || texto.includes(w.slice(0, -1)) ? 1 : 0), 0);
      if (p > puntaje) { mejor = g; puntaje = p; }
    }
    return mejor || { error: 'Todavía no tengo una guía sobre eso.' };
  }

  function ayuda({ guia = {}, paso = '', duda = '' }) {
    const original = GUIAS.find(x => x.id === guia.id) || guia;
    const i = (original.pasos || []).indexOf(paso);
    const extra = i >= 0 && original.ayudas && original.ayudas[i];
    const esNoEntendi = /no (entendi|entiendo|comprendo|cache)/.test(norm(duda));
    let texto;
    if (extra) texto = `${esNoEntendi ? 'Se lo explico de otra forma.' : 'Buena pregunta.'} ${extra}`;
    else if (String(paso).startsWith('Materiales')) texto = 'No se preocupe si le falta algo. Puede reemplazarlo por algo parecido que tenga en casa, o conseguirlo después.';
    else texto = `No se preocupe, vamos de a poco. Lo importante de este paso es esto: ${paso} Hágalo con calma; no hay apuro.`;
    return { texto };
  }

  function aprendi({ guiaId, aprendiz }) {
    const g = GUIAS.find(x => x.id === guiaId);
    if (!g) return { ok: false, error: 'No encontré esa guía.' };
    g.aprendieron = (Number(g.aprendieron) || 0) + 1;
    console.info(`[MOCK] WhatsApp a ${g.autor}: "${aprendiz || 'Alguien'} aprendió «${g.titulo}» gracias a usted. ¡Gracias por enseñar!"`);
    return { ok: true, aprendieron: g.aprendieron };
  }

  function ensenar({ usuarioId, relato = '' }) {
    const u = usuarios.find(x => x.id === usuarioId) || { id: usuarioId, nombre: 'Usted', comuna: '', saberes: [] };
    const g = armarGuia(relato, u);
    GUIAS.unshift(g);
    return g;
  }

  // ---------- "IA" falsa: ordena el relato en una guía ----------
  const CATEGORIAS = {
    cocina: ['harina', 'horno', 'cocin', 'masa', 'olla', 'sarten', 'receta', 'pan', 'sopaipilla', 'empanada', 'queque', 'azucar', 'hervir', 'frei', 'hornear', 'cebolla'],
    huerto: ['plant', 'tierra', 'semilla', 'regar', 'riego', 'maceter', 'huerto', 'abono', 'almacigo', 'podar'],
    hogar: ['coser', 'boton', 'hilo', 'aguja', 'limpiar', 'lavar', 'mancha', 'planchar', 'ropa', 'tejer', 'palillo'],
    oficios: ['martillo', 'clavo', 'tornillo', 'arreglar', 'reparar', 'madera', 'pintar', 'llave', 'caneria', 'soldar', 'taladro', 'enchufe'],
    digital: ['celular', 'whatsapp', 'computador', 'internet', 'aplicacion', 'correo', 'foto', 'mensaje'],
    historias: ['cuando yo era', 'en mis tiempos', 'historia', 'recuerdo', 'mi abuela', 'antiguamente', 'epoca']
  };

  function categoriaDe(n) {
    let mejor = 'hogar', max = 0;
    for (const [cat, palabras] of Object.entries(CATEGORIAS)) {
      const p = palabras.filter(w => n.includes(w)).length;
      if (p > max) { mejor = cat; max = p; }
    }
    return mejor;
  }

  function tituloDe(texto, u) {
    const m = texto.match(/\b(hacer|preparar|cocinar|plantar|sembrar|arreglar|coser|tejer|limpiar|pintar|cambiar|reparar|usar|cultivar|hornear|cuidar)\s+([^.,;:]+)/i);
    if (m) {
      const resto = m[2].split(/\s+(?:y|que|para|con|porque|cuando|pero|se|es|a mi)\s+/i)[0].split(' ').slice(0, 5).join(' ');
      return 'Cómo ' + m[1].toLowerCase() + ' ' + resto;
    }
    if (u.saberes && u.saberes[0]) return mayus(u.saberes[0]);
    return `Lo que sabe ${u.nombre}`;
  }

  function extraerLista(f) {
    const despues = f.split(/necesit\w*|ingredientes?|hay que tener|materiales|se usa\w*/i).slice(1).join(' ');
    return despues.replace(/^[\s:,]*(que\s+)?/i, '')
      .split(/,|\s+y\s+|\s+e\s+/)
      .map(s => s.replace(/[.;]+$/, '').trim())
      .filter(s => s.length > 1)
      .map(mayus);
  }

  function armarGuia(relato, u) {
    const texto = String(relato).replace(/\s+/g, ' ').trim();
    const n = norm(texto);
    const frases = texto
      .split(/(?<=[.!?;])\s+|\s*\b(?:después|despues|luego|entonces|y ahí|y ahi|al final|por último|por ultimo|lo primero|primero)(?=[\s,])[\s,]*/i)
      .map(f => (f || '').replace(/^(y|e|ya|bueno|eh)\s+/i, '').replace(/\s+(y|e)$/i, '').replace(/^[,.\s]+|[,\s]+$/g, '').trim())
      .filter(f => f.split(' ').length >= 3);

    const materiales = [], pasos = [], consejos = [], advertencias = [];
    for (const f of frases) {
      const nf = norm(f);
      if (/(ensenar|les voy a|te voy a|voy a explicar|voy a contar)/.test(nf) && !pasos.length) continue;
      if (/(necesit|ingrediente|hay que tener|materiales)/.test(nf) && !pasos.length) { materiales.push(...extraerLista(f)); continue; }
      if (/(cuidado|peligro|nunca|no se debe|ojo con)/.test(nf)) { advertencias.push(frase(f)); continue; }
      if (/(truco|consejo|secreto|recomiendo|siempre|lo mejor|un dato)/.test(nf)) { consejos.push(frase(f)); continue; }
      if (pasos.length < 8) pasos.push(frase(f));
    }
    if (!pasos.length) pasos.push(frase(texto.slice(0, 220) || 'Paso único'));
    if (!consejos.length) consejos.push('Hágalo con calma: la práctica hace al maestro.');

    const alto = /\b(gas|electric\w*|enchufe|cable|corriente|remedio|medicament\w*|pastilla|dosis|escalera|cloro|veneno|insulina)\b/.test(n);
    if (alto) advertencias.unshift('Es un tema delicado: hágalo con cuidado y, ante cualquier duda, pida ayuda a alguien con experiencia.');

    const titulo = mayus(tituloDe(texto, u));
    const resumen = [
      `Muy bien, ${u.nombre}. Ordené su guía.`,
      `Se llama «${titulo}» y tiene ${pasos.length} ${pasos.length === 1 ? 'paso' : 'pasos'}.`,
      materiales.length ? `Se necesita: ${listaConY(materiales)}.` : '',
      'Quedó muy clara.'
    ].filter(Boolean).join(' ');

    return {
      id: 'g-' + Date.now().toString(36),
      titulo,
      categoria: categoriaDe(n),
      materiales, pasos, consejos, advertencias,
      riesgo: alto ? 'alto' : 'bajo',
      resumen_voz: resumen,
      autor: u.nombre, autorId: u.id, edad: u.edad || null, comuna: u.comuna || '', foto: null,
      estado: alto ? 'en revisión' : 'publicada',
      aprendieron: 0
    };
  }

  // ---------- Enrutador ----------
  const RUTAS = {
    'POST /api/registro': registro,
    'POST /api/entrar': entrar,
    'POST /api/ensenar': ensenar,
    'POST /api/buscar': buscar,
    'POST /api/ayuda': ayuda,
    'POST /api/aprendi': aprendi,
    'GET /api/guias': () => GUIAS
  };

  async function api(metodo, url, body) {
    await demora();
    const ruta = RUTAS[`${metodo} ${String(url).split('?')[0]}`];
    if (!ruta) return { error: 'Esta función no está disponible en el modo simulado.' };
    return copia(ruta(body || {}));
  }

  // Quita una guía recién creada (cuando la persona elige "Corregir")
  function descartar(id) {
    const i = GUIAS.findIndex(g => g.id === id);
    if (i >= 0) GUIAS.splice(i, 1);
  }

  window.MOCK = { api, descartar };
})();
