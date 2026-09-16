import { Injectable } from '@nestjs/common';
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

@Injectable()
export class PdfService {
  private build(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      draw(doc);
      doc.end();
    });
  }

  private header(doc: PDFKit.PDFDocument, badge: string) {
    doc.rect(0, 0, doc.page.width, 90).fill('#111111');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('DREAM LIFE', 50, 28);
    doc.font('Helvetica').fontSize(9).fillColor('#cccccc').text('dreamlifeperu.com', 50, 53);
    const badgeText = badge.toUpperCase();
    doc.font('Helvetica-Bold').fontSize(9);
    const badgeWidth = doc.widthOfString(badgeText) + 24;
    doc.roundedRect(doc.page.width - 50 - badgeWidth, 30, badgeWidth, 22, 11).fill('#ffffff');
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(9).text(badgeText, doc.page.width - 50 - badgeWidth, 37, { width: badgeWidth, align: 'center' });
    doc.fillColor('#111111');
    doc.x = 50;
    doc.y = 112;
  }

  private codeBox(doc: PDFKit.PDFDocument, codigo: string, fecha: Date) {
    const y = doc.y;
    doc.roundedRect(50, y, doc.page.width - 100, 46, 6).fill('#f5f5f5');
    doc.fillColor('#6b6b6b').font('Helvetica').fontSize(8).text('CÓDIGO', 65, y + 9);
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(13).text(codigo, 65, y + 21);
    const fechaTexto = fecha.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    doc.fillColor('#6b6b6b').font('Helvetica').fontSize(8).text('FECHA DE REGISTRO', 290, y + 9, { width: 235, align: 'right' });
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(13).text(fechaTexto, 290, y + 21, { width: 235, align: 'right' });
    doc.x = 50;
    doc.y = y + 46 + 24;
  }

  private sectionTitle(doc: PDFKit.PDFDocument, title: string) {
    doc.x = 50;
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(11).text(title, 50, doc.y, { width: doc.page.width - 100 });
    const y = doc.y + 3;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#111111').lineWidth(1).stroke();
    doc.y = y + 12;
    doc.x = 50;
  }

  private row(doc: PDFKit.PDFDocument, label: string, value: string) {
    const y = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor('#6b6b6b').text(label, 50, y, { width: 140 });
    const afterLabelY = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#111111').text(value || '—', 200, y, { width: doc.page.width - 250 });
    doc.x = 50;
    doc.y = Math.max(afterLabelY, doc.y) + 6;
  }

  private block(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.x = 50;
    doc.font('Helvetica').fontSize(9).fillColor('#6b6b6b').text(label, { width: doc.page.width - 100 });
    doc.y += 2;
    doc.font('Helvetica').fontSize(10).fillColor('#111111').text(value, 50, doc.y, { width: doc.page.width - 100, lineGap: 2 });
    doc.y += 12;
  }

  private footer(doc: PDFKit.PDFDocument, texto: string) {
    doc.x = 50;
    doc.y += 8;
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e5e5e5').stroke();
    doc.y += 10;
    doc.font('Helvetica').fontSize(8).fillColor('#9a9a9a').text(texto, 50, doc.y, { width: doc.page.width - 100, lineGap: 2 });
  }

  async generateReclamacionPdf(data: ReclamacionPdfData): Promise<Buffer> {
    return this.build((doc) => {
      this.header(doc, data.tipo === 'QUEJA' ? 'Queja' : 'Reclamo');
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(16).text(
        data.tipo === 'QUEJA' ? 'CONSTANCIA DE QUEJA' : 'CONSTANCIA DE RECLAMO',
        50,
        doc.y,
      );
      doc.y += 16;
      this.codeBox(doc, data.codigo, data.fecha);

      this.sectionTitle(doc, '1. Datos del consumidor');
      this.row(doc, 'Nombre', data.nombre);
      this.row(doc, 'Documento', `${data.tipoDocumento} ${data.documento}`);
      this.row(doc, 'Correo', data.correo);
      this.row(doc, 'Teléfono', data.telefono || '—');
      this.row(doc, 'Domicilio', data.direccion || '—');
      doc.y += 6;

      this.sectionTitle(doc, '2. Identificación del bien contratado');
      this.row(doc, 'Producto / servicio', data.detalleBien || '—');
      this.row(doc, 'Monto reclamado', data.monto != null && data.monto !== '' ? `S/. ${data.monto}` : '—');
      doc.y += 6;

      this.sectionTitle(doc, '3. Detalle de la reclamación');
      this.block(doc, 'Descripción de los hechos', data.descripcion);
      this.block(doc, 'Pedido del consumidor', data.pedido);

      this.footer(
        doc,
        'El proveedor debe dar respuesta a este reclamo/queja en un plazo no mayor a treinta (30) días calendario, ' +
          'conforme al Código de Protección y Defensa del Consumidor (Ley 29571) y su reglamento (D.S. 011-2011-PCM). ' +
          'La formulación de este reclamo no impide acudir a otras vías de solución de controversias ni es requisito ' +
          'previo para interponer una denuncia ante el INDECOPI. Este documento constituye constancia de la ' +
          'presentación del reclamo/queja conforme a la normativa vigente. Generado automáticamente por dreamlifeperu.com.',
      );
    });
  }

  async generateContactoPdf(data: ContactoPdfData): Promise<Buffer> {
    return this.build((doc) => {
      this.header(doc, 'Contacto');
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(16).text('CONSTANCIA DE MENSAJE ENVIADO', 50, doc.y);
      doc.y += 16;
      this.codeBox(doc, data.codigo, data.fecha);

      this.sectionTitle(doc, '1. Datos del remitente');
      this.row(doc, 'Nombre', data.nombre);
      this.row(doc, 'Correo', data.correo);
      this.row(doc, 'Teléfono', data.telefono || '—');
      this.row(doc, 'Asunto', data.asunto?.trim() || 'Sin asunto');
      doc.y += 6;

      this.sectionTitle(doc, '2. Mensaje');
      this.block(doc, 'Contenido', data.mensaje);

      this.footer(
        doc,
        'Este documento es una constancia del mensaje enviado a través del formulario de contacto de ' +
          'dreamlifeperu.com. Te responderemos a la brevedad al correo indicado. Generado automáticamente.',
      );
    });
  }
}
