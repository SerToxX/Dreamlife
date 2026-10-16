import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const TIPOS_VALIDOS = ['LIMA', 'PROVINCIA'];

// Zonas de Lima Metropolitana con las que arranca la tienda (editables luego
// desde el panel admin). Se siembran solo si la tabla está vacía, para que el
// checkout tenga zonas disponibles desde el primer despliegue.
const ZONAS_SEMILLA = [
  { tipo: 'LIMA', nombre: 'Zona Sur', precio: 0, orden: 1, cobertura: 'Chorrillos, San Juan de Miraflores, Villa El Salvador, Villa María del Triunfo, Pachacamac, Lurín' },
  { tipo: 'LIMA', nombre: 'Zona Centro 1', precio: 0, orden: 2, cobertura: 'Surco, Surquillo, San Borja, San Luis, Miraflores, Barranco, Lince, San Isidro, La Victoria, Breña, Pueblo Libre, Magdalena del Mar, Jesús María' },
  { tipo: 'LIMA', nombre: 'Zona Centro 2', precio: 15, orden: 3, cobertura: 'San Miguel, Cercado de Lima, Rímac' },
  { tipo: 'LIMA', nombre: 'Zona Este 1', precio: 15, orden: 4, cobertura: 'El Agustino, Santa Anita, San Luis, La Molina' },
  { tipo: 'LIMA', nombre: 'Zona Este 2', precio: 29, orden: 5, cobertura: 'San Juan de Lurigancho, Lurigancho, Ate, Chaclacayo, Cieneguilla' },
  { tipo: 'LIMA', nombre: 'Zona Norte 1', precio: 20, orden: 6, cobertura: 'San Martín de Porres, Los Olivos, Independencia' },
  { tipo: 'LIMA', nombre: 'Zona Norte 2', precio: 35, orden: 7, cobertura: 'Puente Piedra, Comas, Ventanilla, Mi Perú' },
  { tipo: 'LIMA', nombre: 'Callao', precio: 25, orden: 8, cobertura: 'Bellavista, La Perla, Carmen de la Legua Reynoso' },
] as const;

@Injectable()
export class ShippingService implements OnModuleInit {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  async onModuleInit() {
    const count = await this.prisma.zonaEnvio.count();
    if (count > 0) return;
    await this.prisma.zonaEnvio.createMany({ data: ZONAS_SEMILLA.map((z) => ({ ...z, tipo: z.tipo as any })) });
  }

  findPublic() {
    return this.prisma.zonaEnvio.findMany({
      where: { activo: true },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { id: 'asc' }],
    });
  }

  findAllAdmin() {
    return this.prisma.zonaEnvio.findMany({ orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { id: 'asc' }] });
  }

  private validar(data: { tipo?: string; nombre?: string; precio?: number }, { partial }: { partial: boolean }) {
    if (!partial || data.tipo !== undefined) {
      if (!data.tipo || !TIPOS_VALIDOS.includes(data.tipo)) throw new BadRequestException('Tipo inválido: debe ser LIMA o PROVINCIA');
    }
    if (!partial || data.nombre !== undefined) {
      if (!data.nombre?.trim()) throw new BadRequestException('El nombre es obligatorio');
    }
    if (!partial || data.precio !== undefined) {
      if (data.precio === undefined || data.precio === null || Number(data.precio) < 0) throw new BadRequestException('El precio debe ser mayor o igual a 0');
    }
  }

  async create(data: { tipo: string; nombre: string; cobertura?: string; precio: number; activo?: boolean; orden?: number }) {
    this.validar(data, { partial: false });
    const zona = await this.prisma.zonaEnvio.create({
      data: {
        tipo: data.tipo as any,
        nombre: data.nombre.trim(),
        cobertura: data.cobertura?.trim() || null,
        precio: data.precio,
        activo: data.activo ?? true,
        orden: data.orden ?? 0,
      },
    });
    this.gateway.emitSync('zonas-envio');
    this.gateway.emitPublicSync('zonas-envio');
    return zona;
  }

  async update(id: number, data: { tipo?: string; nombre?: string; cobertura?: string; precio?: number; activo?: boolean; orden?: number }) {
    const existente = await this.prisma.zonaEnvio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Zona de envío no encontrada');
    this.validar(data, { partial: true });

    const updated = await this.prisma.zonaEnvio.update({
      where: { id },
      data: {
        tipo: data.tipo as any,
        nombre: data.nombre?.trim(),
        cobertura: data.cobertura !== undefined ? (data.cobertura?.trim() || null) : undefined,
        precio: data.precio,
        activo: data.activo,
        orden: data.orden,
      },
    });
    this.gateway.emitSync('zonas-envio', { id });
    this.gateway.emitPublicSync('zonas-envio', { id });
    return updated;
  }

  async remove(id: number) {
    const existente = await this.prisma.zonaEnvio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Zona de envío no encontrada');

    const usos = await this.prisma.envio.count({ where: { zonaEnvioId: id } });
    if (usos > 0) {
      // Tiene pedidos históricos que la referencian: se desactiva en vez de
      // borrarse para no romper esos registros (ni el checkout nunca podrá
      // seleccionarla de nuevo mientras esté inactiva).
      const updated = await this.prisma.zonaEnvio.update({ where: { id }, data: { activo: false } });
      this.gateway.emitSync('zonas-envio', { id });
      this.gateway.emitPublicSync('zonas-envio', { id });
      return updated;
    }

    const deleted = await this.prisma.zonaEnvio.delete({ where: { id } });
    this.gateway.emitSync('zonas-envio', { id });
    this.gateway.emitPublicSync('zonas-envio', { id });
    return deleted;
  }
}
