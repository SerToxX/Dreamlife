import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
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
}

const TIPOS_DOCUMENTO = ['DNI', 'CE', 'PASAPORTE', 'RUC'];

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private inventory: InventoryService,
    private mercadoPago: MercadoPagoService,
  ) {}

  // Validaciones + cálculo de precios compartidos entre el checkout directo
  // (YAPE/EFECTIVO) y la creación de preferencia (TARJETA vía Mercado Pago).
  // El precio SIEMPRE se calcula aquí, en el servidor (precio base + variante,
  // con el descuento de la campaña vigente si aplica) — nunca se confía en un
  // precio que venga del navegador.
  private async validarYCalcular(dto: QuickCheckoutDto) {
    if (!dto.items?.length) throw new BadRequestException('Sin items');

    if (!dto.nombreComprador?.trim()) throw new BadRequestException('El nombre del comprador es obligatorio');
    if (!dto.correoComprador?.trim()) throw new BadRequestException('El correo del comprador es obligatorio');
    if (!dto.telefonoComprador?.trim()) throw new BadRequestException('El teléfono del comprador es obligatorio');
    if (!dto.tipoDocumento || !TIPOS_DOCUMENTO.includes(dto.tipoDocumento)) throw new BadRequestException('Tipo de documento inválido');
    if (!dto.numeroDocumento?.trim()) throw new BadRequestException('El número de documento es obligatorio');
    if (!dto.direccionEnvio?.trim()) throw new BadRequestException('La dirección de envío es obligatoria');
    if (!dto.distrito?.trim()) throw new BadRequestException('El distrito es obligatorio');
    if (!dto.provincia?.trim()) throw new BadRequestException('La provincia es obligatoria');
    if (!dto.departamento?.trim()) throw new BadRequestException('El departamento es obligatorio');

    const itemIds = dto.items.map(i => Number(i.itemId));
    const items = await this.prisma.productoItem.findMany({
      where: { id: { in: itemIds } },
      include: { producto: true, variante: true, stocks: { orderBy: { cantidad: 'desc' } }, ofertaItems: { include: { oferta: true } } },
    });
    if (items.length !== itemIds.length) throw new BadRequestException('Algún producto no existe');

    for (const itemReq of dto.items) {
      const item = items.find(i => i.id === Number(itemReq.itemId));
      if (!item) continue;
      const totalStock = item.stocks.reduce((a, s) => a + s.cantidad, 0);
      if (totalStock < itemReq.cantidad) throw new BadRequestException(`Stock insuficiente para ${item.producto.nombre}`);
    }

    let descuentoTotal = 0;
    if (dto.cuponCodigo) {
      const cupon = await this.prisma.cupon.findUnique({ where: { codigo: dto.cuponCodigo } });
      if (!cupon || !cupon.activo) throw new BadRequestException('Cupón inválido');
      if (cupon.fechaFin && cupon.fechaFin < new Date()) throw new BadRequestException('Cupón expirado');
      descuentoTotal = Number(cupon.descuento);
    }

    let total = 0;
    const detallesData: { itemId: number; cantidad: number; precioBase: number; precioVendido: number }[] = [];
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

    const trustedOrder = { total };
    if (!Number.isFinite(trustedOrder.total) || trustedOrder.total <= 0) {
      throw new BadRequestException('Monto de pedido inválido');
    }

    return { detallesData, trustedOrder, descuentoTotal };
  }

  // Quick checkout: acepta items directamente (sin necesidad de carrito en BD)
  // clienteId siempre viene del JWT validado en el controller, nunca del body.
  // Confirma la venta de inmediato — solo para métodos sin pasarela (YAPE,
  // contraentrega). El pago con tarjeta pasa por crearPreferencia().
  async process(dto: QuickCheckoutDto, clienteId: number) {
    if (dto.metodoPago === 'TARJETA') {
      throw new BadRequestException('El pago con tarjeta se procesa a través de Mercado Pago — usa /checkout/preferencia');
    }

    const { detallesData, trustedOrder, descuentoTotal } = await this.validarYCalcular(dto);

    const venta = await this.prisma.$transaction(async (tx) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId,
          canal: 'ONLINE',
          estado: 'CONFIRMADA',
          total: trustedOrder.total,
          descuento: descuentoTotal,
          notas: dto.notaCliente,
          nombreComprador: dto.nombreComprador!.trim(),
          correoComprador: dto.correoComprador!.trim(),
          telefonoComprador: dto.telefonoComprador!.trim(),
          tipoDocumento: dto.tipoDocumento,
          numeroDocumento: dto.numeroDocumento!.trim(),
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

      await tx.pago.create({
        data: { ventaId: nuevaVenta.id, metodo: dto.metodoPago ?? 'EFECTIVO', monto: trustedOrder.total },
      });

      await tx.envio.create({
        data: {
          ventaId: nuevaVenta.id, tipo: 'DELIVERY', estado: 'PENDIENTE',
          direccion: dto.direccionEnvio!.trim(),
          distrito: dto.distrito!.trim(),
          provincia: dto.provincia!.trim(),
          departamento: dto.departamento!.trim(),
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

  // Checkout Pro: registra la venta como PENDIENTE (sin descontar stock
  // todavía) y crea la preferencia de pago. El comprador se redirige a
  // init_point; la venta se confirma después, cuando el pago esté aprobado
  // (ver confirmarPreferencia y confirmarPorPago).
  async crearPreferencia(dto: QuickCheckoutDto, clienteId: number) {
    const { detallesData, trustedOrder, descuentoTotal } = await this.validarYCalcular(dto);

    const venta = await this.prisma.$transaction(async (tx) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId,
          canal: 'ONLINE',
          estado: 'PENDIENTE',
          total: trustedOrder.total,
          descuento: descuentoTotal,
          notas: dto.notaCliente,
          nombreComprador: dto.nombreComprador!.trim(),
          correoComprador: dto.correoComprador!.trim(),
          telefonoComprador: dto.telefonoComprador!.trim(),
          tipoDocumento: dto.tipoDocumento,
          numeroDocumento: dto.numeroDocumento!.trim(),
        },
      });

      for (const det of detallesData) {
        // Sin stockId todavía — el stock recién se reserva/descuenta cuando
        // el pago quede aprobado (confirmarVentaAprobada).
        await tx.ventaDetalle.create({
          data: { ventaId: nuevaVenta.id, itemId: det.itemId, cantidad: det.cantidad, precioBase: det.precioBase, precioVendido: det.precioVendido },
        });
      }

      await tx.envio.create({
        data: {
          ventaId: nuevaVenta.id, tipo: 'DELIVERY', estado: 'PENDIENTE',
          direccion: dto.direccionEnvio!.trim(),
          distrito: dto.distrito!.trim(),
          provincia: dto.provincia!.trim(),
          departamento: dto.departamento!.trim(),
          referencia: dto.referencia?.trim() || null,
        },
      });

      return nuevaVenta;
    });

    // Crea la preferencia (Mercado Pago Preference) para esta venta pendiente.
    const preferencia = await this.mercadoPago.crearPreferencia(trustedOrder.total, String(venta.id));
    return { ventaId: venta.id, init_point: preferencia.init_point };
  }

  // Lo llama la página de retorno de Checkout Pro (/checkout/resultado).
  // Nunca confía en los query params con los que vuelve el navegador —
  // siempre busca el pago real en Mercado Pago por external_reference.
  async confirmarPreferencia(ventaId: number, clienteId: number) {
    const venta = await this.prisma.venta.findUnique({ where: { id: ventaId } });
    if (!venta || venta.clienteId !== clienteId) throw new NotFoundException('Pedido no encontrado');

    if (venta.estado !== 'PENDIENTE') {
      return { id: venta.id, estado: venta.estado, total: venta.total };
    }

    const pago = await this.mercadoPago.buscarPagoPorReferencia(String(ventaId));
    if (!pago) {
      // Mercado Pago aún no registra el pago — normal en los primeros
      // segundos tras el redirect; el frontend reintenta.
      return { id: venta.id, estado: 'PENDIENTE' as const, total: venta.total };
    }
    if (pago.status !== 'approved') {
      // Estado definitivo (rejected/cancelled) o en curso (pending/in_process)
      // reportado por Mercado Pago — el frontend lo muestra tal cual.
      return { id: venta.id, estado: 'PENDIENTE' as const, total: venta.total, pagoEstado: pago.status };
    }

    const confirmada = await this.confirmarVentaAprobada(ventaId, pago) ?? venta;
    return { id: confirmada.id, estado: confirmada.estado, total: confirmada.total };
  }

  // Lo llama el webhook cuando Mercado Pago notifica un pago aprobado — es
  // la vía confiable de confirmación (la vuelta del navegador puede no
  // llegar si el comprador cierra la pestaña).
  async confirmarPorPago(paymentId: string) {
    const pago = await this.mercadoPago.obtenerPago(paymentId);
    if (pago.status !== 'approved') return;
    const ventaId = Number(pago.external_reference);
    if (!Number.isFinite(ventaId)) return;
    await this.confirmarVentaAprobada(ventaId, pago);
  }

  // Transiciona PENDIENTE -> CONFIRMADA, descuenta stock y registra el pago.
  // El UPDATE condicionado a estado=PENDIENTE hace de lock optimista: si el
  // webhook y la vuelta del comprador llegan casi al mismo tiempo, solo uno
  // de los dos termina de confirmar y descontar stock.
  private async confirmarVentaAprobada(ventaId: number, pago: { id?: unknown; transaction_amount?: number }) {
    const venta = await this.prisma.venta.findUnique({ where: { id: ventaId }, include: { detalles: true } });
    if (!venta) {
      this.logger.error(`Pago ${pago.id} aprobado pero la venta ${ventaId} no existe`);
      return null;
    }
    if (venta.estado !== 'PENDIENTE') return venta;

    if (Math.abs(Number(pago.transaction_amount) - Number(venta.total)) > 0.01) {
      this.logger.error(`Pago ${pago.id} no coincide con el total de la venta ${ventaId} — no se confirma`);
      return venta;
    }

    let confirmada;
    try {
      confirmada = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.venta.updateMany({ where: { id: ventaId, estado: 'PENDIENTE' }, data: { estado: 'CONFIRMADA' } });
        if (count === 0) return null;

        for (const det of venta.detalles) {
          const splits = await this.inventory.decrementForSale(tx, {
            itemId: det.itemId, cantidad: det.cantidad, ventaId, usuarioId: null,
          });
          await tx.ventaDetalle.delete({ where: { id: det.id } });
          for (const split of splits) {
            await tx.ventaDetalle.create({
              data: { ventaId, itemId: det.itemId, stockId: split.stockId, cantidad: split.cantidad, precioBase: det.precioBase, precioVendido: det.precioVendido },
            });
          }
        }

        await tx.pago.create({ data: { ventaId, metodo: 'TARJETA', monto: venta.total, referencia: String(pago.id) } });
        if (venta.clienteId) {
          await tx.cliente.update({ where: { id: venta.clienteId }, data: { puntos: { increment: Math.floor(Number(venta.total)) } } });
        }
        return tx.venta.findUniqueOrThrow({ where: { id: ventaId } });
      });
    } catch (e) {
      // El pago ya se cobró en Mercado Pago — si esto falla (ej. se agotó el
      // stock entre la preferencia y la confirmación) la venta queda
      // PENDIENTE y hay que revisarla a mano (puede requerir reembolso).
      this.logger.error(`No se pudo confirmar la venta ${ventaId} tras el pago aprobado ${pago.id}: ${e}`);
      this.gateway.emitSync('payments', { alerta: 'pago_sin_stock', ventaId, paymentId: pago.id });
      return venta;
    }

    if (!confirmada) return venta; // otra llamada concurrente ya la confirmó

    this.gateway.emitSync('ventas', { origen: 'online', ventaId: confirmada.id, total: Number(confirmada.total) });
    this.gateway.emitSync('orders', { ventaId: confirmada.id });
    if (confirmada.clienteId) this.gateway.emitClienteSync(confirmada.clienteId, 'my-orders', { ventaId: confirmada.id });
    this.gateway.emitNewOrder({ id: confirmada.id, total: Number(confirmada.total) });

    return confirmada;
  }
}
