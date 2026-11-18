import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterClienteDto } from './dto/register-cliente.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifyTwoFactorDto, VerifyEmailDto } from '../two-factor/dto/two-factor.dto';
import { UserType } from '../two-factor/two-factor.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Límite estricto para frenar fuerza bruta: 5 intentos por minuto por IP
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login/admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login para admin y workers' })
  loginAdmin(@Body() dto: LoginDto) {
    return this.authService.loginUsuario(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login para clientes ecommerce' })
  loginCliente(@Body() dto: LoginDto) {
    return this.authService.loginCliente(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Registro de nuevo cliente' })
  register(@Body() dto: RegisterClienteDto) {
    return this.authService.registerCliente(dto);
  }

  // Segundo paso del login con 2FA — pública porque todavía no hay token en
  // este punto; mismo límite estricto que el login normal.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifica el código de 2FA y recién ahí emite los tokens' })
  verify2FA(@Body() dto: VerifyTwoFactorDto, @Req() req: Request) {
    return this.authService.verifyLogin2FA(dto.challengeId, dto.code, !!dto.rememberDevice, req.headers['user-agent']);
  }

  // Confirma el código que llegó al registrarse. Pública porque se llama
  // justo después de crear la cuenta, con el challengeId que devolvió
  // /register — en la práctica el cliente ya tiene tokens desde el registro,
  // pero esta ruta en sí no depende de eso.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma el código de verificación de correo mandado al registrarse' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.challengeId, dto.code);
  }

  @Post('verify-email/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenvía el código de verificación de correo' })
  resendEmailVerification(@CurrentUser('id') id: number) {
    return this.authService.resendEmailVerification(id);
  }

  @Get('email-verification/status')
  @ApiOperation({ summary: 'Estado de verificación de correo de la cuenta actual' })
  emailVerificationStatus(@CurrentUser() user: { id: number; type: UserType }) {
    return this.authService.emailVerificationStatus(user.type, user.id);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener nuevo access token' })
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refreshToken(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body('refreshToken') token: string) {
    return this.authService.logout(token);
  }
}
