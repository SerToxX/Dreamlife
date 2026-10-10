import { Controller, Post, Get, Param, ParseIntPipe, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CheckoutService } from './checkout.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Checkout')
@ApiBearerAuth()
@Controller('checkout')
export class CheckoutController {
  constructor(private service: CheckoutService) {}

  // Solo clientes con cuenta y sesión iniciada pueden comprar (no se permite checkout anónimo)
  @UseGuards(AuthGuard('jwt'))
  @Post()
  process(@Body() dto: any, @CurrentUser() user: any) {
    if (user?.type !== 'cliente') {
      throw new ForbiddenException('Debes iniciar sesión con una cuenta de cliente para comprar');
    }
    return this.service.process(dto, user.id);
  }

  // Pago con tarjeta (Checkout Pro): registra la venta como pendiente y
  // devuelve init_point para redirigir al comprador a Mercado Pago.
  @UseGuards(AuthGuard('jwt'))
  @Post('preferencia')
  crearPreferencia(@Body() dto: any, @CurrentUser() user: any) {
    if (user?.type !== 'cliente') {
      throw new ForbiddenException('Debes iniciar sesión con una cuenta de cliente para comprar');
    }
    return this.service.crearPreferencia(dto, user.id);
  }

  // Lo llama la página de retorno de Checkout Pro para confirmar el pago
  // (verificado siempre contra la API de Mercado Pago, nunca por query params).
  @UseGuards(AuthGuard('jwt'))
  @Get('confirmar/:id')
  confirmar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.confirmarPreferencia(id, user.id);
  }
}
