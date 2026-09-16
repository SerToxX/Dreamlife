import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.carrito.findUnique({ where: { id } });
  }

  // Obtener o crear carrito activo
  async getOrCreate(clienteId?: number, sessionId?: string) {
    if (!clienteId && !sessionId) throw new BadRequestException('Se requiere clienteId o sessionId');

    const where = clienteId ? { clienteId } : { sessionId };
    let carrito = await this.prisma.carrito.findFirst({
      where,
      include: {
        detalles: {
          include: {
            item: {
              include: {
                producto: true,
                variante: true,
                diseno: true,
                imagenes: { take: 1 },
                stocks: true,
              },
            },
          },
        },
      },
    });

    if (!carrito) {
      carrito = await this.prisma.carrito.create({
        data: clienteId ? { clienteId } : { sessionId },
        include: { detalles: { include: { item: { include: { producto: true, variante: true, diseno: true, imagenes: { take: 1 }, stocks: true } } } } },
      });
    }

    return this.enrichCart(carrito);
  }

  // Agregar item al carrito con reserva temporal
  async addItem(carritoId: number, itemId: number, cantidad: number) {
    // Verificar stock disponible
    const stocks = await this.prisma.stock.findMany({ where: { itemId } });
    const totalDisponible = stocks.reduce((a, s) => a + (s.cantidad - s.reservado), 0);
    if (totalDisponible < cantidad) throw new BadRequestException('Stock insuficiente');

    // Upsert el detalle
    const existing = await this.prisma.carritoDetalle.findFirst({
      where: { carritoId, itemId },
    });

    const expiraEn = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    if (existing) {
      return this.prisma.carritoDetalle.update({
        where: { id: existing.id },
        data: { cantidad, expiraEn },
        include: { item: { include: { producto: true } } },
      });
    }

    return this.prisma.carritoDetalle.create({
      data: { carritoId, itemId, cantidad, expiraEn },
      include: { item: { include: { producto: true } } },
    });
  }

  // Actualizar cantidad
  async updateItem(detalleId: number, cantidad: number) {
    if (cantidad <= 0) return this.removeItem(detalleId);
    return this.prisma.carritoDetalle.update({
      where: { id: detalleId },
      data: { cantidad },
    });
  }

  // Eliminar item
  async removeItem(detalleId: number) {
    return this.prisma.carritoDetalle.delete({ where: { id: detalleId } });
  }

  // Vaciar carrito
  async clear(carritoId: number) {
    await this.prisma.carritoDetalle.deleteMany({ where: { carritoId } });
    return { message: 'Carrito vaciado' };
  }

  private enrichCart(carrito: any) {
    const subtotal = carrito.detalles.reduce((acc: number, d: any) => {
      const precio = Number(d.item.producto.precioBase) + Number(d.item.variante?.precioExtra || 0);
      return acc + precio * d.cantidad;
    }, 0);
    return { ...carrito, subtotal };
  }
}
