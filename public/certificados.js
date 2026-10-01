/* =========================================================
   SABERES · Certificados descargables
   Genera un PDF A4 horizontal sin dependencias externas.
   ========================================================= */
'use strict';

(function (raiz) {
  const ANCHO = 842;
  const CENTRO = 462;

  const CP1252 = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
    0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
    0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
    0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
    0x017E: 0x9E, 0x0178: 0x9F
  };

  function bytesBinarios(texto) {
    const salida = [];
    for (const caracter of String(texto)) {
      const codigo = caracter.codePointAt(0);
      if (codigo <= 0x7F || (codigo >= 0xA0 && codigo <= 0xFF)) salida.push(codigo);
      else salida.push(CP1252[codigo] || 0x3F);
    }
    return salida;
  }

  function escaparTexto(texto) {
    const salida = [];
    for (const byte of bytesBinarios(texto)) {
      if (byte === 0x28 || byte === 0x29 || byte === 0x5C) salida.push(0x5C);
      salida.push(byte);
    }
    return String.fromCharCode(...salida);
  }

  function aBytes(texto) {
    return Uint8Array.from(Array.from(texto, c => c.charCodeAt(0) & 0xFF));
  }

  function limpiar(texto, maximo = 120) {
    return String(texto || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximo);
  }

  function anchoAproximado(texto, tamano, fuente) {
    const factor = fuente === 'F2' ? 0.56 : fuente === 'F4' ? 0.5 : 0.52;
    return Array.from(String(texto)).reduce((total, c) => total + (/[ilI.,' ]/.test(c) ? 0.45 : /[MWÁÉÍÓÚÑ]/.test(c) ? 1.3 : 1), 0) * tamano * factor;
  }

  function partirLineas(texto, anchoMaximo, tamano, fuente, maxLineas = 2) {
    const palabras = limpiar(texto).split(' ').filter(Boolean);
    const lineas = [];
    let actual = '';
    for (const palabra of palabras) {
      const candidata = actual ? `${actual} ${palabra}` : palabra;
      if (actual && anchoAproximado(candidata, tamano, fuente) > anchoMaximo) {
        lineas.push(actual);
        actual = palabra;
        if (lineas.length === maxLineas - 1) break;
      } else actual = candidata;
    }
    const usadas = lineas.join(' ').split(' ').filter(Boolean).length;
    const restantes = palabras.slice(usadas);
    if (actual && lineas.length < maxLineas) {
      let ultima = restantes.join(' ') || actual;
      while (ultima.length > 1 && anchoAproximado(ultima + (usadas + restantes.length < palabras.length ? '...' : ''), tamano, fuente) > anchoMaximo) {
        ultima = ultima.slice(0, -1).trim();
      }
      if (usadas + restantes.length < palabras.length) ultima = ultima.replace(/[.,;:]?$/, '...');
      lineas.push(ultima);
    }
    return lineas.length ? lineas.slice(0, maxLineas) : ['Curso de SABERES'];
  }

  function fechaLarga(valor) {
    const fecha = valor ? new Date(valor) : new Date();
    const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
    return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' }).format(valida);
  }

  function nombreArchivo(datos) {
    const base = limpiar(datos.cursoTitulo || datos.titulo || 'curso', 60)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'curso';
    return `certificado-saberes-${base}.pdf`;
  }

  function crearPdfCertificado(datos = {}) {
    const nombre = limpiar(datos.aprendiz || datos.nombre || 'Participante', 80);
    const curso = limpiar(datos.cursoTitulo || datos.titulo || 'Curso de SABERES', 150);
    const autor = limpiar(datos.autor || 'Comunidad SABERES', 80);
    const codigo = limpiar(datos.codigo || datos.id || 'SABERES', 50).toUpperCase();
    const fecha = fechaLarga(datos.emitidoEn || datos.fecha);
    const contenido = [];
    const op = (s) => contenido.push(s + '\n');
    const texto = (valor, x, y, tamano, fuente = 'F1', color = '0.17 0.11 0.08', centrado = false, centro = ANCHO / 2) => {
      const posX = centrado ? Math.max(96, centro - anchoAproximado(valor, tamano, fuente) / 2) : x;
      op(`BT /${fuente} ${tamano} Tf ${color} rg 1 0 0 1 ${posX.toFixed(1)} ${y.toFixed(1)} Tm (${escaparTexto(valor)}) Tj ET`);
    };
    const circulo = (cx, cy, r) => {
      const k = 0.5522847498 * r;
      op(`${(cx + r).toFixed(1)} ${cy} m ${(cx + r).toFixed(1)} ${(cy + k).toFixed(1)} ${(cx + k).toFixed(1)} ${(cy + r).toFixed(1)} ${cx} ${(cy + r).toFixed(1)} c`);
      op(`${(cx - k).toFixed(1)} ${(cy + r).toFixed(1)} ${(cx - r).toFixed(1)} ${(cy + k).toFixed(1)} ${(cx - r).toFixed(1)} ${cy} c`);
      op(`${(cx - r).toFixed(1)} ${(cy - k).toFixed(1)} ${(cx - k).toFixed(1)} ${(cy - r).toFixed(1)} ${cx} ${(cy - r).toFixed(1)} c`);
      op(`${(cx + k).toFixed(1)} ${(cy - r).toFixed(1)} ${(cx + r).toFixed(1)} ${(cy - k).toFixed(1)} ${(cx + r).toFixed(1)} ${cy} c`);
    };

    op('q');
    // Papel, marco y franja de marca.
    op('0.996 0.976 0.941 rg 0 0 842 595 re f');
    op('0.66 0.27 0.12 rg 0 0 82 595 re f');
    op('0.17 0.11 0.08 RG 2 w 18 18 806 559 re S');
    op('0.89 0.65 0.18 RG 1.5 w 28 28 786 539 re S');
    op('0.95 0.90 0.80 rg 82 512 742 55 re f');

    // Formas decorativas suaves.
    op('0.91 0.94 0.87 rg');
    circulo(770, 520, 86); op('f');
    op('0.98 0.91 0.83 rg');
    circulo(92, 42, 105); op('f');
    op('0.66 0.27 0.12 rg 42 76 9 360 re f');
    op('0.89 0.65 0.18 rg 58 126 4 260 re f');

    // Marca lateral y encabezado.
    op('0.996 0.976 0.941 rg');
    circulo(42, 512, 23); op('f');
    texto('S', 31, 500, 30, 'F2', '0.66 0.27 0.12');
    texto('SABERES', 126, 535, 20, 'F2', '0.17 0.11 0.08');
    texto('APRENDA, ENSEÑE Y DEJE SU HUELLA', 126, 518, 8, 'F2', '0.42 0.29 0.05');
    op('0.66 0.27 0.12 RG 1.5 w 126 501 m 765 501 l S');

    texto('CERTIFICADO', 0, 454, 12, 'F2', '0.66 0.27 0.12', true, CENTRO);
    texto('DE APRENDIZAJE', 0, 421, 29, 'F2', '0.17 0.11 0.08', true, CENTRO);
    texto('SABERES reconoce a', 0, 385, 12, 'F1', '0.38 0.31 0.25', true, CENTRO);

    let tamanoNombre = 38;
    while (tamanoNombre > 25 && anchoAproximado(nombre, tamanoNombre, 'F4') > 625) tamanoNombre--;
    texto(nombre, 0, 330, tamanoNombre, 'F4', '0.66 0.27 0.12', true, CENTRO);
    op('0.89 0.65 0.18 RG 1.8 w 178 311 m 746 311 l S');
    texto('por completar satisfactoriamente el curso', 0, 285, 12, 'F1', '0.38 0.31 0.25', true, CENTRO);

    // Banda destacada con el nombre del curso.
    op('0.91 0.94 0.87 rg 150 196 624 68 re f');
    op('0.25 0.35 0.14 RG 1.5 w 150 196 624 68 re S');
    const lineasCurso = partirLineas(curso, 570, 21, 'F2', 2);
    const inicioCurso = lineasCurso.length === 1 ? 220 : 235;
    lineasCurso.forEach((linea, i) => texto(linea, 0, inicioCurso - i * 26, 21, 'F2', '0.20 0.30 0.11', true, CENTRO));

    // Firma, fecha y código verificable.
    texto('Compartido por', 176, 156, 9, 'F2', '0.42 0.29 0.05');
    texto(autor, 176, 133, 15, 'F3', '0.17 0.11 0.08');
    op('0.42 0.29 0.05 RG 1 w 176 122 m 395 122 l S');
    texto(`Emitido el ${fecha}`, 176, 83, 10, 'F1', '0.38 0.31 0.25');
    texto(`Código de certificado: ${codigo}`, 176, 65, 9, 'F2', '0.42 0.29 0.05');

    // Sello con cintas.
    op('0.66 0.27 0.12 rg 654 53 m 674 29 l 690 57 l f');
    op('0.25 0.35 0.14 rg 702 57 m 719 29 l 737 54 l f');
    op('0.89 0.65 0.18 rg');
    circulo(696, 95, 48); op('f');
    op('0.66 0.27 0.12 RG 3 w');
    circulo(696, 95, 39); op('S');
    op('0.996 0.976 0.941 RG 1.5 w');
    circulo(696, 95, 32); op('S');
    texto('S', 680, 77, 40, 'F2', '0.17 0.11 0.08');
    texto('LOGRO', 681, 62, 7, 'F2', '0.17 0.11 0.08');
    op('Q');

    const flujo = contenido.join('');
    const objetos = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${flujo.length} >>\nstream\n${flujo}endstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>',
      `<< /Title (${escaparTexto(`Certificado SABERES - ${curso}`)}) /Author (SABERES) /Subject (Certificado de aprendizaje) /Creator (Plataforma SABERES) >>`
    ];

    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];
    objetos.forEach((objeto, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
    });
    const inicioXref = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info 9 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
    return aBytes(pdf);
  }

  function descargarCertificado(datos) {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return null;
    const blob = new Blob([crearPdfCertificado(datos)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo(datos);
    enlace.style.display = 'none';
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return enlace.download;
  }

  raiz.SABERES_CERTIFICADOS = { crearPdfCertificado, descargarCertificado, nombreArchivo, fechaLarga };
})(typeof window !== 'undefined' ? window : globalThis);
