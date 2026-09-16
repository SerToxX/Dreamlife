import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterClienteDto } from './dto/register-cliente.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ── Login de usuario interno (admin / worker) ──────────
  async loginUsuario(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
      include: { rol: true },
    });
    if (!user || !user.activo) throw new UnauthorizedException('Credenciales inválidas');
    const valid = await bcrypt.compare(dto.contrasena, user.contrasena);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return this.generateTokens({ sub: user.id, correo: user.correo, rol: user.rol.nombre, type: 'usuario' });
  }

  // ── Login de cliente ecommerce ─────────────────────────
  async loginCliente(dto: LoginDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { correo: dto.correo },
    });
    if (!cliente || !cliente.activo) throw new UnauthorizedException('Credenciales inválidas');
    const valid = await bcrypt.compare(dto.contrasena, cliente.contrasena);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return this.generateClienteTokens({ sub: cliente.id, correo: cliente.correo, rol: 'customer', type: 'cliente' });
  }

  // ── Registro de cliente ────────────────────────────────
  async registerCliente(dto: RegisterClienteDto) {
    const exists = await this.prisma.cliente.findUnique({ where: { correo: dto.correo } });
    if (exists) throw new ConflictException('El correo ya está registrado');

    if (dto.dni) {
      const dniExists = await this.prisma.cliente.findUnique({ where: { dni: dto.dni } });
      if (dniExists) throw new ConflictException('Ya existe una cuenta registrada con ese DNI');
    }

    const hash = await bcrypt.hash(dto.contrasena, 12);
    const cliente = await this.prisma.cliente.create({
      data: {
        nombre: dto.nombre,
        apellido: dto.apellido,
        dni: dto.dni,
        correo: dto.correo,
        telefono: dto.telefono,
        direccion: dto.direccion,
        contrasena: hash,
      },
    });

    const { contrasena, ...result } = cliente;
    return result;
  }

  // ── Refresh token ──────────────────────────────────────
  async refreshToken(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      if (payload.type === 'usuario') {
        const rt = await this.prisma.refreshToken.findUnique({ where: { token } });
        if (!rt || rt.expiresAt < new Date()) throw new UnauthorizedException();
        return this.generateTokens(payload);
      } else {
        const rt = await this.prisma.clienteRefreshToken.findUnique({ where: { token } });
        if (!rt || rt.expiresAt < new Date()) throw new UnauthorizedException();
        return this.generateClienteTokens(payload);
      }
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  // ── Logout ─────────────────────────────────────────────
  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
    await this.prisma.clienteRefreshToken.deleteMany({ where: { token } }).catch(() => {});
    return { message: 'Sesión cerrada' };
  }

  // ── Privados ───────────────────────────────────────────
  private async generateTokens(payload: any) {
    const accessToken = this.jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: payload.sub,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, tipo: 'usuario' };
  }

  private async generateClienteTokens(payload: any) {
    const accessToken = this.jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    await this.prisma.clienteRefreshToken.create({
      data: {
        token: refreshToken,
        clienteId: payload.sub,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, tipo: 'cliente' };
  }
}
