import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

interface QuickCheckoutDto {
  items: { itemId: number; cantidad: number; precioUnitario?: number }[];
  metodoPago?: string;
  cuponCodigo?: string;
  // Datos del comprador (requeridos por la pasarela de pago para procesar el cargo)
  nombreComprador?: string;
  correoComprador?: string;
  telefonoComprador?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  // Dirección de envío
  direccionEnvio?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  referencia?: string;
  notaCliente?: string;
}

const TIPOS_DOCUMENTO = ['DNI', 'CE', 'PASAPORTE', 'RUC'];

@Injectable()
export class CheckoutService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  // Quick checkout: acepta items directamente (sin necesidad de carrito en BD)
  // clienteId siempre viene del JWT validado en el controller, nunca del body.
  async process(dto: QuickCheckoutDto, clienteId: number) {
    if (!dto.items?.length) throw new BadRequestException('Sin items');

    // Datos exigidos por la pasarela de pago (Izipay y similares) para procesar el cargo
    if (!dto.nombreComprador?.trim()) throw new BadRequestException('El nombre del comprador es obligatorio');
    if (!dto.correoComprador?.trim()) throw new BadRequestException('El correo del comprador es obligatorio');
    if (!dto.telefonoComprador?.trim()) throw new BadRequestException('El teléfono del comprador es obligatorio');
    if (!dto.tipoDocumento || !TIPOS_DOCUMENTO.includes(dto.tipoDocumento)) throw new BadRequestException('Tipo de documento inválido');
    if (!dto.numeroDocumento?.trim()) throw new BadRequestException('El número de documento es obligatorio');
    if (!dto.direccionEnvio?.trim()) throw new BadRequestException('La dirección de envío es obligatoria');
    if (!dto.distrito?.trim()) throw new BadRequestException('El distrito es obligatorio');
    if (!dto.provincia?.trim()) throw new BadRequestException('La provincia es obligatoria');
    if (!dto.departamento?.trim()) throw new BadRequestException('El departamento es obligatorio');

    // Cargar items y validar stock
    const itemIds = dto.items.map(i => Number(i.itemId));
    const items = await this.prisma.productoItem.findMany({
      where: { id: { in: itemIds } },
      include: { producto: true, variante: true, stocks: { orderBy: { cantidad: 'desc' } }, ofertaItems: { include: { oferta: true } } },
    });
    if (items.length !== itemIds.length) throw new BadRequestException('Algún producto no existe');

    // Validar stock
    for (const itemReq of dto.items) {
      const item = items.find(i => i.id === Number(itemReq.itemId));
      if (!item) continue;
      const total = item.stocks.reduce((a, s) => a + s.cantidad, 0);
      if (total < itemReq.cantidad) throw new BadRequestException(`Stock insuficiente para ${item.producto.nombre}`);
    }

    // Aplicar cupón
    let descuentoTotal = 0;
    if (dto.cuponCodigo) {
      const cupon = await this.prisma.cupon.findUnique({ where: { codigo: dto.cuponCodigo } });
      if (!cupon || !cupon.activo) throw new BadRequestException('Cupón inválido');
      if (cupon.fechaFin && cupon.fechaFin < new Date()) throw new BadRequestException('Cupón expirado');
      descuentoTotal = Number(cupon.descuento);
    }

    // Calcular total — el precio SIEMPRE se calcula en el servidor (precio base + variante,
    // con el descuento de la campaña vigente si aplica). Nunca se confía en un precio que
    // venga del navegador, para que no se pueda manipular la petición y pagar menos.
    let total = 0;
    const detallesData: any[] = [];
    const ahora = new Date();
    for (const req of dto.items) {
      const item = items.find(i => i.id === Number(req.itemId))!;
      const precioBase = Number(item.producto.precioBase) + Number(item.variante?.precioExtra || 0);
      const ofertaVigente = item.ofertaItems
        .map((oi) => oi.oferta)
        .find((o) => o.activa && o.fechaInicio <= ahora && ahora <= o.fechaFin);
      const precio = ofertaVigente
        ? Math.max(0, ofertaVigente.tipoDescuento === 'PORCENTAJE'
            ? precioBase * (1 - Number(ofertaVigente.valor) / 100)
            : precioBase - Number(ofertaVigente.valor))
        : precioBase;
      total += precio * req.cantidad;
      detallesData.push({ itemId: item.id, cantidad: req.cantidad, precioBase, precioVendido: precio });
    }
    total = Math.max(0, total - descuentoTotal);

    // Transacción
    const venta = await this.prisma.$transaction(async (tx) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId,
          canal: 'ONLINE',
          estado: 'CONFIRMADA',
          total,
          descuento: descuentoTotal,
          notas: dto.notaCliente,
          nombreComprador: dto.nombreComprador.trim(),
          correoComprador: dto.correoComprador.trim(),
          telefonoComprador: dto.telefonoComprador.trim(),
          tipoDocumento: dto.tipoDocumento,
          numeroDocumento: dto.numeroDocumento.trim(),
        },
      });

      for (const det of detallesData) {
        await tx.ventaDetalle.create({ data: { ventaId: nuevaVenta.id, ...det } });
        // Decrementar stock
        const item = items.find(i => i.id === det.itemId)!;
        const stock = item.stocks.find(s => s.cantidad >= det.cantidad);
        if (stock) {
          await tx.stock.update({ where: { id: stock.id }, data: { cantidad: { decrement: det.cantidad } } });
        }
      }

      // Pago único
      await tx.pago.create({
        data: { ventaId: nuevaVenta.id, metodo: dto.metodoPago ?? 'EFECTIVO', monto: total },
      });

      await tx.envio.create({
        data: {
          ventaId: nuevaVenta.id, tipo: 'DELIVERY', estado: 'PENDIENTE',
          direccion: dto.direccionEnvio.trim(),
          distrito: dto.distrito.trim(),
          provincia: dto.provincia.trim(),
          departamento: dto.departamento.trim(),
          referencia: dto.referencia?.trim() || null,
        },
      });

      // Siempre hay cliente (checkout anónimo ya no está permitido)
      await tx.cliente.update({ where: { id: clienteId }, data: { puntos: { increment: Math.floor(total) } } });

      return nuevaVenta;
    });

    this.gateway.emitSync('ventas', { origen: 'online', ventaId: venta.id, total: Number(venta.total) });
    this.gateway.emitSync('orders', { ventaId: venta.id });
    this.gateway.emitClienteSync(clienteId, 'my-orders', { ventaId: venta.id });
    this.gateway.emitNewOrder({ id: venta.id, total: Number(venta.total) });

    return { id: venta.id, ventaId: venta.id, total: venta.total, message: '¡Pedido procesado con éxito!' };
  }
}
