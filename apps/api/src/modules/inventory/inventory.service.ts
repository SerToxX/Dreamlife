import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  async getStock(ubicacionId?: number) {
    const where: any = {};
    if (ubicacionId) where.ubicacionId = ubicacionId;
    const stocks = await this.prisma.stock.findMany({
      where,
      include: { item: { include: { producto: { include: { imagenes: { take: 1, orderBy: { orden: 'asc' } } } }, variante: true, diseno: true } }, ubicacion: true },
      orderBy: { id: 'asc' },
    });
    return stocks.map(s => ({
      ...s,
      disponible: s.cantidad - s.reservado,
      alerta: s.cantidad === 0 ? 'ROJO' : s.cantidad <= 5 ? 'AMARILLO' : 'VERDE',
    }));
  }

  // Ajuste: acepta stockId O (itemId + ubicacionId)
  async adjust(dto: { stockId?: number; itemId?: number; ubicacionId?: number; tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'; cantidad: number; motivo?: string; usuarioId?: number }) {
    let stock: any = null;
    if (dto.stockId) {
      stock = await this.prisma.stock.findUnique({ where: { id: Number(dto.stockId) } });
    } else if (dto.itemId && dto.ubicacionId) {
      stock = await this.prisma.stock.findUnique({
        where: { itemId_ubicacionId: { itemId: Number(dto.itemId), ubicacionId: Number(dto.ubicacionId) } },
      });
      if (!stock) {
        stock = await this.prisma.stock.create({
          data: { itemId: Number(dto.itemId), ubicacionId: Number(dto.ubicacionId), cantidad: 0 },
        });
      }
    } else {
      throw new BadRequestException('Debes enviar stockId o (itemId + ubicacionId)');
    }

    if (!stock) throw new BadRequestException('Stock no encontrado');

    const cantidad = Number(dto.cantidad);
    if (isNaN(cantidad) || cantidad < 0) throw new BadRequestException('Cantidad inválida');

    let nuevaCantidad: number;
    if (dto.tipo === 'ENTRADA') nuevaCantidad = stock.cantidad + cantidad;
    else if (dto.tipo === 'SALIDA') nuevaCantidad = stock.cantidad - cantidad;
    else nuevaCantidad = cantidad; // AJUSTE = setea valor absoluto

    if (nuevaCantidad < 0) throw new BadRequestException('Stock insuficiente');

    const [updatedStock, ajuste] = await this.prisma.$transaction([
      this.prisma.stock.update({ where: { id: stock.id }, data: { cantidad: nuevaCantidad } }),
      this.prisma.ajusteStock.create({
        data: {
          stockId: stock.id,
          usuarioId: dto.usuarioId ?? 1,
          tipo: dto.tipo,
          cantidad: cantidad,
          motivo: dto.motivo ?? 'Ajuste manual',
        },
      }),
    ]);

    this.gateway.emitSync('inventario', { stockId: stock.id });
    return { stock: updatedStock, ajuste };
  }

  async transfer(dto: { itemId: number; origenId: number; destinoId: number; cantidad: number; usuarioId: number }) {
    const origen = await this.prisma.stock.findUnique({
      where: { itemId_ubicacionId: { itemId: Number(dto.itemId), ubicacionId: Number(dto.origenId) } },
    });
    if (!origen || origen.cantidad < dto.cantidad) throw new BadRequestException('Stock insuficiente en origen');

    await this.prisma.$transaction([
      this.prisma.stock.update({ where: { id: origen.id }, data: { cantidad: { decrement: Number(dto.cantidad) } } }),
      this.prisma.stock.upsert({
        where: { itemId_ubicacionId: { itemId: Number(dto.itemId), ubicacionId: Number(dto.destinoId) } },
        update: { cantidad: { increment: Number(dto.cantidad) } },
        create: { itemId: Number(dto.itemId), ubicacionId: Number(dto.destinoId), cantidad: Number(dto.cantidad) },
      }),
      this.prisma.movimientoStock.create({
        data: {
          itemId: Number(dto.itemId),
          origenId: Number(dto.origenId),
          destinoId: Number(dto.destinoId),
          cantidad: Number(dto.cantidad),
          tipo: 'TRANSFERENCIA',
          usuarioId: dto.usuarioId,
        },
      }),
    ]);
    this.gateway.emitSync('inventario', { itemId: dto.itemId });
    return { message: 'Transferencia exitosa' };
  }

  async getAlerts() {
    const stocks = await this.prisma.stock.findMany({
      where: { cantidad: { lte: 10 } },
      include: { item: { include: { producto: true } }, ubicacion: true },
    });
    return stocks.map(s => ({
      ...s,
      alerta: s.cantidad === 0 ? 'ROJO' : s.cantidad <= 5 ? 'AMARILLO' : 'VERDE',
    }));
  }

  async getHistory(itemId?: number) {
    const [movimientos, ajustes] = await Promise.all([
      this.prisma.movimientoStock.findMany({
        where: itemId ? { itemId } : {},
        include: { origen: true, destino: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.ajusteStock.findMany({
        where: itemId ? { stock: { itemId } } : {},
        include: {
          usuario: { select: { nombre: true } },
          stock: { include: { item: { include: { producto: true } }, ubicacion: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // MovimientoStock no tiene relación directa a ProductoItem (solo itemId),
    // así que resolvemos los nombres de producto con una consulta aparte.
    const itemIds = [...new Set(movimientos.map((m) => m.itemId))];
    const items = itemIds.length
      ? await this.prisma.productoItem.findMany({ where: { id: { in: itemIds } }, include: { producto: true } })
      : [];
    const itemsById = new Map<number, (typeof items)[number]>(items.map((it) => [it.id, it]));

    const movFmt = movimientos.map((m) => ({
      id: `mov-${m.id}`,
      tipo: 'TRANSFERENCIA',
      cantidad: m.cantidad,
      producto: itemsById.get(m.itemId)?.producto?.nombre ?? null,
      sku: itemsById.get(m.itemId)?.codigoSku ?? null,
      origen: m.origen?.nombre ?? null,
      destino: m.destino?.nombre ?? null,
      usuario: null as string | null,
      motivo: null as string | null,
      createdAt: m.createdAt,
    }));

    const ajFmt = ajustes.map((a) => ({
      id: `aj-${a.id}`,
      tipo: a.tipo,
      cantidad: a.cantidad,
      producto: a.stock?.item?.producto?.nombre ?? null,
      sku: a.stock?.item?.codigoSku ?? null,
      origen: null as string | null,
      destino: a.stock?.ubicacion?.nombre ?? null,
      usuario: a.usuario?.nombre ?? null,
      motivo: a.motivo,
      createdAt: a.createdAt,
    }));

    return [...movFmt, ...ajFmt]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);
  }

  getUbicaciones(includeInactive = false) {
    return this.prisma.ubicacion.findMany({
      where: includeInactive ? {} : { activa: true },
      orderBy: { id: 'asc' },
    });
  }

  // ── CRUD Ubicaciones ──
  async createUbicacion(data: { nombre: string; tipo?: string; ciudad?: string }) {
    const ubicacion = await this.prisma.ubicacion.create({
      data: {
        nombre: data.nombre,
        tipo: (data.tipo as any) ?? 'tienda',
        ciudad: data.ciudad,
        activa: true,
      },
    });
    this.gateway.emitSync('ubicaciones');
    return ubicacion;
  }

  async updateUbicacion(id: number, data: any) {
    const { nombre, tipo, ciudad, activa } = data;
    const ubicacion = await this.prisma.ubicacion.update({ where: { id }, data: { nombre, tipo, ciudad, activa } });
    this.gateway.emitSync('ubicaciones', { id });
    return ubicacion;
  }

  async deleteUbicacion(id: number) {
    // Soft delete (marcar inactiva si tiene stocks)
    const count = await this.prisma.stock.count({ where: { ubicacionId: id } });
    const result = count > 0
      ? await this.prisma.ubicacion.update({ where: { id }, data: { activa: false } })
      : await this.prisma.ubicacion.delete({ where: { id } });
    this.gateway.emitSync('ubicaciones', { id });
    return result;
  }

  // Setear stock directo (para nuevos productos)
  async setStock(itemId: number, ubicacionId: number, cantidad: number) {
    const stock = await this.prisma.stock.upsert({
      where: { itemId_ubicacionId: { itemId, ubicacionId } },
      update: { cantidad },
      create: { itemId, ubicacionId, cantidad },
    });
    this.gateway.emitSync('inventario', { itemId });
    return stock;
  }

}
