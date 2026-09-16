import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  async findAll(query: { page?: number; limit?: number; estado?: string; clienteId?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 100;
    const { estado, clienteId } = query;
    const where: any = {};
    if (estado) where.estado = estado;
    if (clienteId) where.clienteId = clienteId;

    const ventas = await this.prisma.venta.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { cliente: true, usuario: true, ubicacion: true, pagos: true, detalles: { include: { item: { include: { producto: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    // Las solicitudes personalizadas (ej. la taza del editor 3D) no tienen un estado de Venta
    // (PENDIENTE/CONFIRMADA/...), así que solo se filtran por cliente si corresponde, no por `estado`.
    // Las que ya se pagaron tienen su propia Venta (con `ventaId`) y ya aparecen arriba —
    // se excluyen acá para no duplicarlas en la lista.
    const personalizadosWhere: any = { pagado: false };
    if (clienteId) personalizadosWhere.clienteId = clienteId;
    const personalizados = estado
      ? []
      : await this.prisma.pedidoPersonalizado.findMany({
          where: personalizadosWhere,
          include: { cliente: true },
          orderBy: { createdAt: 'desc' },
        });

    const merged = [
      ...ventas.map((v) => ({ ...v, origen: 'venta' as const })),
      ...personalizados.map((p) => ({ ...p, origen: 'personalizado' as const, total: p.precioEstimado })),
    ];
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged;
  }

  async findOne(id: number) {
    const order = await this.prisma.venta.findUnique({
      where: { id },
      include: { cliente: true, usuario: true, ubicacion: true, pagos: true, envios: true,
        detalles: { include: { item: { include: { producto: true, variante: true, imagenes: { take: 1 } } } } },
        pedidosPersonalizados: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async updateStatus(id: number, estado: string) {
    const venta = await this.findOne(id);
    const actualizada = await this.prisma.venta.update({ where: { id }, data: { estado: estado as any } });
    if (venta.clienteId) this.gateway.emitClienteSync(venta.clienteId, 'my-orders', { id });
    this.gateway.emitSync('orders', { id });
    return actualizada;
  }

  // Vincula un pedido sin cliente (canal online de antes del fix de checkout seguro)
  // a la cuenta correspondiente, buscando por correo.
  async linkToCustomer(id: number, correoCliente: string) {
    const venta = await this.findOne(id);
    if (venta.clienteId) throw new Error('Este pedido ya tiene un cliente asignado');
    const cliente = await this.prisma.cliente.findUnique({ where: { correo: correoCliente } });
    if (!cliente) throw new NotFoundException('No existe un cliente con ese correo');
    return this.prisma.venta.update({ where: { id }, data: { clienteId: cliente.id } });
  }

  async cancel(id: number) {
    return this.updateStatus(id, 'CANCELADO');
  }
}
