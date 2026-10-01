/* =========================================================
   SABERES · Modo simulado
   Responde todos los endpoints sin backend. Se usa con ?mock=1
   o automáticamente si el backend falla o tarda más de 10 s.
   Personas y datos ficticios (los del prototipo de diseño).
   ========================================================= */
(function () {
  'use strict';

  // ---------- Guías de ejemplo ----------
  // Campos del contrato + extras opcionales que la interfaz aprovecha:
  // who (retrato), titulos/dichos/ayudas (por paso), pantallas (celular), logro, bio, nivel, duracion
  const GUIAS = [
    {
      id: 'g-videollamada',
      titulo: 'Videollamada con su familia',
      categoria: 'digital', icono: 'video',
      autor: 'Equipo SABERES', autorId: 'u-equipo', who: null, edad: null, comuna: 'Santiago',
      materiales: ['Su celular con WhatsApp', 'Conexión a internet o wifi'],
      titulos: ['Abra WhatsApp', 'Busque a quien quiere llamar', 'Toque la camarita', 'Espere que contesten', 'Sostenga el celular frente a usted', 'Para cortar, toque el botón rojo'],
      pasos: [
        'Busque en su celular el ícono verde con un globito blanco. Tóquelo una sola vez, sin apretar fuerte.',
        'Verá una lista de nombres. Toque el nombre de la persona. Por ejemplo, «Hija Carolina».',
        'Arriba, a la derecha, hay un dibujo pequeño de una cámara. Tóquelo para llamar con video.',
        'Va a sonar unos segundos. Cuando Carolina conteste, la verá en grande en su pantalla.',
        'Póngalo a la altura de sus ojos, como un espejo. Así Carolina le verá la cara completa.',
        'Cuando terminen de conversar, toque el círculo rojo de abajo. La llamada se corta al tiro.'
      ],
      dichos: [
        'Vamos con calma. Busque el ícono verde de WhatsApp y tóquelo una vez.',
        'Ahora verá una lista con los nombres de su familia. Toque el de Carolina.',
        'Mire arriba, a la derecha. ¿Ve la camarita? Tóquela y la llamada empieza.',
        'Ahora espere tranquila. Cuando contesten, verá a Carolina en grande.',
        'Levante el celular a la altura de sus ojos, como si se mirara en un espejo.',
        'Cuando quiera despedirse, toque el botón rojo de abajo.'
      ],
      ayudas: [
        'Piense en la pantalla como un mueble con cajones. WhatsApp es el cajón verde. Tóquelo con la yema del dedo, como si tocara un timbre.',
        'Esa lista es como su libreta de teléfonos: cada fila es una persona. Busque a Carolina y toque su nombre una vez.',
        'Arriba hay dos dibujos: un teléfono y una cámara. La cámara sirve para verse las caras. Toque la que tiene forma de cajita.',
        'Es igual que cuando llama por teléfono y espera que contesten. La diferencia es que ahora la va a ver.',
        'Si Carolina solo le ve la frente, baje un poquito el celular. En el cuadrito chico se ve usted.',
        'El botón rojo es para colgar, como dejar el teléfono en su lugar. Tóquelo una vez y listo.'
      ],
      pantallas: ['apps', 'chats', 'chat', 'call', 'eyes', 'end'],
      logro: 'Ya sabe hacer una videollamada con su familia. Carolina la va a ver en grande.',
      consejos: ['Si se escucha mal, acérquese al router del wifi o a una ventana.'],
      advertencias: [],
      claves: ['videollamada', 'video', 'llamada', 'llamar', 'whatsapp', 'camara', 'nietos', 'ver', 'celular', 'familia'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 58, nivel: 'Principiante', duracion: '10 minutos',
      resumen_voz: 'Una guía para hablar con video por WhatsApp, en seis pasos.'
    },
    {
      id: 'g-pan-amasado',
      titulo: 'Pan amasado',
      categoria: 'cocina', icono: 'bread', ilustracion: 'pan',
      autor: 'Rosa Muñoz', autorId: 'u-rosa', who: 'rosa', edad: 72, comuna: 'Puente Alto',
      bio: 'Fue costurera durante 40 años. Siempre quiso ser profesora; hoy enseña desde SABERES.',
      materiales: ['1 kilo de harina', '1 taza de manteca derretida y tibia', '2 cucharaditas de sal', '2 tazas de agua tibia', '1 sobre de levadura seca', '1 paño limpio para tapar', 'Horno a 200 °C'],
      titulos: ['Despierte la levadura', 'Haga un volcán de harina', 'Junte todo al centro', 'Amase con la palma', 'Forme los bollitos', 'Al horno'],
      pasos: [
        'Disuelva la levadura en media taza de agua tibia con una cucharadita de azúcar. Espere 10 minutos, hasta que haga espuma.',
        'Ponga la harina en el mesón y haga un hoyo al centro, como un volcán. La sal va por el borde, lejos de la levadura.',
        'Al centro eche la manteca tibia, la levadura y el agua tibia de a poco, mientras va juntando con la mano.',
        'Amase con la palma unos 10 minutos, hasta que la masa esté suave y no se le pegue en los dedos.',
        'Forme bollitos, aplástelos y píntelos con un tenedor. Déjelos reposar tapados con un paño 20 minutos.',
        'Hornee a 200 °C entre 20 y 25 minutos, hasta que estén doraditos por encima.'
      ],
      ayudas: [
        'La levadura es lo que hace que el pan se infle. Póngala en una taza con agua tibia, como para bañar a una guagua, y una pizca de azúcar. Si a los 10 minutos hace espuma, está viva y lista.',
        'Ponga la harina en el mesón y con la mano haga un hueco al centro, como un volcán. La sal va por fuera, en el borde, porque si toca la levadura la mata.',
        'Eche al hueco la manteca tibia y la levadura. Después el agua, de a chorritos, y vaya juntando la harina desde los bordes hacia el centro.',
        'Amasar es empujar la masa con la palma de la mano, doblarla y volver a empujar. Cuando ya no se le pegue en los dedos, está lista.',
        'Saque pedazos del porte de un huevo, hágalos bolita, aplástelos con la mano y píncheles tres veces con un tenedor. Tápelos con un paño y déjelos descansar.',
        'Ponga los panes en una lata con un poco de harina y métalos al horno caliente. Están listos cuando se ven dorados por encima.'
      ],
      logro: 'Ya sabe hacer pan amasado. Su casa va a oler a domingo.',
      consejos: ['El agua tiene que estar tibia, como para bañar a una guagua.', 'Si la masa se pega, no le eche más harina: siga amasando.'],
      advertencias: ['Use paño o guante para sacar la bandeja. El horno quema.', 'Si el agua está muy caliente, la levadura no trabaja y el pan no sube.'],
      claves: ['pan', 'amasado', 'hallulla', 'masa', 'hornear', 'harina', 'once'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 47, nueva: true, nivel: 'Principiante', duracion: '2 horas', rinde: '16 panes',
      publicada: '1 de octubre de 2026',
      resumen_voz: 'Pan amasado de la señora Rosa, en seis pasos.'
    },
    {
      id: 'g-silla',
      titulo: 'Arreglar una silla coja',
      categoria: 'oficios', icono: 'wrench',
      autor: 'Don Luis', autorId: 'u-luis', who: 'luis', edad: 68, comuna: 'Maipú',
      bio: 'Trabajó 35 años en una mueblería. Arregla todo lo que cruje en su pasaje.',
      materiales: ['Un trozo de cartón o madera delgada', 'Cola fría', 'Un lápiz', 'Un cuchillo cartonero', 'Una lija fina'],
      titulos: ['Busque la pata corta', 'Mida la diferencia', 'Corte un taco', 'Pegue el taco', 'Espere y pruebe'],
      pasos: [
        'Ponga la silla en el piso más parejo de la casa y muévala. La pata que queda en el aire es la corta.',
        'Meta debajo de esa pata cartones delgados, uno sobre otro, hasta que la silla ya no se mueva.',
        'Con ese grosor, corte un taco de madera delgada o cartón grueso del tamaño de la pata.',
        'Lije la punta de la pata, ponga cola fría en el taco y péguelo firme abajo de la pata.',
        'Deje secar una noche entera con la silla parada. Al otro día, siéntese y pruébela.'
      ],
      consejos: ['Antes de cortar la pata más larga, siempre pruebe con un taco: cortar no tiene vuelta atrás.'],
      advertencias: ['Corte con el cuchillo hacia afuera, nunca hacia la mano.'],
      claves: ['silla', 'coja', 'mueble', 'arreglar', 'madera', 'pata'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 128, nivel: 'Principiante', duracion: '30 minutos',
      resumen_voz: 'Cómo arreglar una silla coja, en cinco pasos.'
    },
    {
      id: 'g-huerto',
      titulo: 'Huerto en macetas',
      categoria: 'huerto', icono: 'leaf',
      autor: 'Carmen', autorId: 'u-carmen', who: 'carmen', edad: 61, comuna: 'Valparaíso',
      bio: 'Cuidó a su mamá diez años. El jardín era su rato del día.',
      materiales: ['Un macetero de al menos 30 centímetros de hondo, con hoyos abajo', 'Tierra de hoja', 'Almácigos de tomate o lechuga', 'Piedritas', 'Agua'],
      titulos: ['Piedritas al fondo', 'Llene con tierra', 'Haga un hoyo', 'Plante con cuidado', 'Riegue y al sol'],
      pasos: [
        'Ponga piedritas en el fondo del macetero para que el agua escurra.',
        'Llene el macetero con tierra hasta cuatro dedos antes del borde.',
        'Haga un hoyo al medio, del porte del vasito del almácigo.',
        'Ponga la plantita y entiérrela un poco más honda de lo que venía.',
        'Riegue hasta que salga agua por abajo y deje el macetero donde le dé sol.'
      ],
      ayudas: [
        'En el fondo del macetero ponga un puñado de piedritas o pedazos de ladrillo. Así el agua no se queda estancada y la raíz no se pudre.',
        'Eche tierra hasta que quede un espacio como de cuatro dedos juntos entre la tierra y el borde. Ese espacio sirve para regar.',
        'Con la mano o una cuchara, haga un hoyo en el centro, más o menos del tamaño del vasito donde viene la plantita.',
        'Saque la plantita del vasito con cuidado, sin tirarla del tallo. Póngala en el hoyo y tape con tierra.',
        'Riegue despacito hasta que vea salir agua por los hoyos de abajo. Busque un lugar con sol por lo menos 6 horas al día.'
      ],
      consejos: ['Riegue en la mañana temprano o al atardecer, nunca a pleno sol.'],
      advertencias: [],
      claves: ['huerto', 'maceta', 'macetero', 'plantar', 'tomate', 'lechuga', 'jardin', 'sembrar', 'planta'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 86, nivel: 'Principiante', duracion: '1 hora',
      resumen_voz: 'Un huerto en macetas, en cinco pasos.'
    },
    {
      id: 'g-leccion-hector',
      titulo: 'Empecé de cero a los 50',
      categoria: 'historias', icono: 'quote',
      autor: 'Héctor', autorId: 'u-hector', who: 'hector', edad: 75, comuna: 'Temuco',
      leccion: {
        situacion: 'Cerró la fábrica donde trabajé 25 años. Tenía 50 años y nadie me quería contratar.',
        hice: 'Con una herramienta prestada abrí mi propio taller mecánico en el patio de la casa.',
        aprendi: 'Que lo que uno sabe hacer con las manos no se pierde, aunque cierre la fábrica.',
        consejo: 'Lo que sabes hacer con las manos nadie te lo quita.'
      },
      etiqueta: 'Cambié de rumbo', minutos: '4 min',
      materiales: [], pasos: [], consejos: ['Lo que sabes hacer con las manos nadie te lo quita.'], advertencias: [],
      claves: ['leccion', 'vida', 'cero', 'trabajo', 'cambio'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 203,
      resumen_voz: 'Una lección de vida de Héctor.'
    },
    {
      id: 'g-cazuela',
      titulo: 'Cazuela de vacuno como la de antes',
      categoria: 'cocina', icono: 'bowl',
      autor: 'Héctor', autorId: 'u-hector', who: 'hector', edad: 75, comuna: 'Temuco',
      materiales: ['Medio kilo de osobuco o tapapecho', '4 papas', '4 trozos de zapallo', '2 choclos', 'Media taza de arroz', 'Sal, orégano y cilantro'],
      pasos: [
        'Ponga la carne en una olla grande con agua fría y sal. Cuando hierva, sáquele la espuma con una cuchara.',
        'Deje la carne a fuego suave una hora, con la olla tapada.',
        'Agregue las papas peladas y el zapallo en trozos grandes.',
        'A los 15 minutos eche el choclo en rodajas y el arroz.',
        'Cuando el arroz esté blando, apague y sirva con cilantro picado encima.'
      ],
      consejos: ['El zapallo se deshace y espesa el caldo: no lo pique chico.'],
      advertencias: ['Cuidado con el vapor al destapar la olla.'],
      claves: ['cazuela', 'vacuno', 'carne', 'sopa', 'almuerzo', 'olla'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 58, nivel: 'Principiante', duracion: '1 hora y media',
      resumen_voz: 'La cazuela de Héctor, en cinco pasos.'
    },
    {
      id: 'g-enchufe',
      titulo: 'Cambiar un enchufe sin miedo',
      categoria: 'oficios', icono: 'wrench',
      autor: 'Don Luis', autorId: 'u-luis', who: 'luis', edad: 68, comuna: 'Maipú',
      materiales: ['Enchufe nuevo', 'Destornillador de paleta', 'Linterna'],
      pasos: [
        'Baje el automático de la casa en el tablero eléctrico. Sin luz, se trabaja seguro.',
        'Saque los dos tornillos de la tapa del enchufe viejo y tírelo suavemente hacia afuera.',
        'Fíjese en qué color de cable va en cada tornillo. Si quiere, sáquele una foto.',
        'Suelte los cables del enchufe viejo y apriételos en el nuevo, en el mismo orden.',
        'Atornille el enchufe en la pared, ponga la tapa y suba el automático.'
      ],
      consejos: ['Si algo no le calza, deténgase y llame a alguien que sepa. No hay apuro.'],
      advertencias: ['Nunca trabaje con la luz encendida.', 'Si los cables están quemados o pelados, llame a un eléctrico.'],
      claves: ['enchufe', 'electricidad', 'electrico', 'cable', 'luz'],
      riesgo: 'alto', estado: 'publicada', aprendieron: 64, nivel: 'Intermedio', duracion: '30 minutos',
      resumen_voz: 'Cómo cambiar un enchufe con seguridad.'
    },
    {
      id: 'g-compost',
      titulo: 'Compost con restos de cocina',
      categoria: 'huerto', icono: 'sprout',
      autor: 'Carmen', autorId: 'u-carmen', who: 'carmen', edad: 61, comuna: 'Valparaíso',
      materiales: ['Un balde con tapa y hoyitos', 'Restos de fruta y verdura', 'Hojas secas o cartón', 'Tierra'],
      pasos: [
        'Ponga en el fondo del balde una capa de hojas secas o cartón picado.',
        'Encima eche los restos de fruta y verdura. Nada de carne ni lácteos.',
        'Tape cada capa de restos con un puñado de tierra u hojas.',
        'Una vez por semana revuelva todo con un palo.',
        'En dos o tres meses tendrá tierra negra y suave para sus plantas.'
      ],
      consejos: ['Si huele mal, le falta seco: eche más hojas o cartón.'],
      advertencias: [],
      claves: ['compost', 'abono', 'basura', 'restos', 'tierra'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 40, nivel: 'Principiante', duracion: '20 minutos',
      resumen_voz: 'Compost con restos de cocina, en cinco pasos.'
    },
    {
      id: 'g-estafa',
      titulo: 'Cómo saber si un mensaje es una estafa',
      categoria: 'digital', icono: 'alert',
      autor: 'Equipo SABERES', autorId: 'u-equipo', who: null, edad: null, comuna: 'Santiago',
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
        'Puede borrar el mensaje sin miedo. Para hablar con su banco, use el número que está detrás de su tarjeta.'
      ],
      consejos: ['Si alguien le apura, desconfíe. Lo que es verdad puede esperar una llamada.'],
      advertencias: ['Nunca entregue la clave o el código que le llega por SMS.'],
      claves: ['estafa', 'mensaje', 'fraude', 'engano', 'banco', 'cuento', 'seguridad', 'sms'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 41, nivel: 'Principiante', duracion: '5 minutos',
      resumen_voz: 'Seis señales para reconocer un mensaje falso.'
    },
    {
      id: 'g-fotos',
      titulo: 'Ordenar las fotos del celular',
      categoria: 'digital', icono: 'phone',
      autor: 'Carmen', autorId: 'u-carmen', who: 'carmen', edad: 61, comuna: 'Valparaíso',
      materiales: ['Su celular', 'Un rato tranquilo'],
      pasos: [
        'Abra la aplicación de Fotos o Galería.',
        'Toque «Álbumes» y luego el signo más para crear uno nuevo.',
        'Póngale un nombre fácil, por ejemplo «Nietos».',
        'Toque las fotos que quiere guardar ahí y luego «Agregar».',
        'Repita con otros álbumes: «Viajes», «Recetas», «Familia».'
      ],
      consejos: ['Borre las fotos repetidas: el celular anda más rápido.'],
      advertencias: [],
      claves: ['fotos', 'galeria', 'album', 'celular', 'ordenar'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 22, nivel: 'Principiante', duracion: '15 minutos',
      resumen_voz: 'Cómo ordenar sus fotos en álbumes.'
    },
    {
      id: 'g-bufanda',
      titulo: 'Tu primera bufanda a palillo',
      categoria: 'hogar', icono: 'yarn',
      autor: 'Rosa Muñoz', autorId: 'u-rosa', who: 'rosa', edad: 72, comuna: 'Puente Alto',
      materiales: ['Dos palillos número 6', 'Dos ovillos de lana gruesa', 'Tijeras'],
      pasos: [
        'Haga un nudo corredizo y póngalo en un palillo.',
        'Monte 20 puntos, enrollando la lana en el pulgar y pasándola al palillo.',
        'Teja todas las corridas al derecho: meta el palillo, enrolle la lana y saque el punto.',
        'Siga tejiendo hasta que la bufanda mida lo mismo que usted de alto.',
        'Para cerrar, pase un punto sobre el otro hasta que quede uno solo. Corte y amarre.'
      ],
      consejos: ['No apriete la lana: el tejido suelto queda más bonito y abriga más.'],
      advertencias: [],
      claves: ['bufanda', 'tejer', 'palillo', 'lana', 'tejido'],
      riesgo: 'bajo', estado: 'publicada', aprendieron: 12, nivel: 'Principiante', duracion: '1 semana',
      publicada: '14 de septiembre de 2026',
      resumen_voz: 'Su primera bufanda a palillo, en cinco pasos.'
    }
  ];

  // ---------- Lecciones de vida (vista Aprender, «Por experiencia») ----------
  const LECCIONES = [
    { who: 'hector', autor: 'Héctor', edad: 75, comuna: 'Temuco', titulo: 'Empecé de cero a los 50', etiqueta: 'Cambié de rumbo', resumen: 'Cerró la fábrica donde trabajé 25 años. Con una herramienta prestada abrí mi propio taller mecánico.', consejo: 'Lo que sabes hacer con las manos nadie te lo quita.', minutos: '4 min' },
    { who: 'rosa', autor: 'Rosa Muñoz', edad: 72, comuna: 'Puente Alto', titulo: 'Lento también se llega', etiqueta: 'Estudio y trabajo', resumen: 'Dejé el colegio a los 14 para trabajar en un taller de costura. De noche leía los cuadernos de mis hermanos.', consejo: 'Si te toca estudiar y trabajar, no te avergüences de ir lento.', minutos: '3 min' },
    { who: 'luis', autor: 'Don Luis', edad: 68, comuna: 'Maipú', titulo: 'El primero de mi familia con taller propio', etiqueta: 'Primera generación', resumen: 'Nadie en mi casa había tenido negocio. Aprendí a sacar cuentas en un cuaderno, de noche.', consejo: 'Pregunta sin vergüenza. El que pregunta aprende el doble.', minutos: '5 min' },
    { who: 'carmen', autor: 'Carmen', edad: 61, comuna: 'Valparaíso', titulo: 'Cuidé a mi mamá diez años', etiqueta: 'Cuidé a mi familia', resumen: 'Dejé mi trabajo para cuidarla. El jardín fue el rato del día que era solo mío.', consejo: 'Cuidar a otros no es dejar de cuidarte. Búscate un rato tuyo.', minutos: '4 min' },
    { who: 'luis', autor: 'Don Luis', edad: 68, comuna: 'Maipú', titulo: 'Estudié de noche y trabajé de día', etiqueta: 'Estudio y trabajo', resumen: 'A los 30 terminé el liceo en un nocturno, con dos hijos chicos y turnos en la mueblería.', consejo: 'Cansado también se aprende. Lo importante es no soltar.', minutos: '3 min' },
    { who: 'hector', autor: 'Héctor', edad: 75, comuna: 'Temuco', titulo: 'El primero en salir del campo', etiqueta: 'Primera generación', resumen: 'Me vine a la ciudad a los 17 sin conocer a nadie. Entré como ayudante y aprendí mirando.', consejo: 'Busca a alguien que sepa más que tú y quédate cerca.', minutos: '4 min' }
  ];

  // ---------- Gracias recibidos (muro de gracias) ----------
  const GRACIAS = [
    { autorId: 'u-rosa', who: 'tomas', nombre: 'Tomás', edad: 19, comuna: 'La Florida', guia: 'pan amasado', mensaje: 'Me quedó igual al de mi abuela. Lo hice para mi mamá.', cuando: 'Hoy' },
    { autorId: 'u-rosa', who: 'javiera', nombre: 'Javiera', edad: 23, comuna: 'Concepción', guia: 'pan amasado', mensaje: 'Gracias por la paciencia en el amasado. Por fin me subió la masa.', cuando: 'Hoy' },
    { autorId: 'u-rosa', who: 'matias', nombre: 'Matías', edad: 17, comuna: 'Puente Alto', guia: 'bufanda a palillo', mensaje: 'Se la regalé a mi abuelo. Dijo que estaba perfecta.', cuando: 'Lunes' },
    { autorId: 'u-rosa', who: 'valentina', nombre: 'Valentina', edad: 21, comuna: 'Antofagasta', guia: 'lección de vida', mensaje: 'Yo también estudio y trabajo. Me hizo bien leerla.', cuando: 'Domingo' }
  ];

  // Usuaria de demo para «Ya tengo cuenta»: Rosa Muñoz / copihue
  const USUARIOS_BASE = [{
    id: 'u-rosa', nombre: 'Rosa Muñoz', comuna: 'Puente Alto', edad: 72, who: 'rosa',
    oficio: 'Costurera', sueno: 'Ser profesora',
    intereses: ['hacer videollamadas'], saberes: ['Pan amasado', 'tejer a palillo'],
    palabra_clave: 'copihue', telefono: '', ensenados: 2, leccion: true,
    bienvenida: 'Qué gusto tenerle de vuelta, Rosa.'
  }];

  // ---------- Memoria (usuarios y certificados en localStorage) ----------
  const LLAVE = 'saberes-mock-usuarios';
  const LLAVE_CERTIFICADOS = 'saberes-mock-certificados';
  const usuarios = USUARIOS_BASE.concat(leerUsuarios());
  const certificadosGuardados = leerCertificados();

  function leerUsuarios() {
    try { return JSON.parse(localStorage.getItem(LLAVE)) || []; } catch (e) { return []; }
  }
  function guardarUsuarios() {
    try { localStorage.setItem(LLAVE, JSON.stringify(usuarios.filter(u => u.id !== 'u-rosa'))); } catch (e) { /* sin almacenamiento */ }
  }
  function leerCertificados() {
    try { return JSON.parse(localStorage.getItem(LLAVE_CERTIFICADOS)) || []; } catch (e) { return []; }
  }
  function guardarCertificados() {
    try { localStorage.setItem(LLAVE_CERTIFICADOS, JSON.stringify(certificadosGuardados)); } catch (e) { /* sin almacenamiento */ }
  }

  // ---------- Utilidades ----------
  const copia = (x) => JSON.parse(JSON.stringify(x));
  const demora = () => new Promise(r => setTimeout(r, 500 + Math.random() * 500));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const mayus = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const frase = (s) => { s = mayus(s.trim()); return /[.!?]$/.test(s) ? s : s + '.'; };
  const listaConY = (a) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
  const primerNombre = (n) => String(n || '').split(' ')[0];

  // ---------- Endpoints simulados ----------
  function registro({ respuestas = {} }) {
    const r = respuestas;
    const u = {
      id: 'u-' + Date.now().toString(36),
      nombre: r.nombre || 'Amigo',
      comuna: r.comuna || '',
      oficio: r.oficio || '',
      sueno: r.sueno || '',
      intereses: r.aprender ? [r.aprender] : [],
      saberes: r.ensenar ? [r.ensenar] : [],
      palabra_clave: String(r.clave || '').toLowerCase(),
      telefono: r.telefono || '',
      ensenados: 0
    };
    u.bienvenida = [
      `Así quedó su perfil: ${u.nombre}${u.comuna ? ', de ' + u.comuna : ''}.`,
      u.oficio && `Se dedicó a ${u.oficio.toLowerCase()}`,
      u.sueno ? `${u.oficio ? 'y' : 'Usted'} soñaba con ${u.sueno.toLowerCase()}.` : (u.oficio ? '.' : ''),
      r.ensenar && `Puede enseñar ${r.ensenar}.`,
      '¿Está todo bien?'
    ].filter(Boolean).join(' ').replace(' .', '.');
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
      'que', 'por', 'favor', 'gustaria', 'saber', 'ensename', 'ensenar', 'necesito', 'algo', 'sobre', 'mas', 'menos', 'mis', 'con']);
    const palabras = norm(pregunta).split(' ').filter(w => w.length > 2 && !vacias.has(w));
    let mejor = null, puntaje = 0;
    for (const g of GUIAS) {
      if (g.estado === 'en revisión' || g.categoria === 'historias') continue;
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
    if (extra) texto = `${esNoEntendi ? '' : 'Buena pregunta. '}${extra}`;
    else if (String(paso).startsWith('Materiales')) texto = 'No se preocupe si le falta algo. Puede reemplazarlo por algo parecido que tenga en casa, o conseguirlo después.';
    else texto = `Vamos de a poco. Lo importante de este paso es esto: ${paso} Hágalo con calma; no hay apuro.`;
    return { texto };
  }

  function agregarGracias(g, aprendiz, mensaje) {
    GRACIAS.unshift({
      autorId: g.autorId, who: null, nombre: aprendiz || 'Alguien', edad: null, comuna: '',
      guia: g.titulo.toLowerCase(), mensaje: mensaje || '¡Gracias!', cuando: 'Ahora'
    });
    console.info(`[MOCK] WhatsApp a ${g.autor}: "${aprendiz || 'Alguien'} aprendió su ${g.titulo.toLowerCase()} gracias a usted."`);
  }

  function completar({ guiaId, aprendiz, usuarioId, propietarioClave, mensaje, agradecer: conGracias }) {
    const g = GUIAS.find(x => x.id === guiaId);
    if (!g) return { ok: false, error: 'No encontré esa guía.' };
    if (!propietarioClave) return { ok: false, error: 'No pude identificar dónde guardar su certificado.' };
    const cuenta = usuarioId ? usuarios.find(x => x.id === usuarioId) : null;
    if (usuarioId && !cuenta) return { ok: false, error: 'No encontré la cuenta para emitir el certificado.' };
    const nombreCertificado = cuenta?.nombre || aprendiz || 'Participante';
    const existente = certificadosGuardados.find(c => c.guiaId === guiaId && c.propietarioClave === propietarioClave);
    if (existente) {
      // Si la persona inició sesión después de emitirlo, sincronizamos el nombre
      // ya guardado con el de su cuenta sin volver a contar la finalización.
      if (cuenta && (existente.aprendiz !== cuenta.nombre || existente.usuarioId !== cuenta.id)) {
        existente.aprendiz = cuenta.nombre;
        existente.usuarioId = cuenta.id;
        guardarCertificados();
      }
      return { ok: true, aprendieron: g.aprendieron, certificado: existente, yaEmitido: true };
    }

    g.aprendieron = (Number(g.aprendieron) || 0) + 1;
    const semilla = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)).replace(/-/g, '').slice(0, 8).toUpperCase();
    const certificado = {
      id: 'c-' + semilla.toLowerCase(), codigo: 'SAB-' + semilla,
      guiaId: g.id, usuarioId: usuarioId || null, propietarioClave,
      aprendiz: nombreCertificado, cursoTitulo: g.titulo, autor: g.autor,
      emitidoEn: new Date().toISOString()
    };
    certificadosGuardados.unshift(certificado);
    guardarCertificados();
    if (conGracias) agregarGracias(g, nombreCertificado, mensaje);
    return { ok: true, aprendieron: g.aprendieron, certificado, yaEmitido: false };
  }

  function agradecer({ guiaId, aprendiz, mensaje }) {
    const g = GUIAS.find(x => x.id === guiaId);
    if (!g) return { ok: false, error: 'No encontré esa guía.' };
    agregarGracias(g, aprendiz, mensaje);
    return { ok: true };
  }

  function certificados({ propietarioClave }) {
    return certificadosGuardados.filter(c => c.propietarioClave === propietarioClave);
  }

  function aprendi(datos) {
    return completar(Object.assign({}, datos, {
      propietarioClave: datos.propietarioClave || 'legado-' + Date.now().toString(36),
      agradecer: true
    }));
  }

  function ensenar({ usuarioId, relato = '' }) {
    const u = usuarios.find(x => x.id === usuarioId) || { id: usuarioId, nombre: 'Usted', comuna: '', saberes: [] };
    const g = armarGuia(relato, u);
    GUIAS.unshift(g);
    u.ensenados = (u.ensenados || 0) + 1;
    return g;
  }

  // ---------- «IA» falsa: ordena el relato en una guía ----------
  const PALABRAS_CATEGORIA = {
    cocina: ['harina', 'horno', 'cocin', 'masa', 'olla', 'sarten', 'receta', 'pan', 'sopaipilla', 'empanada', 'queque', 'azucar', 'hervir', 'frei', 'hornear', 'cebolla', 'amasa'],
    huerto: ['plant', 'tierra', 'semilla', 'regar', 'riego', 'maceter', 'huerto', 'abono', 'almacigo', 'podar'],
    hogar: ['coser', 'boton', 'hilo', 'aguja', 'limpiar', 'lavar', 'mancha', 'planchar', 'ropa', 'tejer', 'palillo', 'lana'],
    oficios: ['martillo', 'clavo', 'tornillo', 'arreglar', 'reparar', 'madera', 'pintar', 'llave', 'caneria', 'soldar', 'taladro', 'enchufe'],
    digital: ['celular', 'whatsapp', 'computador', 'internet', 'aplicacion', 'correo', 'foto', 'mensaje'],
    historias: ['cuando yo era', 'en mis tiempos', 'historia', 'recuerdo', 'mi abuela', 'antiguamente', 'epoca']
  };

  function categoriaDe(n) {
    let mejor = 'hogar', max = 0;
    for (const [cat, palabras] of Object.entries(PALABRAS_CATEGORIA)) {
      const p = palabras.filter(w => n.includes(w)).length;
      if (p > max) { mejor = cat; max = p; }
    }
    return mejor;
  }

  function tituloDe(texto, u) {
    const m = texto.match(/\b(hacer|preparar|cocinar|plantar|sembrar|arreglar|coser|tejer|limpiar|pintar|cambiar|reparar|usar|cultivar|hornear|cuidar)\s+([^.,;:]+)/i);
    if (m) {
      const resto = m[2].split(/\s+(?:y|que|para|con|porque|cuando|pero|se|es|a mi)\s+/i)[0].split(' ').slice(0, 5).join(' ');
      return mayus(resto) + ' de ' + (/^(señora|don)\b/i.test(u.nombre) ? u.nombre : primerNombre(u.nombre));
    }
    if (u.saberes && u.saberes[0]) return mayus(u.saberes[0]) + ' de ' + primerNombre(u.nombre);
    return `Lo que sabe ${primerNombre(u.nombre)}`;
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
      .map(f => (f || '').replace(/^(y|e|ya|bueno|eh|mire|ya mijo|mijo)[\s,]+/i, '').replace(/\s+(y|e)$/i, '').replace(/^[,.:\s]+|[,\s]+$/g, '').trim())
      .filter(f => f.split(' ').length >= 3);

    const materiales = [], pasos = [], consejos = [], advertencias = [];
    for (const f of frases) {
      const nf = norm(f);
      if (/(ensenar|les voy a|te voy a|voy a explicar|voy a contar)/.test(nf) && !pasos.length) continue;
      if (/(necesit|ingrediente|hay que tener|materiales)/.test(nf) && !pasos.length) { materiales.push(...extraerLista(f)); continue; }
      if (/(cuidado|peligro|nunca|no se debe|ojo con)/.test(nf)) { advertencias.push(frase(f)); continue; }
      if (/(truco|consejo|secreto|recomiendo|siempre|lo mejor|un dato|decia)/.test(nf)) { consejos.push(frase(f)); continue; }
      if (pasos.length < 8) pasos.push(frase(f));
    }
    if (!pasos.length) pasos.push(frase(texto.slice(0, 220) || 'Paso único'));
    if (!consejos.length) consejos.push('Hágalo con calma: la práctica hace al maestro.');

    const alto = /\b(gas|electric\w*|enchufe|cable|corriente|remedio|medicament\w*|pastilla|dosis|escalera|cloro|veneno|insulina)\b/.test(n);
    if (alto) advertencias.unshift('Es un tema delicado: hágalo con cuidado y, ante cualquier duda, pida ayuda a alguien con experiencia.');

    const titulo = tituloDe(texto, u);
    const resumen = [
      `Muy bien, ${primerNombre(u.nombre)}. Ordené su guía.`,
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
      autor: u.nombre, autorId: u.id, who: u.who || null, edad: u.edad || null, comuna: u.comuna || '', foto: null,
      estado: alto ? 'en revisión' : 'publicada',
      aprendieron: 0, nueva: true, nivel: 'Principiante'
    };
  }

  // Lección de vida en 4 bloques (no está en el contrato del backend: es local)
  function armarLeccion(relato, u) {
    const partes = String(relato).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    const n = partes.length;
    const tomar = (a, b) => partes.slice(a, b).join(' ');
    const m = Math.max(1, n - 1);                 // la última frase es el consejo
    const corte = Math.max(1, Math.ceil(m / 3));
    const ultima = partes[n - 1] || '';
    const titulo = (ultima.split(/[,.]/)[0] || 'Mi lección').trim();
    return {
      titulo: mayus(titulo.length > 48 ? titulo.slice(0, 48) + '…' : titulo),
      situacion: tomar(0, corte) || relato,
      hice: tomar(corte, Math.min(corte * 2, m)) || 'Seguí adelante, de a poco.',
      aprendi: tomar(corte * 2, m) || 'Que todo se puede, aunque cueste.',
      consejo: ultima || 'No te rindas.',
      autor: u && u.nombre, who: u && u.who, edad: u && u.edad, comuna: u && u.comuna,
      etiquetas: /estudi|colegio|liceo|trabaj/.test(norm(relato)) ? ['Estudio y trabajo'] : ['Cambié de rumbo']
    };
  }

  // ---------- Enrutador ----------
  const RUTAS = {
    'POST /api/registro': registro,
    'POST /api/entrar': entrar,
    'POST /api/ensenar': ensenar,
    'POST /api/buscar': buscar,
    'POST /api/ayuda': ayuda,
    'POST /api/completar': completar,
    'POST /api/agradecer': agradecer,
    'POST /api/certificados': certificados,
    'POST /api/aprendi': aprendi,
    'GET /api/guias': () => GUIAS
  };

  async function api(metodo, url, body) {
    await demora();
    const ruta = RUTAS[`${metodo} ${String(url).split('?')[0]}`];
    if (!ruta) return { error: 'Esta función no está disponible en el modo simulado.' };
    return copia(ruta(body || {}));
  }

  // Quita una guía recién creada (cuando la persona elige «Cambiar algo»)
  function descartar(id) {
    const i = GUIAS.findIndex(g => g.id === id);
    if (i >= 0) GUIAS.splice(i, 1);
  }

  window.MOCK = {
    api, descartar, armarLeccion,
    lecciones: () => copia(LECCIONES),
    agregarLeccion: (l) => LECCIONES.unshift(Object.assign({ nueva: true, minutos: '3 min' }, l)),
    gracias: (autorId) => copia(GRACIAS.filter(g => g.autorId === autorId)),
    usuarioDemo: () => copia(USUARIOS_BASE[0])
  };
})();
