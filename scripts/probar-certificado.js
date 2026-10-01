import { mkdir, writeFile } from 'node:fs/promises';

await import('../public/certificados.js');

const destino = new URL('../tmp/pdfs/certificado-prueba.pdf', import.meta.url);
const certificado = {
  codigo: 'SAB-7C4E91A2',
  aprendiz: 'María José González Sepúlveda',
  cursoTitulo: 'Cómo hacer una videollamada con su familia paso a paso',
  autor: 'Rosa Muñoz',
  emitidoEn: '2026-10-01T18:30:00.000Z'
};

const pdf = globalThis.SABERES_CERTIFICADOS.crearPdfCertificado(certificado);
if (String.fromCharCode(...pdf.slice(0, 8)) !== '%PDF-1.4') throw new Error('El archivo no comienza como PDF 1.4');
if (!String.fromCharCode(...pdf.slice(-20)).includes('%%EOF')) throw new Error('El PDF quedó incompleto');

await mkdir(new URL('../tmp/pdfs/', import.meta.url), { recursive: true });
await writeFile(destino, pdf);
console.log(`Certificado de prueba creado: ${destino.pathname} (${pdf.length} bytes)`);
