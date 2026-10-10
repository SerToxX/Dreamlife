import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { InventoryService } from '../inventory/inventory.service';
import { MercadoPagoService } from '../payments/mercadopago.service';

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
  // Salida del Payment Brick de Mercado Pago — solo cuando metodoPago === 'TARJETA'
  mercadoPagoFormData?: {
    token: string;
    issuer_id?: string;
    installments: number;
    payment_method_id: string;
    payer: { email: string; identification?: { type: string; number: string } };
  };
}

const TIPOS_DOCUMENTO = ['DNI', 'CE', 'PASAPORTE', 'RUC'];

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private inventory: InventoryService,
    private mercadoPago: MercadoPagoService,
  ) {}

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

    // Monto de cobro: siempre derivado de datos de confianza del servidor
    // (carrito cargado de la BD + precios recalculados), nunca del monto
    // que reporte el navegador o el Brick.
    const trustedOrder = { total };
    if (!Number.isFinite(trustedOrder.total) || trustedOrder.total <= 0) {
      throw new BadRequestException('Monto de pedido inválido');
    }

    // Pago con tarjeta vía Mercado Pago (Payment Brick): se cobra ANTES de
    // crear la venta y descontar stock — si el pago no se aprueba, no se
    // crea ningún pedido. El id del pago queda trazado en Pago.referencia.
    let mpPaymentId: string | undefined;
    if (dto.metodoPago === 'TARJETA') {
      if (!dto.mercadoPagoFormData) throw new BadRequestException('Faltan los datos de pago de la tarjeta');
      const externalReference = randomUUID();
      const pago = await this.mercadoPago.crearPago(dto.mercadoPagoFormData, trustedOrder.total, externalReference);
      if (pago.status !== 'approved') {
        throw new BadRequestException(`Pago no aprobado (${pago.status_detail ?? pago.status}). Intenta con otra tarjeta.`);
      }
      mpPaymentId = String(pago.id);
    }

    // Transacción
    const venta = await this.prisma.$transaction(async (tx) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId,
          canal: 'ONLINE',
          estado: 'CONFIRMADA',
          total: trustedOrder.total,
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
        // Descuenta el stock (prioriza la ubicación online, reparte entre
        // varias si ninguna alcanza sola) y deja una línea de venta por cada
        // ubicación de la que salió, para poder rastrear después de dónde
        // salió cada unidad vendida.
        const splits = await this.inventory.decrementForSale(tx, {
          itemId: det.itemId, cantidad: det.cantidad, ventaId: nuevaVenta.id, usuarioId: null,
        });
        for (const split of splits) {
          await tx.ventaDetalle.create({
            data: {
              ventaId: nuevaVenta.id, itemId: det.itemId, stockId: split.stockId,
              cantidad: split.cantidad, precioBase: det.precioBase, precioVendido: det.precioVendido,
            },
          });
        }
      }

      // Pago único
      await tx.pago.create({
        data: { ventaId: nuevaVenta.id, metodo: dto.metodoPago ?? 'EFECTIVO', monto: trustedOrder.total, referencia: mpPaymentId },
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
      await tx.cliente.update({ where: { id: clienteId }, data: { puntos: { increment: Math.floor(trustedOrder.total) } } });

      return nuevaVenta;
    });

    this.gateway.emitSync('ventas', { origen: 'online', ventaId: venta.id, total: Number(venta.total) });
    this.gateway.emitSync('orders', { ventaId: venta.id });
    this.gateway.emitClienteSync(clienteId, 'my-orders', { ventaId: venta.id });
    this.gateway.emitNewOrder({ id: venta.id, total: Number(venta.total) });

    return { id: venta.id, ventaId: venta.id, total: venta.total, message: '¡Pedido procesado con éxito!' };
  }
}
