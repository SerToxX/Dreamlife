import { Controller, Get, Post, Body, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { TwoFactorService, UserType } from './two-factor.service';
import { ConfirmEnableTwoFactorDto, DisableTwoFactorDto } from './dto/two-factor.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  correo: string;
  rol: string;
  type: UserType;
}

// Autoservicio: activar/desactivar 2FA desde "Mi perfil" / "Ajustes" — rutas
// normales (requieren sesión), a diferencia de /auth/2fa/verify que es
// pública porque se usa ANTES de tener un token.
@ApiTags('Two Factor')
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private twoFactor: TwoFactorService, private prisma: PrismaService) {}

  private async findAccount(userType: UserType, id: number) {
    return userType === 'cliente'
      ? this.prisma.cliente.findUnique({ where: { id } })
      : this.prisma.usuario.findUnique({ where: { id } });
  }

  @Get('status')
  @ApiOperation({ summary: 'Estado de 2FA de la cuenta actual' })
  async status(@CurrentUser() user: AuthUser) {
    const account = await this.findAccount(user.type, user.id);
    if (!account) throw new NotFoundException();
    return { enabled: account.twoFactorEnabled, correo: account.correo };
  }

  @Post('enable/request')
  @ApiOperation({ summary: 'Pide un código por correo para confirmar la activación de 2FA' })
  async requestEnable(@CurrentUser() user: AuthUser) {
    const account = await this.findAccount(user.type, user.id);
    if (!account) throw new NotFoundException();
    const nombre = 'nombre' in account ? account.nombre : '';
    const challengeId = await this.twoFactor.createChallenge(user.type, user.id, account.correo, nombre, 'enable');
    return { challengeId };
  }

  @Post('enable/confirm')
  @ApiOperation({ summary: 'Confirma el código y activa 2FA' })
  async confirmEnable(@Body() dto: ConfirmEnableTwoFactorDto, @CurrentUser() user: AuthUser) {
    const { userType, userId } = await this.twoFactor.verifyChallenge(dto.challengeId, dto.code, 'enable');
    // El desafío de activación solo puede confirmar la 2FA de quien lo pidió.
    if (userType !== user.type || userId !== user.id) throw new UnauthorizedException('Código inválido o vencido');
    await this.twoFactor.setEnabled(userType, userId, true);
    return { enabled: true };
  }

  @Post('disable')
  @ApiOperation({ summary: 'Desactiva 2FA (requiere confirmar con la contraseña actual)' })
  async disable(@Body() dto: DisableTwoFactorDto, @CurrentUser() user: AuthUser) {
    const account = await this.findAccount(user.type, user.id);
    if (!account) throw new NotFoundException();
    const ok = await bcrypt.compare(dto.contrasena, account.contrasena);
    if (!ok) throw new UnauthorizedException('Contraseña incorrecta');
    await this.twoFactor.setEnabled(user.type, user.id, false);
    return { enabled: false };
  }
}
