import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface ContactoMailData {
  nombre: string;
  correo: string;
  telefono?: string;
  asunto?: string;
  mensaje: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      this.logger.warn('SMTP no configurado (faltan SMTP_HOST/SMTP_USER/SMTP_PASS) — el formulario de contacto no enviará correos, solo guardará el mensaje.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 465,
      secure: Number(SMTP_PORT) !== 587,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  async sendContactoNotification(data: ContactoMailData) {
    if (!this.transporter) return;
    const to = process.env.CONTACT_EMAIL_TO || process.env.SMTP_USER;
    try {
      await this.transporter.sendMail({
        from: `"Dream Life — Web" <${process.env.SMTP_USER}>`,
        to,
        replyTo: data.correo,
        subject: `Nuevo mensaje de contacto: ${data.asunto?.trim() || 'Sin asunto'}`,
        text: `Nombre: ${data.nombre}\nCorreo: ${data.correo}\nTeléfono: ${data.telefono || '-'}\n\nMensaje:\n${data.mensaje}`,
        html: `<p><b>Nombre:</b> ${data.nombre}</p><p><b>Correo:</b> ${data.correo}</p><p><b>Teléfono:</b> ${data.telefono || '-'}</p><p><b>Mensaje:</b></p><p>${data.mensaje.replace(/\n/g, '<br>')}</p>`,
      });
    } catch (err) {
      this.logger.error('Error enviando correo de notificación de contacto', err as Error);
    }
  }
}
