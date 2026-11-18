import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailCodeDeliveryStrategy } from './strategies/email-code-delivery.strategy';

const CODE_TTL_MIN = 10;
const DEVICE_TRUST_DAYS = 30;
const MAX_ATTEMPTS = 5;

export type UserType = 'usuario' | 'cliente';
export type Purpose = 'login' | 'enable' | 'register';

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService, private delivery: EmailCodeDeliveryStrategy) {}

  private generateCode(): string {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  // Crea un código de un solo uso y lo manda por correo. Se usa tanto para
  // pedir el código de login como para confirmar la activación de 2FA.
  async createChallenge(userType: UserType, userId: number, email: string, nombre: string, purpose: Purpose): Promise<string> {
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const challenge = await this.prisma.twoFactorChallenge.create({
      data: { userType, userId, purpose, codeHash, expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60000) },
    });
    await this.delivery.deliver(email, nombre, code, purpose);
    return challenge.id;
  }

  // Verifica el código de un desafío pendiente. El mensaje de error es
  // siempre el mismo (código inválido o vencido) sin importar la causa real
  // (no existe, ya se usó, venció, superó intentos, no coincide) para no dar
  // pistas a quien esté probando a fuerza bruta.
  async verifyChallenge(challengeId: string, code: string, purpose: Purpose): Promise<{ userType: UserType; userId: number }> {
    const invalid = () => new UnauthorizedException('Código inválido o vencido');
    const challenge = await this.prisma.twoFactorChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.purpose !== purpose || challenge.consumedAt || challenge.expiresAt < new Date() || challenge.attempts >= MAX_ATTEMPTS) {
      throw invalid();
    }
    const ok = await bcrypt.compare(code, challenge.codeHash);
    if (!ok) {
      await this.prisma.twoFactorChallenge.update({ where: { id: challengeId }, data: { attempts: { increment: 1 } } });
      throw invalid();
    }
    await this.prisma.twoFactorChallenge.update({ where: { id: challengeId }, data: { consumedAt: new Date() } });
    return { userType: challenge.userType as UserType, userId: challenge.userId };
  }

  // ¿El deviceToken que mandó el navegador corresponde a un dispositivo
  // recordado y vigente para este usuario?
  async isDeviceTrusted(userType: UserType, userId: number, deviceToken?: string | null): Promise<boolean> {
    if (!deviceToken) return false;
    const device = await this.prisma.trustedDevice.findUnique({ where: { tokenHash: this.hashToken(deviceToken) } });
    return !!device && device.userType === userType && device.userId === userId && device.expiresAt > new Date();
  }

  // Genera un token nuevo de "dispositivo recordado" (30 días) y lo guarda
  // hasheado en la BD — el valor en claro solo viaja al navegador, una vez.
  async trustDevice(userType: UserType, userId: number, userAgent?: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('hex');
    await this.prisma.trustedDevice.create({
      data: { userType, userId, tokenHash: this.hashToken(raw), userAgent, expiresAt: new Date(Date.now() + DEVICE_TRUST_DAYS * 86400000) },
    });
    return raw;
  }

  async setEnabled(userType: UserType, userId: number, enabled: boolean): Promise<void> {
    if (userType === 'cliente') await this.prisma.cliente.update({ where: { id: userId }, data: { twoFactorEnabled: enabled } });
    else await this.prisma.usuario.update({ where: { id: userId }, data: { twoFactorEnabled: enabled } });
    if (!enabled) {
      // Al desactivar se revocan los dispositivos recordados — si se vuelve
      // a activar más adelante, hay que volver a confiar en el dispositivo.
      await this.prisma.trustedDevice.deleteMany({ where: { userType, userId } });
    }
  }
}
