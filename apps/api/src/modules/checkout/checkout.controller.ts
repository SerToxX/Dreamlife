import { Controller, Post, Body, UseGuards, ForbiddenException } from '@nestjs/common';
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
}
