import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway, private inventory: InventoryService) {}

  async openCaja(usuarioId: number, ubicacionId: number, montoInicial: number) {
    if (!ubicacionId) throw new BadRequestException('Selecciona un local para abrir caja');
    const existing = await this.prisma.caja.findFirst({ where: { usuarioId, estado: 'ABIERTA' } });
    if (existing) throw new BadRequestException('Ya tienes una caja abierta');
    return this.prisma.caja.create({ data: { usuarioId, ubicacionId, montoInicial: montoInicial || 0, estado: 'ABIERTA' } });
  }

  async closeCaja(cajaId: number, montoFinal: number) {
    const caja = await this.prisma.caja.findUnique({ where: { id: cajaId } });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    if (caja.estado === 'CERRADA') throw new BadRequestException('La caja ya está cerrada');
    return this.prisma.caja.update({ where: { id: cajaId }, data: { estado: 'CERRADA', montoFinal: montoFinal || 0, fechaCierre: new Date() } });
  }

  async getCajaAbierta(usuarioId: number) {
    return this.prisma.caja.findFirst({ where: { usuarioId, estado: 'ABIERTA' }, include: { ubicacion: true } });
  }

  async sale(dto: { cajaId: number; items: { itemId: number; cantidad: number; precio: number }[]; pagos: { metodo: string; monto: number }[]; clienteId?: number; descuento?: number; usuarioId: number }) {
    if (!dto.cajaId) throw new BadRequestException('No tienes una caja abierta. Ábrela antes de vender.');
    if (!dto.items?.length) throw new BadRequestException('Agrega al menos un producto a la venta');

    const caja = await this.prisma.caja.findUnique({ where: { id: dto.cajaId } });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    if (caja.estado !== 'ABIERTA') throw new BadRequestException('Caja no disponible');
    if (caja.usuarioId !== dto.usuarioId) throw new BadRequestException('Esta caja no te pertenece');

    // Validar stock disponible antes de confirmar la venta
    for (const item of dto.items) {
      const stock = await this.prisma.stock.findFirst({ where: { itemId: item.itemId, ubicacionId: caja.ubicacionId } });
      const disponible = stock ? stock.cantidad - stock.reservado : 0;
      if (disponible < item.cantidad) {
        const producto = await this.prisma.productoItem.findUnique({ where: { id: item.itemId }, include: { producto: true } });
        throw new BadRequestException(`Stock insuficiente para "${producto?.producto?.nombre ?? 'producto'}" (disponible: ${Math.max(disponible, 0)})`);
      }
    }

    const total = dto.items.reduce((a, i) => a + i.precio * i.cantidad, 0) - (dto.descuento || 0);

    const venta = await this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: { usuarioId: dto.usuarioId, clienteId: dto.clienteId, cajaId: dto.cajaId, ubicacionId: caja.ubicacionId, canal: 'TIENDA', estado: 'ENTREGADO', total, descuento: dto.descuento || 0 },
      });
      for (const item of dto.items) {
        // Venta presencial: el stock sale únicamente de la ubicación de la
        // caja abierta (no tiene sentido descontarle a otra tienda).
        const splits = await this.inventory.decrementForSale(tx, {
          itemId: item.itemId, cantidad: item.cantidad, ventaId: venta.id,
          usuarioId: dto.usuarioId, ubicacionId: caja.ubicacionId,
        });
        for (const split of splits) {
          await tx.ventaDetalle.create({
            data: {
              ventaId: venta.id, itemId: item.itemId, stockId: split.stockId,
              cantidad: split.cantidad, precioBase: item.precio, precioVendido: item.precio,
            },
          });
        }
      }
      for (const pago of dto.pagos) {
        await tx.pago.create({ data: { ventaId: venta.id, metodo: pago.metodo, monto: pago.monto } });
      }
      return venta;
    });

    // Avisa a todos los paneles admin conectados (finanzas, reportes, otros POS) que hay data nueva
    this.gateway.emitSync('ventas', { origen: 'pos', ventaId: venta.id, total: Number(venta.total) });
    return venta;
  }

  getCajas(usuarioId?: number) {
    return this.prisma.caja.findMany({
      where: usuarioId ? { usuarioId } : {},
      include: {
        usuario: { select: { nombre: true } },
        ubicacion: { select: { nombre: true } },
        ventas: { select: { total: true } },
      },
      orderBy: { fechaApertura: 'desc' },
      take: 50,
    }).then((cajas) =>
      cajas.map((c) => {
        const totalVendido = c.ventas.reduce((a, v) => a + Number(v.total), 0);
        const esperado = Number(c.montoInicial) + totalVendido;
        const { ventas, ...rest } = c;
        return {
          ...rest,
          totalVendido,
          cantidadVentas: ventas.length,
          esperado,
          diferencia: c.estado === 'CERRADA' && c.montoFinal != null ? Number(c.montoFinal) - esperado : null,
        };
      }),
    );
  }
}

