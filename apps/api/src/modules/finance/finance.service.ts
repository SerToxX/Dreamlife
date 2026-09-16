import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  // ── Helpers ──
  private buildFechaWhere(from?: Date, to?: Date) {
    if (!from && !to) return {};
    return { fecha: { ...(from && { gte: from }), ...(to && { lte: to }) } };
  }

  // ── Ingresos (manuales + automáticos por venta) ──
  async createIngreso(data: any) {
    const ingreso = await this.prisma.ingreso.create({
      data: {
        descripcion: data.descripcion,
        monto: data.monto,
        categoria: data.categoria || 'general',
        fecha: data.fecha ? new Date(data.fecha) : new Date(),
        usuarioId: data.usuarioId,
        ubicacionId: data.ubicacionId ?? null,
      },
    });
    this.gateway.emitSync('finanzas', { tipo: 'ingreso', id: ingreso.id });
    return ingreso;
  }

  async getIngresos(filters: { from?: Date; to?: Date; categoria?: string; search?: string }) {
    const where: any = { ...this.buildFechaWhere(filters.from, filters.to) };
    if (filters.categoria) where.categoria = filters.categoria;
    if (filters.search) where.descripcion = { contains: filters.search };

    const manuales = await this.prisma.ingreso.findMany({
      where,
      include: { usuario: { select: { nombre: true } }, ubicacion: { select: { nombre: true } } },
      orderBy: { fecha: 'desc' },
    });

    // Ventas confirmadas / entregadas como ingresos automáticos
    const ventaWhere: any = { estado: { notIn: ['CANCELADO', 'PENDIENTE'] } };
    if (filters.from || filters.to) {
      ventaWhere.createdAt = { ...(filters.from && { gte: filters.from }), ...(filters.to && { lte: filters.to }) };
    }
    const ventas = await this.prisma.venta.findMany({
      where: ventaWhere,
      include: {
        cliente: { select: { nombre: true, apellido: true } },
        detalles: { include: { item: { include: { producto: true, variante: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let ventasComoIngreso = ventas.map((v) => ({
      id: `venta-${v.id}`,
      tipo: 'venta' as const,
      descripcion: `Venta #${v.id}${v.cliente ? ' — ' + v.cliente.nombre + ' ' + (v.cliente.apellido ?? '') : ''}`,
      monto: v.total,
      categoria: 'ventas',
      fecha: v.createdAt,
      productos: v.detalles.map((d) => d.item.producto.nombre),
      usuario: null as any,
      ubicacion: null as any,
      ventaId: v.id,
      estado: v.estado,
      canal: v.canal,
    }));

    if (filters.categoria && filters.categoria !== 'ventas') ventasComoIngreso = [];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      ventasComoIngreso = ventasComoIngreso.filter(
        (v) => v.descripcion.toLowerCase().includes(s) || v.productos.some((p) => p.toLowerCase().includes(s)),
      );
    }

    const manualesFmt = manuales.map((m) => ({
      id: `manual-${m.id}`,
      tipo: 'manual' as const,
      descripcion: m.descripcion,
      monto: m.monto,
      categoria: m.categoria,
      fecha: m.fecha,
      productos: [] as string[],
      usuario: m.usuario?.nombre ?? null,
      ubicacion: m.ubicacion?.nombre ?? null,
      ventaId: null,
      estado: null,
      canal: null,
    }));

    const todos = [...manualesFmt, ...ventasComoIngreso].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );

    const total = todos.reduce((acc, i) => acc + Number(i.monto), 0);
    return { data: todos, total, cantidad: todos.length };
  }

  // ── Egresos ──
  async createGasto(data: any) {
    const gasto = await this.prisma.gasto.create({
      data: {
        descripcion: data.descripcion,
        monto: data.monto,
        categoria: data.categoria || 'general',
        fecha: data.fecha ? new Date(data.fecha) : new Date(),
        usuarioId: data.usuarioId,
        ubicacionId: data.ubicacionId ?? null,
      },
    });
    this.gateway.emitSync('finanzas', { tipo: 'gasto', id: gasto.id });
    return gasto;
  }

  async getGastos(filters: { from?: Date; to?: Date; categoria?: string; search?: string }) {
    const where: any = { ...this.buildFechaWhere(filters.from, filters.to) };
    if (filters.categoria) where.categoria = filters.categoria;
    if (filters.search) where.descripcion = { contains: filters.search };

    const gastos = await this.prisma.gasto.findMany({
      where,
      include: { usuario: { select: { nombre: true } }, ubicacion: { select: { nombre: true } } },
      orderBy: { fecha: 'desc' },
    });

    const total = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
    return { data: gastos, total, cantidad: gastos.length };
  }

  // ── Serie temporal para el gráfico de barras (con granularidad) ──
  async getSerie(granularidad: 'dia' | 'semana' | 'mes' | 'anio', from?: Date, to?: Date) {
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    let unit: 'day' | 'week' | 'month' | 'year';
    let defaultCount: number;
    switch (granularidad) {
      case 'dia': unit = 'day'; defaultCount = 14; break;
      case 'semana': unit = 'week'; defaultCount = 8; break;
      case 'anio': unit = 'year'; defaultCount = 5; break;
      default: unit = 'month'; defaultCount = 6;
    }

    let start: Date;
    if (from) {
      start = new Date(from);
    } else {
      start = new Date(end);
      if (unit === 'day') start.setDate(start.getDate() - (defaultCount - 1));
      if (unit === 'week') start.setDate(start.getDate() - (defaultCount * 7 - 1));
      if (unit === 'month') start.setMonth(start.getMonth() - (defaultCount - 1), 1);
      if (unit === 'year') start.setFullYear(start.getFullYear() - (defaultCount - 1), 0, 1);
    }
    start.setHours(0, 0, 0, 0);

    const buckets: { label: string; from: Date; to: Date }[] = [];
    const cursor = new Date(start);
    let safety = 0;
    while (cursor <= end && safety < 60) {
      safety++;
      let bFrom: Date, bTo: Date, label: string;
      if (unit === 'day') {
        bFrom = new Date(cursor);
        bTo = new Date(cursor);
        bTo.setHours(23, 59, 59, 999);
        label = bFrom.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
        cursor.setDate(cursor.getDate() + 1);
      } else if (unit === 'week') {
        bFrom = new Date(cursor);
        bTo = new Date(cursor);
        bTo.setDate(bTo.getDate() + 6);
        bTo.setHours(23, 59, 59, 999);
        label = `${bFrom.getDate()}/${bFrom.getMonth() + 1}`;
        cursor.setDate(cursor.getDate() + 7);
      } else if (unit === 'year') {
        bFrom = new Date(cursor.getFullYear(), 0, 1);
        bTo = new Date(cursor.getFullYear(), 11, 31, 23, 59, 59);
        label = String(cursor.getFullYear());
        cursor.setFullYear(cursor.getFullYear() + 1);
      } else {
        bFrom = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        bTo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
        label = bFrom.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      buckets.push({ label, from: bFrom, to: bTo });
    }

    return Promise.all(
      buckets.map(async (b) => {
        const [v, g, im] = await Promise.all([
          this.prisma.venta.aggregate({ where: { estado: { notIn: ['CANCELADO', 'PENDIENTE'] }, createdAt: { gte: b.from, lte: b.to } }, _sum: { total: true } }),
          this.prisma.gasto.aggregate({ where: { fecha: { gte: b.from, lte: b.to } }, _sum: { monto: true } }),
          this.prisma.ingreso.aggregate({ where: { fecha: { gte: b.from, lte: b.to } }, _sum: { monto: true } }),
        ]);
        return {
          mes: b.label,
          ingresos: Number(v._sum.total || 0) + Number(im._sum.monto || 0),
          gastos: Number(g._sum.monto || 0),
        };
      }),
    );
  }

  // ── Resumen (con data para gráficos) ──
  async getResumen(from?: Date, to?: Date) {
    const fechaWhereVenta: any = {};
    if (from || to) fechaWhereVenta.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };
    const fechaWhere: any = {};
    if (from || to) fechaWhere.fecha = { ...(from && { gte: from }), ...(to && { lte: to }) };

    const [ventasAgg, gastosAgg, ingresosManualesAgg] = await Promise.all([
      this.prisma.venta.aggregate({ where: { ...fechaWhereVenta, estado: { notIn: ['CANCELADO', 'PENDIENTE'] } }, _sum: { total: true }, _count: true }),
      this.prisma.gasto.aggregate({ where: fechaWhere, _sum: { monto: true }, _count: true }),
      this.prisma.ingreso.aggregate({ where: fechaWhere, _sum: { monto: true }, _count: true }),
    ]);

    const ingresosVentas = Number(ventasAgg._sum.total || 0);
    const ingresosManuales = Number(ingresosManualesAgg._sum.monto || 0);
    const ingresos = ingresosVentas + ingresosManuales;
    const gastos = Number(gastosAgg._sum.monto || 0);

    // Egresos por categoría (para gráfico de torta)
    const gastosPorCategoria = await this.prisma.gasto.groupBy({
      by: ['categoria'],
      where: fechaWhere,
      _sum: { monto: true },
    });
    const categoriasEgresos = gastosPorCategoria
      .map((c) => ({ categoria: c.categoria || 'general', monto: Number(c._sum.monto || 0) }))
      .sort((a, b) => b.monto - a.monto);

    return {
      ingresos,
      gastos,
      gananciaBruta: ingresos,
      gananciaNeta: ingresos - gastos,
      cantidadVentas: ventasAgg._count,
      cantidadGastos: gastosAgg._count,
      cantidadIngresosManuales: ingresosManualesAgg._count,
      categoriasEgresos,
    };
  }
}
