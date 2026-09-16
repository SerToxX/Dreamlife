import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private finance: FinanceService) {}

  private getRange(periodo: string): { from: Date; to: Date; days: number } {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const to = now;

    if (periodo === 'hoy') {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      return { from, to, days: 1 };
    }
    if (periodo === 'semana') {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to, days: 7 };
    }
    if (periodo === 'mes') {
      const from = new Date();
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from, to, days: 30 };
    }
    if (periodo === 'año' || periodo === 'anio') {
      const from = new Date();
      from.setDate(from.getDate() - 364);
      from.setHours(0, 0, 0, 0);
      return { from, to, days: 365 };
    }
    // default 7 días
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to, days: 7 };
  }

  async getSummary(periodo = 'mes') {
    const { from, to } = this.getRange(periodo);

    const [resumen, totalClientes, totalProductos, stockAlertas, pedidosPendientes] = await Promise.all([
      this.finance.getResumen(from, to),
      this.prisma.cliente.count({ where: { activo: true } }),
      this.prisma.producto.count({ where: { activo: true } }),
      this.prisma.stock.count({ where: { cantidad: { lte: 5 } } }),
      this.prisma.venta.count({ where: { estado: 'PENDIENTE' } }),
    ]);

    // Ventas hoy adicionalmente
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ventasHoy = await this.prisma.venta.aggregate({
      where: { createdAt: { gte: todayStart }, estado: { notIn: ['CANCELADO', 'PENDIENTE'] } },
      _sum: { total: true }, _count: true,
    });

    return {
      periodo,
      from: from.toISOString(),
      to: to.toISOString(),
      ventasHoy: { monto: Number(ventasHoy._sum.total || 0), cantidad: ventasHoy._count },
      ventasPeriodo: { monto: resumen.ingresos, cantidad: resumen.cantidadVentas },
      ingresos: resumen.ingresos,
      egresos: resumen.gastos,
      gananciaNeta: resumen.gananciaNeta,
      totalClientes,
      totalProductos,
      alertasStock: stockAlertas,
      pedidosPendientes,
    };
  }

  // Delega en finance.getSerie: mismos números que Finanzas/Reportes, sin duplicar lógica.
  // 'hoy' se resuelve por horas (caso especial que finance.getSerie no cubre).
  async getSalesChart(periodo = 'semana') {
    if (periodo === 'hoy') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const data = [];
      for (let h = 0; h < 24; h++) {
        const start = new Date(todayStart);
        start.setHours(h);
        const end = new Date(start);
        end.setHours(h + 1);
        const [vRes, gRes, iRes] = await Promise.all([
          this.prisma.venta.aggregate({
            where: { createdAt: { gte: start, lt: end }, estado: { notIn: ['CANCELADO', 'PENDIENTE'] } },
            _sum: { total: true }, _count: true,
          }),
          this.prisma.gasto.aggregate({ where: { fecha: { gte: start, lt: end } }, _sum: { monto: true } }),
          this.prisma.ingreso.aggregate({ where: { fecha: { gte: start, lt: end } }, _sum: { monto: true } }),
        ]);
        data.push({
          fecha: `${h.toString().padStart(2, '0')}:00`,
          ingresos: Number(vRes._sum.total || 0) + Number(iRes._sum.monto || 0),
          egresos: Number(gRes._sum.monto || 0),
          cantidad: vRes._count,
        });
      }
      return data;
    }

    const { from, to } = this.getRange(periodo);
    // año → agrupar por mes (12 barras legibles); semana/mes → por día
    const granularidad = periodo === 'año' || periodo === 'anio' ? 'mes' : 'dia';
    const serie = await this.finance.getSerie(granularidad as any, from, to);
    return serie.map((s) => ({ fecha: s.mes, ingresos: s.ingresos, egresos: s.gastos }));
  }

  async getTopProducts(periodo = 'mes', limit = 5) {
    const { from, to } = this.getRange(periodo);
    const detalles = await this.prisma.ventaDetalle.groupBy({
      by: ['itemId'],
      where: { venta: { createdAt: { gte: from, lte: to }, estado: { notIn: ['CANCELADO', 'PENDIENTE'] } } },
      _sum: { cantidad: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: limit,
    });
    return Promise.all(detalles.map(async d => {
      const item = await this.prisma.productoItem.findUnique({
        where: { id: d.itemId },
        include: { producto: true, imagenes: { take: 1 } }
      });
      return { item, totalVendido: d._sum.cantidad };
    }));
  }

  // Breakdown egresos por categoría — reutiliza el mismo cálculo que Finanzas/Reportes
  async getExpensesByCategory(periodo = 'mes') {
    const { from, to } = this.getRange(periodo);
    const resumen = await this.finance.getResumen(from, to);
    return resumen.categoriasEgresos;
  }

  // Breakdown ingresos por canal
  async getRevenueByChannel(periodo = 'mes') {
    const { from, to } = this.getRange(periodo);
    const result = await this.prisma.venta.groupBy({
      by: ['canal'],
      where: { createdAt: { gte: from, lte: to }, estado: { notIn: ['CANCELADO', 'PENDIENTE'] } },
      _sum: { total: true },
      _count: true,
    });
    return result.map(r => ({
      canal: r.canal,
      monto: Number(r._sum.total || 0),
      cantidad: r._count,
    }));
  }

  // Salud del inventario (para el gráfico de dona en el dashboard)
  async getStockHealth() {
    const stocks = await this.prisma.stock.findMany({ select: { cantidad: true } });
    let ok = 0, bajo = 0, agotado = 0;
    for (const s of stocks) {
      if (s.cantidad === 0) agotado++;
      else if (s.cantidad <= 5) bajo++;
      else ok++;
    }
    return { ok, bajo, agotado, total: stocks.length };
  }
}
