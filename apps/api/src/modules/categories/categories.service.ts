import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  findAll() {
    return this.prisma.categoria.findMany({
      orderBy: [{ padreId: 'asc' }, { nombre: 'asc' }],
      include: {
        padre: true,
        _count: { select: { productos: true, hijos: true } },
      },
    });
  }

  findTree() {
    return this.prisma.categoria.findMany({
      where: { padreId: null },
      include: { hijos: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const cat = await this.prisma.categoria.findUnique({ where: { id }, include: { hijos: true } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  async create(data: { nombre: string; slug?: string; padreId?: number | null }) {
    const slug = data.slug ?? data.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cat = await this.prisma.categoria.create({ data: { nombre: data.nombre, slug, padreId: data.padreId ?? null } });
    this.gateway.emitSync('categorias');
    this.gateway.emitPublicSync('categorias');
    return cat;
  }

  async update(id: number, data: any) {
    const { nombre, slug, padreId } = data;
    const cat = await this.prisma.categoria.update({
      where: { id },
      data: { nombre, slug, padreId: padreId ?? null },
    });
    this.gateway.emitSync('categorias', { id });
    this.gateway.emitPublicSync('categorias', { id });
    return cat;
  }

  async remove(id: number) {
    const productos = await this.prisma.producto.count({ where: { categoriaId: id } });
    if (productos > 0) throw new BadRequestException(`No se puede eliminar: tiene ${productos} productos asociados`);
    const hijos = await this.prisma.categoria.count({ where: { padreId: id } });
    if (hijos > 0) throw new BadRequestException(`No se puede eliminar: tiene ${hijos} subcategorías`);
    const deleted = await this.prisma.categoria.delete({ where: { id } });
    this.gateway.emitSync('categorias', { id });
    this.gateway.emitPublicSync('categorias', { id });
    return deleted;
  }
}
