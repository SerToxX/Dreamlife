import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

interface ItemPersonalizadoInput {
  tipo?: string;
  descripcion: string;
  referencias?: string;
  imagenUrl?: string;
  notas?: string;
}

interface DatosPagoGrupo {
  nombreComprador: string;
  correoComprador: string;
  telefonoComprador: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccionEnvio: string;
  distrito: string;
  provincia: string;
  departamento: string;
  referenciaEnvio?: string;
  metodoPago: string;
}

const TIPOS_DOCUMENTO = ['DNI', 'CE', 'PASAPORTE', 'RUC'];

@Injectable()
export class CustomOrdersService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  findAll() {
    return this.prisma.pedidoPersonalizado.findMany({
      include: { cliente: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByCliente(clienteId: number) {
    return this.prisma.pedidoPersonalizado.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.pedidoPersonalizado.findUnique({
      where: { id },
      include: { cliente: true },
    });
  }

  findByGrupo(grupoId: string) {
    return this.prisma.pedidoPersonalizado.findMany({ where: { grupoId }, orderBy: { id: 'asc' } });
  }

  // Crea una o varias solicitudes personalizadas de una sola vez (ej. 2 camisetas
  // + 1 taza), agrupadas por `grupoId` para poder cotizarlas y pagarlas juntas,
  // igual que un carrito con varios productos del catálogo.
  async createBatch(clienteId: number, items: ItemPersonalizadoInput[]) {
    if (!items?.length) throw new BadRequestException('Agrega al menos un producto personalizado');
    const grupoId = randomUUID();
    await this.prisma.pedidoPersonalizado.createMany({
      data: items.map((it) => ({
        clienteId,
        grupoId,
        tipo: it.tipo || 'Personalizado',
        descripcion: it.descripcion,
        referencias: it.referencias,
        imagenUrl: it.imagenUrl,
        notas: it.notas,
      })),
    });
    this.gateway.emitSync('personalizados', { grupoId });
    this.gateway.emitClienteSync(clienteId, 'my-orders', { grupoId });
    return this.prisma.pedidoPersonalizado.findMany({ where: { grupoId }, orderBy: { id: 'asc' } });
  }

  // Actualización genérica (ej. solo cambiar `estado` desde el dropdown del admin).
  // Si viene `precioEstimado`, se delega a `cotizar()` para no perder el historial.
  async update(id: number, data: any) {
    if (data.precioEstimado != null) {
      const { precioEstimado, notasInternas, estado, ...resto } = data;
      return this.cotizar(id, Number(precioEstimado), notasInternas, estado ?? 'COTIZADO', resto);
    }
    const actualizado = await this.prisma.pedidoPersonalizado.update({ where: { id }, data });
    this.gateway.emitSync('personalizados', { id });
    this.gateway.emitClienteSync(actualizado.clienteId, 'my-orders', { id });
    return actualizado;
  }

  // Guarda una nueva cotización SIN perder las anteriores: cada vez que el admin cotiza
  // (o vuelve a cotizar), se agrega una entrada al historial en vez de sobrescribirla.
  async cotizar(id: number, precio: number, notas: string | undefined, estado: string, extra: any = {}) {
    const actual = await this.prisma.pedidoPersonalizado.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Solicitud no encontrada');

    const historialPrevio = Array.isArray(actual.historialCotizaciones) ? (actual.historialCotizaciones as any[]) : [];
    // Si ya había una cotización previa (con precio), la guardamos en el historial antes de reemplazarla.
    const nuevoHistorial = actual.precioEstimado != null
      ? [...historialPrevio, { precio: Number(actual.precioEstimado), notas: actual.notasInternas ?? null, fecha: actual.updatedAt }]
      : historialPrevio;

    const actualizado = await this.prisma.pedidoPersonalizado.update({
      where: { id },
      data: {
        ...extra,
        precioEstimado: precio,
        notasInternas: notas,
        estado,
        historialCotizaciones: nuevoHistorial,
      },
    });

    // El cliente dueño del pedido ve la nueva cotización al instante, sin recargar.
    this.gateway.emitClienteSync(actualizado.clienteId, 'my-orders', { id });
    this.gateway.emitSync('personalizados', { id });
    return actualizado;
  }

  // El placeholder "Pedido Personalizado" es el SKU genérico que usan las ventas
  // convertidas desde pedidos personalizados (VentaDetalle exige un item real).
  // El detalle específico de qué se pidió vive en Venta.notas y en los propios
  // PedidoPersonalizado (vinculados via `ventaId`), no en este SKU.
  private async getOrCrearItemPlaceholder() {
    const existente = await this.prisma.productoItem.findUnique({ where: { codigoSku: 'PERSONALIZADO' } });
    if (existente) return existente;
    const producto = await this.prisma.producto.create({
      data: { nombre: 'Pedido Personalizado', descripcion: 'Producto de diseño personalizado — ver detalle en el pedido', precioBase: 0, personalizado: true, activo: false },
    });
    return this.prisma.productoItem.create({ data: { codigoSku: 'PERSONALIZADO', productoId: producto.id, activo: false } });
  }

  // El cliente paga TODAS las cotizaciones de un grupo a la vez (ej. sus 3 productos
  // personalizados en un solo pago), con los mismos datos regulatorios que pide el
  // checkout del catálogo. Genera una Venta real (con su propio # de pedido), igual
  // que una compra normal — necesario para que se pueda referenciar en una
  // reclamación y para que aparezca correctamente en Finanzas/Reportes.
  async pagarGrupo(grupoId: string, clienteId: number, datos: DatosPagoGrupo) {
    if (!TIPOS_DOCUMENTO.includes(datos.tipoDocumento)) throw new BadRequestException('Tipo de documento inválido');
    if (!datos.nombreComprador?.trim() || !datos.correoComprador?.trim() || !datos.telefonoComprador?.trim() || !datos.numeroDocumento?.trim()) {
      throw new BadRequestException('Completa los datos del comprador');
    }
    if (!datos.direccionEnvio?.trim() || !datos.distrito?.trim() || !datos.provincia?.trim() || !datos.departamento?.trim()) {
      throw new BadRequestException('Completa la dirección de envío');
    }

    const items = await this.prisma.pedidoPersonalizado.findMany({ where: { grupoId } });
    if (!items.length) throw new NotFoundException('Grupo de solicitudes no encontrado');
    if (items.some((it) => it.clienteId !== clienteId)) throw new ForbiddenException('Este grupo no te pertenece');
    if (items.some((it) => it.pagado)) throw new BadRequestException('Una o más solicitudes de este grupo ya fueron pagadas');
    if (items.some((it) => it.estado !== 'COTIZADO' || it.precioEstimado == null)) {
      throw new BadRequestException('Todas las solicitudes del grupo deben estar cotizadas antes de pagar');
    }

    const total = items.reduce((acc, it) => acc + Number(it.precioEstimado), 0);
    const placeholder = await this.getOrCrearItemPlaceholder();

    const venta = await this.prisma.$transaction(async (tx) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId,
          canal: 'ONLINE',
          estado: 'CONFIRMADA',
          total,
          notas: `Pedido personalizado (${items.length} producto${items.length > 1 ? 's' : ''}): ${items.map((it) => it.tipo).join(', ')}`,
          nombreComprador: datos.nombreComprador.trim(),
          correoComprador: datos.correoComprador.trim(),
          telefonoComprador: datos.telefonoComprador.trim(),
          tipoDocumento: datos.tipoDocumento,
          numeroDocumento: datos.numeroDocumento.trim(),
        },
      });

      for (const it of items) {
        await tx.ventaDetalle.create({
          data: {
            ventaId: nuevaVenta.id,
            itemId: placeholder.id,
            cantidad: 1,
            precioBase: it.precioEstimado!,
            precioVendido: it.precioEstimado!,
          },
        });
      }

      await tx.pago.create({ data: { ventaId: nuevaVenta.id, metodo: datos.metodoPago, monto: total } });
      await tx.envio.create({
        data: {
          ventaId: nuevaVenta.id, tipo: 'DELIVERY', estado: 'PENDIENTE',
          direccion: datos.direccionEnvio.trim(),
          distrito: datos.distrito.trim(),
          provincia: datos.provincia.trim(),
          departamento: datos.departamento.trim(),
          referencia: datos.referenciaEnvio?.trim() || null,
        },
      });

      await tx.pedidoPersonalizado.updateMany({
        where: { grupoId },
        data: {
          pagado: true,
          metodoPago: datos.metodoPago,
          pagadoEn: new Date(),
          estado: 'APROBADO',
          ventaId: nuevaVenta.id,
          nombreComprador: datos.nombreComprador.trim(),
          correoComprador: datos.correoComprador.trim(),
          telefonoComprador: datos.telefonoComprador.trim(),
          tipoDocumento: datos.tipoDocumento,
          numeroDocumento: datos.numeroDocumento.trim(),
          direccionEnvio: datos.direccionEnvio.trim(),
          distrito: datos.distrito.trim(),
          provincia: datos.provincia.trim(),
          departamento: datos.departamento.trim(),
          referenciaEnvio: datos.referenciaEnvio?.trim() || null,
        },
      });

      await tx.cliente.update({ where: { id: clienteId }, data: { puntos: { increment: Math.floor(total) } } });

      return nuevaVenta;
    });

    this.gateway.emitSync('personalizados', { grupoId });
    this.gateway.emitSync('finanzas', { ventaId: venta.id });
    this.gateway.emitSync('orders', { ventaId: venta.id });
    this.gateway.emitClienteSync(clienteId, 'my-orders', { ventaId: venta.id });

    return { ventaId: venta.id, total: venta.total, message: '¡Pedido procesado con éxito!' };
  }
}
