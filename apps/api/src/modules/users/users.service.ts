import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const SELECT = { id: true, nombre: true, correo: true, activo: true, rolId: true, rol: true, createdAt: true, updatedAt: true };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.usuario.findMany({ select: SELECT, orderBy: { createdAt: 'desc' } });
  }

  findOne(id: number) {
    return this.prisma.usuario.findUnique({ where: { id }, select: SELECT });
  }

  getRoles() {
    return this.prisma.rol.findMany({ orderBy: { id: 'asc' } });
  }

  async create(data: any) {
    const exists = await this.prisma.usuario.findUnique({ where: { correo: data.correo } });
    if (exists) throw new ConflictException('Ya existe un usuario con ese correo');

    const hash = await bcrypt.hash(data.contrasena, 12);
    const usuario = await this.prisma.usuario.create({
      data: { nombre: data.nombre, correo: data.correo, contrasena: hash, rolId: Number(data.rolId), activo: data.activo ?? true },
      select: SELECT,
    });
    return usuario;
  }

  async update(id: number, data: any) {
    const payload: any = {};
    if (data.nombre !== undefined) payload.nombre = data.nombre;
    if (data.correo !== undefined) {
      const dup = await this.prisma.usuario.findUnique({ where: { correo: data.correo } });
      if (dup && dup.id !== id) throw new ConflictException('Ya existe un usuario con ese correo');
      payload.correo = data.correo;
    }
    if (data.rolId !== undefined) payload.rolId = Number(data.rolId);
    if (data.activo !== undefined) payload.activo = data.activo;
    if (data.contrasena) payload.contrasena = await bcrypt.hash(data.contrasena, 12);

    return this.prisma.usuario.update({ where: { id }, data: payload, select: SELECT });
  }
}
