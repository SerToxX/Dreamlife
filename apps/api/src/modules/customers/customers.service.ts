import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.cliente.findMany({
      where: search ? { OR: [
        { nombre: { contains: search } },
        { apellido: { contains: search } },
        { correo: { contains: search } },
        { dni: { contains: search } },
      ] } : {},
      select: { id: true, nombre: true, apellido: true, dni: true, correo: true, telefono: true, direccion: true, puntos: true, nivel: true, activo: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const c = await this.prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true, nombre: true, apellido: true, dni: true, correo: true, telefono: true, direccion: true,
        puntos: true, nivel: true, activo: true, createdAt: true,
        ventas: { orderBy: { createdAt: 'desc' }, take: 20, include: { pagos: true, detalles: { include: { item: { include: { producto: true, imagenes: { take: 1 } } } } } } },
      },
    });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  async update(id: number, data: any) {
    const { correo, contrasena, ...allowed } = data;

    if (allowed.dni) {
      const dup = await this.prisma.cliente.findUnique({ where: { dni: allowed.dni } });
      if (dup && dup.id !== id) throw new ConflictException('Ya existe una cuenta registrada con ese DNI');
    }

    return this.prisma.cliente.update({ where: { id }, data: allowed });
  }
}
