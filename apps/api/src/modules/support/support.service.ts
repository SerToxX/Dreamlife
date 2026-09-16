import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  // Libro de reclamaciones — campos exigidos por el Código de Protección y
  // Defensa del Consumidor (Ley 29571) y su reglamento (D.S. 011-2011-PCM)
  // para la Hoja de Reclamación: identificación del consumidor (con domicilio
  // y documento), identificación del bien contratado, detalle de los hechos
  // y el pedido concreto del consumidor (distinto de la descripción).
  createReclamacion(body: any) {
    if (!body?.nombre?.trim()) throw new BadRequestException('El nombre es obligatorio');
    if (!body?.documento?.trim()) throw new BadRequestException('El documento de identidad es obligatorio');
    if (!body?.correo?.trim()) throw new BadRequestException('El correo es obligatorio');
    if (!body?.direccion?.trim()) throw new BadRequestException('El domicilio es obligatorio');
    if (!body?.descripcion?.trim()) throw new BadRequestException('El detalle de los hechos es obligatorio');
    if (!body?.pedido?.trim()) throw new BadRequestException('El pedido del consumidor es obligatorio');
    if (body?.menorEdad && !body?.apoderadoNombre?.trim()) throw new BadRequestException('Si el reclamante es menor de edad, se requiere el nombre del apoderado');

    return this.prisma.reclamacion.create({
      data: {
        tipo: body.tipo === 'QUEJA' ? 'QUEJA' : 'RECLAMO',
        nombre: body.nombre.trim(),
        tipoDocumento: body.tipoDocumento ?? 'DNI',
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
    if (!data?.mensaje?.trim()) throw new BadRequestException('El mensaje es obligatorio');

    const contacto = await this.prisma.contacto.create({ data });
    this.mail.sendContactoNotification({
      nombre: data.nombre,
      correo: data.correo,
      telefono: data.telefono,
      asunto: data.asunto,
      mensaje: data.mensaje,
    });
    return contacto;
  }

  listContactos() {
    return this.prisma.contacto.findMany({ orderBy: { createdAt: 'desc' } });
  }

  marcarLeido(id: number) {
    return this.prisma.contacto.update({ where: { id }, data: { leido: true } });
  }
}
