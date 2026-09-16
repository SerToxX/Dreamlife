import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  getSales(from: Date, to: Date) {
    return this.prisma.venta.findMany({
      where: { createdAt: { gte: from, lte: to }, estado: { notIn: ['CANCELADO'] } },
      include: { cliente: true, detalles: { include: { item: { include: { producto: true } } } }, pagos: true, ubicacion: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTopProducts(from?: Date, to?: Date, limit = 10) {
    const where: any = {};
    if (from || to) where.venta = { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } };
    const grouped = await this.prisma.ventaDetalle.groupBy({
      by: ['itemId'], where, _sum: { cantidad: true, precioVendido: true },
      orderBy: { _sum: { cantidad: 'desc' } }, take: limit,
    });
    return Promise.all(grouped.map(async (g) => {
      const item = await this.prisma.productoItem.findUnique({ where: { id: g.itemId }, include: { producto: true } });
      return { item, unidades: g._sum.cantidad, ingresos: Number(g._sum.precioVendido ?? 0) };
    }));
  }

  async getSalesByLocation(from?: Date, to?: Date) {
    const grouped = await this.prisma.venta.groupBy({
      by: ['ubicacionId'],
      where: {
        estado: { notIn: ['CANCELADO', 'PENDIENTE'] },
        ...(from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } },
      },
      _sum: { total: true }, _count: true,
    });
    return Promise.all(grouped.map(async (g) => {
      const ubicacion = g.ubicacionId ? await this.prisma.ubicacion.findUnique({ where: { id: g.ubicacionId } }) : null;
      return { ubicacionId: g.ubicacionId, nombre: ubicacion?.nombre ?? 'Online', total: Number(g._sum.total ?? 0), cantidad: g._count };
    }));
  }

  async getSalesByChannel(from?: Date, to?: Date) {
    const grouped = await this.prisma.venta.groupBy({
      by: ['canal'],
      where: {
        estado: { notIn: ['CANCELADO', 'PENDIENTE'] },
        ...(from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } },
      },
      _sum: { total: true }, _count: true,
    });
    const LABEL: Record<string, string> = { ONLINE: 'Online', TIENDA: 'Tienda', EVENTO: 'Evento' };
    return grouped
      .map((g) => ({ canal: g.canal, nombre: LABEL[g.canal] ?? g.canal, total: Number(g._sum.total ?? 0), cantidad: g._count }))
      .sort((a, b) => b.total - a.total);
  }

  async getFinancialChart(from: Date, to: Date) {
    const data: any[] = [];
    const cur = new Date(from); cur.setHours(0, 0, 0, 0);
    const end = new Date(to); end.setHours(23, 59, 59, 999);
    while (cur <= end) {
      const dStart = new Date(cur);
      const dEnd = new Date(cur); dEnd.setDate(dEnd.getDate() + 1);
      const [v, g, im] = await Promise.all([
        this.prisma.venta.aggregate({
          where: { createdAt: { gte: dStart, lt: dEnd }, estado: { notIn: ['CANCELADO', 'PENDIENTE'] } },
          _sum: { total: true }, _count: true,
        }),
        this.prisma.gasto.aggregate({
          where: { fecha: { gte: dStart, lt: dEnd } },
          _sum: { monto: true },
        }),
        this.prisma.ingreso.aggregate({
          where: { fecha: { gte: dStart, lt: dEnd } },
          _sum: { monto: true },
        }),
      ]);
      data.push({
        fecha: dStart.toISOString().split('T')[0],
        ingresos: Number(v._sum.total ?? 0) + Number(im._sum.monto ?? 0),
        egresos: Number(g._sum.monto ?? 0),
        cantidad: v._count,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return data;
  }

  async getExpensesByCategory(from: Date, to: Date) {
    const grouped = await this.prisma.gasto.groupBy({
      by: ['categoria'],
      where: { fecha: { gte: from, lte: to } },
      _sum: { monto: true }, _count: true,
    });
    return grouped.map((g) => ({ categoria: g.categoria ?? 'Sin categoría', monto: Number(g._sum.monto ?? 0), cantidad: g._count }))
      .sort((a, b) => b.monto - a.monto);
  }

  async getSummary(from: Date, to: Date) {
    const [v, g, im] = await Promise.all([
      this.prisma.venta.aggregate({
        where: { createdAt: { gte: from, lte: to }, estado: { notIn: ['CANCELADO', 'PENDIENTE'] } },
        _sum: { total: true }, _count: true,
      }),
      this.prisma.gasto.aggregate({
        where: { fecha: { gte: from, lte: to } },
        _sum: { monto: true }, _count: true,
      }),
      this.prisma.ingreso.aggregate({
        where: { fecha: { gte: from, lte: to } },
        _sum: { monto: true },
      }),
    ]);
    const ingresos = Number(v._sum.total ?? 0) + Number(im._sum.monto ?? 0);
    const egresos = Number(g._sum.monto ?? 0);
    return {
      ingresos, egresos, gananciaNeta: ingresos - egresos,
      ventasCantidad: v._count, gastosCantidad: g._count,
      ticketPromedio: v._count > 0 ? ingresos / v._count : 0,
      margenPorcentaje: ingresos > 0 ? ((ingresos - egresos) / ingresos) * 100 : 0,
    };
  }
}
