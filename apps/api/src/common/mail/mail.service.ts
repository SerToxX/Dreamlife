import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface ContactoMailData {
  nombre: string;
  correo: string;
  telefono?: string | null;
  asunto?: string | null;
  mensaje: string;
}

interface ReclamacionMailData {
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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      this.logger.warn('SMTP no configurado (faltan SMTP_HOST/SMTP_USER/SMTP_PASS) — no se enviarán correos, solo se guardará el mensaje.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 465,
      secure: Number(SMTP_PORT) !== 587,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  private esc(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
  }

  private async send(
    to: string,
    subject: string,
    replyTo: string,
    html: string,
    text: string,
    attachment?: { filename: string; content: Buffer },
  ) {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({
        from: `"Dream Life — Web" <${process.env.SMTP_USER}>`,
        to,
        replyTo,
        subject,
        text,
        html,
        attachments: attachment ? [{ filename: attachment.filename, content: attachment.content, contentType: 'application/pdf' }] : undefined,
      });
    } catch (err) {
      this.logger.error('Error enviando correo de notificación', err as Error);
    }
  }

  private layout(badge: string, title: string, rows: Array<{ label: string; value: string }>, bodyLabel: string, bodyValue: string, extraBody?: { label: string; value: string }) {
    const row = (label: string, value: string) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #ececec;color:#6b6b6b;font-size:13px;width:140px;vertical-align:top;">${label}</td>
        <td style="padding:10px 0;border-bottom:1px solid #ececec;color:#111;font-size:14px;vertical-align:top;">${value}</td>
      </tr>`;
    const bodyBlock = (label: string, value: string) => `
      <tr>
        <td colspan="2" style="padding:18px 0 6px;color:#6b6b6b;font-size:13px;">${label}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0 0 6px;color:#111;font-size:14px;line-height:1.6;white-space:pre-wrap;">${value}</td>
      </tr>`;

    return `
<div style="background:#f5f5f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="background:#111111;padding:24px 28px;">
      <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.3px;">Dream Life</div>
      <div style="display:inline-block;margin-top:10px;padding:4px 10px;background:#ffffff;color:#111111;font-size:11px;font-weight:700;letter-spacing:0.5px;border-radius:999px;text-transform:uppercase;">${badge}</div>
    </div>
    <div style="padding:24px 28px 28px;">
      <h1 style="margin:0 0 18px;font-size:17px;color:#111;">${title}</h1>
      <table style="width:100%;border-collapse:collapse;">
        ${rows.map((r) => row(r.label, r.value)).join('')}
        ${bodyBlock(bodyLabel, bodyValue)}
        ${extraBody ? bodyBlock(extraBody.label, extraBody.value) : ''}
      </table>
    </div>
    <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #ececec;color:#9a9a9a;font-size:11px;">
      Este correo se generó automáticamente desde dreamlifeperu.com — responde directo a este correo para contactar a la persona.
    </div>
  </div>
</div>`;
  }

  // ── Al negocio: notificación de un mensaje de contacto nuevo ──
  async sendContactoNotification(data: ContactoMailData, pdf?: Buffer) {
    const admin = process.env.CONTACT_EMAIL_TO || process.env.SMTP_USER;
    if (!admin) return;
    const html = this.layout(
      'Formulario de contacto',
      'Nuevo mensaje de contacto',
      [
        { label: 'Nombre', value: this.esc(data.nombre) },
        { label: 'Correo', value: this.esc(data.correo) },
        { label: 'Teléfono', value: data.telefono ? this.esc(data.telefono) : '—' },
        { label: 'Asunto', value: this.esc(data.asunto?.trim() || 'Sin asunto') },
      ],
      'Mensaje',
      this.esc(data.mensaje),
    );
    const text = `Nuevo mensaje de contacto\n\nNombre: ${data.nombre}\nCorreo: ${data.correo}\nTeléfono: ${data.telefono || '-'}\nAsunto: ${data.asunto?.trim() || 'Sin asunto'}\n\nMensaje:\n${data.mensaje}`;
    await this.send(
      admin,
      `Nuevo mensaje de contacto: ${data.asunto?.trim() || 'Sin asunto'}`,
      data.correo,
      html,
      text,
      pdf ? { filename: 'constancia-contacto.pdf', content: pdf } : undefined,
    );
  }

  // ── Al cliente: confirmación de que su mensaje se recibió, con su copia en PDF ──
  async sendContactoConstancia(data: ContactoMailData, pdf: Buffer, codigo: string) {
    const admin = process.env.CONTACT_EMAIL_TO || process.env.SMTP_USER;
    const html = this.layout(
      'Confirmación',
      'Recibimos tu mensaje',
      [
        { label: 'Código', value: codigo },
        { label: 'Asunto', value: this.esc(data.asunto?.trim() || 'Sin asunto') },
      ],
      'Tu mensaje',
      this.esc(data.mensaje),
    );
    const text = `Hola ${data.nombre},\n\nRecibimos tu mensaje (código ${codigo}). Te responderemos a la brevedad a este mismo correo.\n\nAdjuntamos tu constancia en PDF.\n\n— Dream Life`;
    await this.send(data.correo, `Recibimos tu mensaje — código ${codigo}`, admin || data.correo, html, text, {
      filename: 'constancia-contacto.pdf',
      content: pdf,
    });
  }

  // ── Al negocio: notificación de un reclamo/queja nuevo ──
  async sendReclamacionNotification(data: ReclamacionMailData, pdf?: Buffer) {
    const admin = process.env.CONTACT_EMAIL_TO || process.env.SMTP_USER;
    if (!admin) return;
    const montoTexto = data.monto != null && data.monto !== '' ? `S/. ${data.monto}` : '—';
    const html = this.layout(
      data.tipo === 'QUEJA' ? 'Queja' : 'Reclamo',
      `Nuevo ${data.tipo === 'QUEJA' ? 'queja' : 'reclamo'} en el libro de reclamaciones`,
      [
        { label: 'Nombre', value: this.esc(data.nombre) },
        { label: 'Documento', value: this.esc(`${data.tipoDocumento} ${data.documento}`) },
        { label: 'Correo', value: this.esc(data.correo) },
        { label: 'Teléfono', value: data.telefono ? this.esc(data.telefono) : '—' },
        { label: 'Domicilio', value: data.direccion ? this.esc(data.direccion) : '—' },
        { label: 'Bien contratado', value: data.detalleBien ? this.esc(data.detalleBien) : '—' },
        { label: 'Monto reclamado', value: montoTexto },
      ],
      'Detalle de los hechos',
      this.esc(data.descripcion),
      { label: 'Pedido del consumidor', value: this.esc(data.pedido) },
    );
    const text = `Nuevo ${data.tipo} en el libro de reclamaciones\n\nNombre: ${data.nombre}\nDocumento: ${data.tipoDocumento} ${data.documento}\nCorreo: ${data.correo}\nTeléfono: ${data.telefono || '-'}\nDomicilio: ${data.direccion || '-'}\nBien contratado: ${data.detalleBien || '-'}\nMonto reclamado: ${montoTexto}\n\nDetalle de los hechos:\n${data.descripcion}\n\nPedido del consumidor:\n${data.pedido}`;
    await this.send(
      admin,
      `Nuevo ${data.tipo === 'QUEJA' ? 'queja' : 'reclamo'}: ${data.nombre}`,
      data.correo,
      html,
      text,
      pdf ? { filename: 'constancia-reclamo.pdf', content: pdf } : undefined,
    );
  }

  // ── Al cliente: constancia del reclamo/queja — obligatoria por Ley 29571 /
  // D.S. 011-2011-PCM, el consumidor debe recibir copia de su hoja de reclamación.
  async sendReclamacionConstancia(data: ReclamacionMailData, pdf: Buffer, codigo: string) {
    const admin = process.env.CONTACT_EMAIL_TO || process.env.SMTP_USER;
    const html = this.layout(
      'Constancia',
      `Constancia de tu ${data.tipo === 'QUEJA' ? 'queja' : 'reclamo'}`,
      [
        { label: 'Código', value: codigo },
        { label: 'Tipo', value: data.tipo === 'QUEJA' ? 'Queja' : 'Reclamo' },
      ],
      'Detalle de los hechos',
      this.esc(data.descripcion),
      { label: 'Pedido del consumidor', value: this.esc(data.pedido) },
    );
    const text = `Hola ${data.nombre},\n\nRegistramos tu ${data.tipo === 'QUEJA' ? 'queja' : 'reclamo'} (código ${codigo}). Te responderemos en un plazo no mayor a 30 días calendario, conforme a la Ley 29571.\n\nAdjuntamos tu constancia en PDF — guárdala como comprobante.\n\n— Dream Life`;
    await this.send(
      data.correo,
      `Constancia de tu ${data.tipo === 'QUEJA' ? 'queja' : 'reclamo'} — código ${codigo}`,
      admin || data.correo,
      html,
      text,
      { filename: 'constancia-reclamo.pdf', content: pdf },
    );
  }
}
