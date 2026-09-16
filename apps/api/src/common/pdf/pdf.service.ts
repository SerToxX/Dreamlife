import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import PDFDocument = require('pdfkit');

interface ReclamacionPdfData {
  codigo: string;
  fecha: Date;
  tipo: string;
  nombre: string;
  tipoDocumento: string;
  documento: string;
  correo: string;
  telefono?: string | null;
  direccion?: string | null;
  detalleBien?: string | null;
  monto?: unknown;
  descripcion: string;
  pedido: string;
}

interface ContactoPdfData {
  codigo: string;
  fecha: Date;
  nombre: string;
  correo: string;
  telefono?: string | null;
  asunto?: string | null;
  mensaje: string;
}

const LOGO_PATH = path.join(process.cwd(), 'assets', 'logo-icon.png');
const MARGIN = 50;

@Injectable()
export class PdfService {
  private build(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      draw(doc);
      doc.end();
    });
  }

  private contentWidth(doc: PDFKit.PDFDocument) {
    return doc.page.width - MARGIN * 2;
  }

  // ── Encabezado centrado: logo + marca + subtítulo + razón social/RUC ──
  private header(doc: PDFKit.PDFDocument, subtitulo: string) {
    const width = this.contentWidth(doc);
    let y = MARGIN;
    const hasLogo = fs.existsSync(LOGO_PATH);
    const logoSize = 46;

    if (hasLogo) {
      doc.image(LOGO_PATH, doc.page.width / 2 - logoSize / 2, y, { width: logoSize, height: logoSize });
      y += logoSize + 10;
    }

    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(26).text('DREAM LIFE', MARGIN, y, { width, align: 'center' });
    y = doc.y + 6;
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#333333').text(subtitulo, MARGIN, y, { width, align: 'center' });
    y = doc.y + 8;

    const razon = process.env.COMPANY_RAZON_SOCIAL || 'Dream Life';
    const ruc = process.env.COMPANY_RUC || 'Por completar';
    doc.font('Helvetica').fontSize(9).fillColor('#666666').text(`Razón Social: ${razon}   |   RUC: ${ruc}`, MARGIN, y, { width, align: 'center' });
    y = doc.y + 16;

    doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(2).strokeColor('#000000').stroke();
    doc.y = y + 22;
    doc.x = MARGIN;
  }

  // ── Fila "Código de Reclamo" / "Fecha de Registro" (o equivalente) ──
  private codeRow(doc: PDFKit.PDFDocument, codigoLabel: string, codigo: string, fecha: Date) {
    const width = this.contentWidth(doc);
    const half = width / 2;
    const y = doc.y;
    const fechaTexto = fecha.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(`${codigoLabel}: `, MARGIN, y, { continued: true, width: half });
    doc.font('Helvetica').fillColor('#333333').text(codigo);

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Fecha de Registro: ', MARGIN + half, y, { continued: true, width: half });
    doc.font('Helvetica').fillColor('#333333').text(fechaTexto);

    doc.y = Math.max(doc.y, y + 16) + 18;
    doc.x = MARGIN;
  }

  private sectionTitle(doc: PDFKit.PDFDocument, title: string) {
    const width = this.contentWidth(doc);
    doc.x = MARGIN;
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(12).text(title, MARGIN, doc.y, { width });
    const y = doc.y + 6;
    doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(1.5).strokeColor('#000000').stroke();
    doc.y = y + 12;
    doc.x = MARGIN;
  }

  // ── Fila de tabla: celda de etiqueta con fondo gris + celda de valor, ambas con borde ──
  private tableRow(doc: PDFKit.PDFDocument, label: string, value: string) {
    const width = this.contentWidth(doc);
    const labelWidth = Math.round(width * 0.3);
    const valueWidth = width - labelWidth;
    const pad = 9;
    const texto = value?.trim() || '—';

    doc.font('Helvetica').fontSize(9.5);
    const valueHeight = doc.heightOfString(texto, { width: valueWidth - pad * 2 });
    const rowHeight = Math.max(30, valueHeight + pad * 2);
    const y = doc.y;

    if (y + rowHeight > doc.page.height - MARGIN) {
      doc.addPage();
      doc.y = MARGIN;
      return this.tableRow(doc, label, value);
    }

    doc.rect(MARGIN, y, labelWidth, rowHeight).fillAndStroke('#f5f5f5', '#dddddd');
    doc.rect(MARGIN + labelWidth, y, valueWidth, rowHeight).lineWidth(1).strokeColor('#dddddd').stroke();

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000').text(label, MARGIN + pad, y + pad, { width: labelWidth - pad * 2 });
    doc.font('Helvetica').fontSize(9.5).fillColor('#222222').text(texto, MARGIN + labelWidth + pad, y + pad, { width: valueWidth - pad * 2 });

    doc.x = MARGIN;
    doc.y = y + rowHeight;
  }

  // ── Bloque de texto largo con caja gris clara (descripción, pedido, mensaje) ──
  private textBlock(doc: PDFKit.PDFDocument, label: string, value: string) {
    const width = this.contentWidth(doc);
    doc.x = MARGIN;
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#000000').text(label, MARGIN, doc.y, { width });
    doc.y += 7;

    const pad = 12;
    doc.font('Helvetica').fontSize(9.5);
    const textHeight = doc.heightOfString(value, { width: width - pad * 2 });
    const boxHeight = Math.max(50, textHeight + pad * 2);
    const y = doc.y;

    if (y + boxHeight > doc.page.height - MARGIN) {
      doc.addPage();
      doc.y = MARGIN;
      return this.textBlock(doc, label, value);
    }

    doc.rect(MARGIN, y, width, boxHeight).fillAndStroke('#fafafa', '#dddddd');
    doc.font('Helvetica').fontSize(9.5).fillColor('#222222').text(value, MARGIN + pad, y + pad, { width: width - pad * 2 });

    doc.x = MARGIN;
    doc.y = y + boxHeight + 16;
  }

  private footer(doc: PDFKit.PDFDocument, parrafos: string[]) {
    const width = this.contentWidth(doc);
    doc.x = MARGIN;
    doc.y += 6;
    doc.moveTo(MARGIN, doc.y).lineTo(doc.page.width - MARGIN, doc.y).lineWidth(2).strokeColor('#000000').stroke();
    doc.y += 14;
    parrafos.forEach((p) => {
      doc.font('Helvetica').fontSize(8).fillColor('#666666').text(p, MARGIN, doc.y, { width, lineGap: 2 });
      doc.y += 8;
    });
  }

  async generateReclamacionPdf(data: ReclamacionPdfData): Promise<Buffer> {
    return this.build((doc) => {
      const esQueja = data.tipo === 'QUEJA';
      this.header(doc, 'LIBRO DE RECLAMACIONES');
      this.codeRow(doc, esQueja ? 'Código de Queja' : 'Código de Reclamo', data.codigo, data.fecha);

      this.sectionTitle(doc, '1. Datos del consumidor');
      this.tableRow(doc, 'Nombre', data.nombre);
      this.tableRow(doc, 'Tipo de Documento', data.tipoDocumento);
      this.tableRow(doc, 'Número de Documento', data.documento);
      this.tableRow(doc, 'Teléfono', data.telefono || '');
      this.tableRow(doc, 'Correo Electrónico', data.correo);
      this.tableRow(doc, 'Dirección', data.direccion || '');
      doc.y += 14;

      this.sectionTitle(doc, '2. Identificación del bien contratado');
      this.tableRow(doc, 'Producto / Servicio', data.detalleBien || '');
      this.tableRow(doc, 'Monto Reclamado', data.monto != null && data.monto !== '' ? `S/. ${data.monto}` : '');
      this.tableRow(doc, 'Tipo de Registro', esQueja ? 'Queja' : 'Reclamo');
      doc.y += 14;

      this.sectionTitle(doc, '3. Detalle del reclamo');
      this.textBlock(doc, 'Descripción de los Hechos:', data.descripcion);
      this.textBlock(doc, 'Petitorio (Solución Solicitada):', data.pedido);

      this.footer(doc, [
        'El proveedor debe dar respuesta a este reclamo/queja en un plazo no mayor a treinta (30) días calendario, conforme al Código de Protección y Defensa del Consumidor (Ley 29571) y su reglamento (D.S. 011-2011-PCM).',
        'La formulación de este reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.',
        'Este documento ha sido generado automáticamente y constituye constancia de la presentación del reclamo/queja conforme a la normativa vigente.',
      ]);
    });
  }

  async generateContactoPdf(data: ContactoPdfData): Promise<Buffer> {
    return this.build((doc) => {
      this.header(doc, 'CONSTANCIA DE CONTACTO');
      this.codeRow(doc, 'Código', data.codigo, data.fecha);

      this.sectionTitle(doc, '1. Datos del remitente');
      this.tableRow(doc, 'Nombre', data.nombre);
      this.tableRow(doc, 'Correo Electrónico', data.correo);
      this.tableRow(doc, 'Teléfono', data.telefono || '');
      this.tableRow(doc, 'Asunto', data.asunto?.trim() || 'Sin asunto');
      doc.y += 14;

      this.sectionTitle(doc, '2. Mensaje');
      this.textBlock(doc, 'Contenido:', data.mensaje);

      this.footer(doc, [
        'Este documento es una constancia del mensaje enviado a través del formulario de contacto de dreamlifeperu.com.',
        'Te responderemos a la brevedad al correo indicado. Documento generado automáticamente.',
      ]);
    });
  }
}
