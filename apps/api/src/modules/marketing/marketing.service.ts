import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class MarketingService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  // "Ofertas activas" (público) debe respetar tanto `activa` como el rango de
  // fechas — antes solo miraba `activa`, así que una campaña ya vencida seguía
  // apareciendo con su badge de descuento aunque el precio ya no lo aplicara
  // (el cálculo del precio sí revisa fechas), dando la sensación de que el
  // descuento "no funcionaba".
  getOfertas() {
    const ahora = new Date();
    return this.prisma.oferta.findMany({
      where: { activa: true, fechaInicio: { lte: ahora }, fechaFin: { gte: ahora } },
      include: { items: { include: { item: { include: { producto: { include: { imagenes: { take: 1 } } }, variante: true } } } } },
    });
  }

  // Admin: todas las campañas (incluye inactivas/vencidas) para poder gestionarlas.
  getOfertasAdmin() {
    return this.prisma.oferta.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: { items: { include: { item: { include: { producto: { include: { imagenes: { take: 1 } } } } } } } },
    });
  }

  async createOferta(body: any) {
    if (!body?.nombre || body?.valor == null) throw new BadRequestException('Nombre y valor son obligatorios');
    const oferta = await this.prisma.oferta.create({
      data: {
        nombre: body.nombre,
        tipoDescuento: body.tipoDescuento ?? 'PORCENTAJE',
        valor: Number(body.valor),
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : new Date(),
        fechaFin: this.finDeDia(body.fechaFin) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        activa: body.activa ?? true,
      },
    });
    this.gateway.emitSync('ofertas', { id: oferta.id });
    this.gateway.emitPublicSync('ofertas', { id: oferta.id });
    return oferta;
  }

  // Si la fecha viene sin hora (ej. del <input type="date"> del admin: "2026-08-15"),
  // JS la interpreta como medianoche UTC de ese día — eso hacía que una campaña con
  // fecha de fin "hoy" apareciera vencida durante casi todo el día. Se fuerza al
  // final del día para que la campaña siga vigente hasta el final de la fecha elegida.
  private finDeDia(fecha?: string): Date | null {
    if (!fecha) return null;
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
    return new Date(soloFecha ? `${fecha}T23:59:59` : fecha);
  }

  async updateOferta(id: number, body: any) {
    const data: any = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.tipoDescuento !== undefined) data.tipoDescuento = body.tipoDescuento;
    if (body.valor !== undefined) data.valor = Number(body.valor);
    if (body.fechaInicio !== undefined) data.fechaInicio = new Date(body.fechaInicio);
    if (body.fechaFin !== undefined) data.fechaFin = this.finDeDia(body.fechaFin);
    if (body.activa !== undefined) data.activa = body.activa;
    const oferta = await this.prisma.oferta.update({ where: { id }, data });
    this.gateway.emitSync('ofertas', { id });
    this.gateway.emitPublicSync('ofertas', { id });
    this.gateway.emitPublicSync('productos');
    return oferta;
  }

  async deleteOferta(id: number) {
    await this.prisma.$transaction([
      this.prisma.ofertaItem.deleteMany({ where: { ofertaId: id } }),
      this.prisma.oferta.delete({ where: { id } }),
    ]);
    this.gateway.emitSync('ofertas', { id });
    this.gateway.emitPublicSync('ofertas', { id });
    this.gateway.emitPublicSync('productos');
    return { ok: true };
  }

  // ── Productos dentro de una campaña ──
  async addOfertaItems(ofertaId: number, itemIds: number[]) {
    if (!itemIds?.length) throw new BadRequestException('Selecciona al menos un producto');
    await this.prisma.ofertaItem.createMany({
      data: itemIds.map((itemId) => ({ ofertaId, itemId: Number(itemId) })),
      skipDuplicates: true,
    });
    this.gateway.emitSync('ofertas', { id: ofertaId });
    this.gateway.emitPublicSync('ofertas', { id: ofertaId });
    this.gateway.emitPublicSync('productos');
    return this.prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { items: { include: { item: { include: { producto: true } } } } },
    });
  }

  async removeOfertaItem(ofertaId: number, itemId: number) {
    await this.prisma.ofertaItem.delete({ where: { ofertaId_itemId: { ofertaId, itemId } } });
    this.gateway.emitSync('ofertas', { id: ofertaId });
    this.gateway.emitPublicSync('ofertas', { id: ofertaId });
    this.gateway.emitPublicSync('productos');
    return { ok: true };
  }

  getCupones() { return this.prisma.cupon.findMany({ where: { activo: true } }); }

  // OJO: el formulario del admin manda `tipoDescuento` y `limiteUsos`, pero en el
  // modelo Cupon esos campos se llaman `tipo` y `maxUsos` — antes se pasaban tal
  // cual a Prisma y fallaban silenciosamente (Prisma rechaza campos desconocidos
  // y `tipo`, que es obligatorio, nunca llegaba). Se mapean explícitamente acá.
  async createCupon(body: any) {
    if (!body?.codigo || body?.descuento == null) throw new BadRequestException('Código y descuento son obligatorios');
    const cupon = await this.prisma.cupon.create({
      data: {
        codigo: String(body.codigo).toUpperCase(),
        tipo: body.tipoDescuento ?? body.tipo ?? 'PORCENTAJE',
        descuento: Number(body.descuento),
        maxUsos: body.limiteUsos != null && body.limiteUsos !== '' ? Number(body.limiteUsos) : (body.maxUsos != null ? Number(body.maxUsos) : null),
        activo: body.activo ?? true,
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
      },
    });
    this.gateway.emitSync('cupones', { id: cupon.id });
    return cupon;
  }

  validateCupon(codigo: string) { return this.prisma.cupon.findUnique({ where: { codigo } }); }
}
