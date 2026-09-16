import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  async findAll(query: { page?: number; limit?: number; search?: string; categoriaId?: number; destacado?: boolean }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, categoriaId, destacado } = query;
    const where: any = { activo: true };
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { nombre: { contains: s } },
        { descripcion: { contains: s } },
        { items: { some: { codigoSku: { contains: s } } } },
      ];
    }
    if (categoriaId) where.categoriaId = Number(categoriaId);
    if (destacado !== undefined) where.destacado = destacado;
    const [total, data] = await Promise.all([
      this.prisma.producto.count({ where }),
      this.prisma.producto.findMany({
        where, skip, take: limit,
        include: {
          categoria: true,
          imagenes: { orderBy: { orden: 'asc' }, take: 1 },
          items: { where: { activo: true }, include: { variante: true, diseno: true, stocks: { include: { ubicacion: true } }, ofertaItems: { include: { oferta: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const product = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        imagenes: { orderBy: { orden: 'asc' } },
        variantes: true,
        items: { where: { activo: true }, include: { variante: true, diseno: true, imagenes: true, stocks: { include: { ubicacion: true } }, liquidaciones: { where: { activa: true } }, ofertaItems: { include: { oferta: true } } } },
      },
    });
    if (!product) throw new NotFoundException(`Producto #${id} no encontrado`);
    return product;
  }

  async create(dto: CreateProductDto) {
    const producto = await this.prisma.producto.create({
      data: { nombre: dto.nombre, descripcion: dto.descripcion, precioBase: dto.precioBase, personalizado: dto.personalizado || false, destacado: dto.destacado || false, categoriaId: dto.categoriaId },
      include: { categoria: true },
    });
    if (dto.imagen) {
      await this.prisma.imagen.create({ data: { productoId: producto.id, url: dto.imagen, orden: 0 } });
    }
    this.gateway.emitSync('productos', { id: producto.id });
    this.gateway.emitPublicSync('productos', { id: producto.id });
    return this.findOne(producto.id);
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    const { imagen, ...rest } = dto as any;
    await this.prisma.producto.update({ where: { id }, data: rest });

    if (imagen !== undefined) {
      const existente = await this.prisma.imagen.findFirst({ where: { productoId: id }, orderBy: { orden: 'asc' } });
      if (!imagen) {
        // Si mandan string vacío, se interpreta como "quitar imagen"
        if (existente) await this.prisma.imagen.delete({ where: { id: existente.id } });
      } else if (existente) {
        await this.prisma.imagen.update({ where: { id: existente.id }, data: { url: imagen } });
      } else {
        await this.prisma.imagen.create({ data: { productoId: id, url: imagen, orden: 0 } });
      }
    }
    this.gateway.emitSync('productos', { id });
    this.gateway.emitPublicSync('productos', { id });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    const producto = await this.prisma.producto.update({ where: { id }, data: { activo: false } });
    this.gateway.emitSync('productos', { id });
    this.gateway.emitPublicSync('productos', { id });
    return producto;
  }

  async getFeatured() {
    return this.prisma.producto.findMany({
      where: { activo: true, destacado: true }, take: 8,
      include: { imagenes: { orderBy: { orden: 'asc' }, take: 1 }, categoria: true, items: { where: { activo: true }, include: { ofertaItems: { include: { oferta: true } } } } },
    });
  }

  // Buscador liviano de SKUs para el selector de productos al armar una campaña de ofertas
  async searchItems(search?: string) {
    return this.prisma.productoItem.findMany({
      where: {
        activo: true,
        ...(search?.trim() ? {
          OR: [
            { codigoSku: { contains: search.trim() } },
            { producto: { nombre: { contains: search.trim() } } },
          ],
        } : {}),
      },
      take: 30,
      include: { producto: { include: { imagenes: { take: 1 } } }, variante: true },
      orderBy: { id: 'desc' },
    });
  }

  async createItem(productoId: number, body: any) {
    // Crear variante
    const variante = await this.prisma.variante.create({
      data: { productoId, tamano: body.tamano ?? 'Única', material: body.material ?? 'Estándar', precioExtra: body.precioExtra ?? 0 },
    });
    // Crear item con SKU
    const item = await this.prisma.productoItem.create({
      data: {
        codigoSku: body.codigoSku,
        productoId,
        varianteId: variante.id,
        activo: true,
      },
    });
    this.gateway.emitSync('productos', { productoId });
    this.gateway.emitPublicSync('productos', { productoId });
    return item;
  }
}
