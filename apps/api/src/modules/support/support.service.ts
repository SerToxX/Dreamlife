import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { PdfService } from '../../common/pdf/pdf.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// DNI y RUC peruanos son siempre numéricos (8 y 11 dígitos); CE y
// Pasaporte sí pueden traer letras, así que esos no se validan aquí.
const DOC_NUMERICO: Record<string, number> = { DNI: 8, RUC: 11 };

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService, private mail: MailService, private pdf: PdfService) {}

  // Libro de reclamaciones — campos exigidos por el Código de Protección y
  // Defensa del Consumidor (Ley 29571) y su reglamento (D.S. 011-2011-PCM)
  // para la Hoja de Reclamación: identificación del consumidor (con domicilio
  // y documento), identificación del bien contratado, detalle de los hechos
  // y el pedido concreto del consumidor (distinto de la descripción).
  async createReclamacion(body: any) {
    if (!body?.nombre?.trim()) throw new BadRequestException('El nombre es obligatorio');
    if (!body?.documento?.trim()) throw new BadRequestException('El documento de identidad es obligatorio');
    if (!body?.correo?.trim()) throw new BadRequestException('El correo es obligatorio');
    if (!EMAIL_RE.test(body.correo.trim())) throw new BadRequestException('El correo no tiene un formato válido');
    if (!body?.direccion?.trim()) throw new BadRequestException('El domicilio es obligatorio');
    if (!body?.descripcion?.trim()) throw new BadRequestException('El detalle de los hechos es obligatorio');
    if (!body?.pedido?.trim()) throw new BadRequestException('El pedido del consumidor es obligatorio');
    if (body?.menorEdad && !body?.apoderadoNombre?.trim()) throw new BadRequestException('Si el reclamante es menor de edad, se requiere el nombre del apoderado');

    const tipoDoc = body.tipoDocumento ?? 'DNI';
    const digitos = DOC_NUMERICO[tipoDoc];
    if (digitos && !new RegExp(`^\\d{${digitos}}$`).test(body.documento.trim())) {
      throw new BadRequestException(`El ${tipoDoc} debe tener exactamente ${digitos} dígitos numéricos`);
    }
    if (body?.telefono?.trim() && !/^[\d\s+]+$/.test(body.telefono.trim())) {
      throw new BadRequestException('El teléfono solo puede contener números');
    }

    const reclamacion = await this.prisma.reclamacion.create({
      data: {
        tipo: body.tipo === 'QUEJA' ? 'QUEJA' : 'RECLAMO',
        nombre: body.nombre.trim(),
        tipoDocumento: tipoDoc,
        documento: body.documento.trim(),
        correo: body.correo.trim(),
        telefono: body.telefono?.trim() || null,
        direccion: body.direccion.trim(),
        menorEdad: !!body.menorEdad,
        apoderadoNombre: body.menorEdad ? body.apoderadoNombre?.trim() || null : null,
        apoderadoDocumento: body.menorEdad ? body.apoderadoDocumento?.trim() || null : null,
        detalleBien: body.detalleBien?.trim() || null,
        monto: body.monto != null && body.monto !== '' ? Number(body.monto) : null,
        descripcion: body.descripcion.trim(),
        pedido: body.pedido.trim(),
      },
    });

    const codigo = `${reclamacion.tipo}-${String(reclamacion.id).padStart(6, '0')}`;
    const mailData = {
      tipo: reclamacion.tipo,
      nombre: reclamacion.nombre,
      tipoDocumento: reclamacion.tipoDocumento,
      documento: reclamacion.documento,
      correo: reclamacion.correo,
      telefono: reclamacion.telefono,
      direccion: reclamacion.direccion,
      detalleBien: reclamacion.detalleBien,
      monto: reclamacion.monto,
      descripcion: reclamacion.descripcion,
      pedido: reclamacion.pedido,
    };

    // Ley 29571 / D.S. 011-2011-PCM: el consumidor debe recibir copia de su
    // hoja de reclamación, y la empresa debe conservar la suya.
    this.pdf.generateReclamacionPdf({ ...mailData, codigo, fecha: reclamacion.createdAt }).then((pdf) => {
      this.mail.sendReclamacionNotification(mailData, pdf);
      this.mail.sendReclamacionConstancia(mailData, pdf, codigo);
    });

    return { ...reclamacion, codigo };
  }

  listReclamaciones() {
    return this.prisma.reclamacion.findMany({ orderBy: { createdAt: 'desc' } });
  }

  updateReclamacion(id: number, data: any) {
    return this.prisma.reclamacion.update({ where: { id }, data });
  }

  // Contacto
  async createContacto(data: any) {
    if (!data?.nombre?.trim()) throw new BadRequestException('El nombre es obligatorio');
    if (!data?.correo?.trim()) throw new BadRequestException('El correo es obligatorio');
    if (!EMAIL_RE.test(data.correo.trim())) throw new BadRequestException('El correo no tiene un formato válido');
    if (!data?.mensaje?.trim()) throw new BadRequestException('El mensaje es obligatorio');
    if (data?.telefono?.trim() && !/^[\d\s+]+$/.test(data.telefono.trim())) {
      throw new BadRequestException('El teléfono solo puede contener números');
    }

    const contacto = await this.prisma.contacto.create({ data });
    const codigo = `CONTACTO-${String(contacto.id).padStart(6, '0')}`;
    const mailData = {
      nombre: contacto.nombre,
      correo: contacto.correo,
      telefono: contacto.telefono,
      asunto: contacto.asunto,
      mensaje: contacto.mensaje,
    };

    this.pdf.generateContactoPdf({ ...mailData, codigo, fecha: contacto.createdAt }).then((pdf) => {
      this.mail.sendContactoNotification(mailData, pdf);
      this.mail.sendContactoConstancia(mailData, pdf, codigo);
    });

    return { ...contacto, codigo };
  }

  listContactos() {
    return this.prisma.contacto.findMany({ orderBy: { createdAt: 'desc' } });
  }

  marcarLeido(id: number) {
    return this.prisma.contacto.update({ where: { id }, data: { leido: true } });
  }
}
