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
import { revalidateWebPath } from '../../common/utils/revalidate.util';
import { TwoFactorService } from '../two-factor/two-factor.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private twoFactor: TwoFactorService,
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

    if (user.twoFactorEnabled && !(await this.twoFactor.isDeviceTrusted('usuario', user.id, dto.deviceToken))) {
      const challengeId = await this.twoFactor.createChallenge('usuario', user.id, user.correo, user.nombre, 'login');
      return { requires2FA: true, challengeId };
    }

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

    if (cliente.twoFactorEnabled && !(await this.twoFactor.isDeviceTrusted('cliente', cliente.id, dto.deviceToken))) {
      const challengeId = await this.twoFactor.createChallenge('cliente', cliente.id, cliente.correo, cliente.nombre, 'login');
      return { requires2FA: true, challengeId };
    }

    return this.generateClienteTokens({ sub: cliente.id, correo: cliente.correo, rol: 'customer', type: 'cliente' });
  }

  // Segundo paso del login cuando loginUsuario/loginCliente devolvió
  // requires2FA: el cliente manda el código que recibió por correo. Si es
  // válido, recién acá se emiten los tokens — igual que un login normal, más
  // "recordar este dispositivo" opcional.
  async verifyLogin2FA(challengeId: string, code: string, rememberDevice: boolean, userAgent?: string) {
    const { userType, userId } = await this.twoFactor.verifyChallenge(challengeId, code, 'login');
    const deviceToken = rememberDevice ? await this.twoFactor.trustDevice(userType, userId, userAgent) : undefined;

    if (userType === 'cliente') {
      const cliente = await this.prisma.cliente.findUniqueOrThrow({ where: { id: userId } });
      const tokens = await this.generateClienteTokens({ sub: cliente.id, correo: cliente.correo, rol: 'customer', type: 'cliente' });
      return { ...tokens, deviceToken };
    }
    const user = await this.prisma.usuario.findUniqueOrThrow({ where: { id: userId }, include: { rol: true } });
    const tokens = await this.generateTokens({ sub: user.id, correo: user.correo, rol: user.rol.nombre, type: 'usuario' });
    return { ...tokens, deviceToken };
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
        // NULL, no '' — la columna es única y MySQL sí permite varios NULL,
        // pero no varios '' repetidos. Con '' literal, el primer cliente que
        // deja el DNI en blanco "ocupa" ese valor y cualquier otro que haga
        // lo mismo después choca contra una unique constraint real.
        dni: dto.dni || null,
        correo: dto.correo,
        telefono: dto.telefono,
        direccion: dto.direccion,
        contrasena: hash,
      },
    });

    revalidateWebPath('/sobre-nosotros');

    // No bloquea el registro — la cuenta queda usable de inmediato, el
    // código de confirmación se manda aparte y se puede reenviar después.
    const verifyChallengeId = await this.twoFactor.createChallenge('cliente', cliente.id, cliente.correo, cliente.nombre, 'register');

    const { contrasena, ...result } = cliente;
    return { ...result, verifyChallengeId };
  }

  // Confirma el código que llegó al registrarse. Pública (sin guard) porque
  // el frontend la llama justo después de registrar, con el challengeId que
  // devolvió registerCliente, no con el JWT.
  async verifyEmail(challengeId: string, code: string) {
    const { userType, userId } = await this.twoFactor.verifyChallenge(challengeId, code, 'register');
    if (userType !== 'cliente') throw new UnauthorizedException('Código inválido o vencido');
    await this.prisma.cliente.update({ where: { id: userId }, data: { emailVerified: true } });
    return { verified: true };
  }

  // Reenvío — requiere sesión (se usa desde "Mi perfil" si el código original venció).
  async resendEmailVerification(clienteId: number) {
    const cliente = await this.prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } });
    if (cliente.emailVerified) return { alreadyVerified: true };
    const challengeId = await this.twoFactor.createChallenge('cliente', cliente.id, cliente.correo, cliente.nombre, 'register');
    return { challengeId };
  }

  // Estado actual — lo consulta "Mi perfil" vía React Query, mismo patrón
  // que /auth/2fa/status, en vez de confiar en el JWT (que no lleva este
  // campo y quedaría desactualizado hasta el próximo refresh).
  async emailVerificationStatus(userType: 'usuario' | 'cliente', userId: number) {
    if (userType !== 'cliente') return { verified: true, correo: null };
    const cliente = await this.prisma.cliente.findUniqueOrThrow({ where: { id: userId } });
    return { verified: cliente.emailVerified, correo: cliente.correo };
  }

  // ── Refresh token ──────────────────────────────────────
  async refreshToken(token: string) {
    try {
      const decoded = this.jwt.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      // jwt.verify() devuelve el payload con "exp"/"iat" ya incluidos —
      // hay que quitarlos antes de volver a firmar, porque jsonwebtoken
      // rechaza firmar un payload que ya trae "exp" junto con expiresIn.
      const { exp, iat, nbf, ...payload } = decoded as Record<string, any>;

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
