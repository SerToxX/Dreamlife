import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { MarketingService } from './marketing.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Marketing')
@ApiBearerAuth()
@Controller('marketing')
export class MarketingController {
  constructor(private service: MarketingService) {}

  @Public() @Get('ofertas')
  getOfertas() { return this.service.getOfertas(); }

  // Admin: ve todas las campañas (incluidas inactivas/vencidas), no solo las activas
  @Get('ofertas/admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  getOfertasAdmin() { return this.service.getOfertasAdmin(); }

  @Post('ofertas')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  createOferta(@Body() b: any) { return this.service.createOferta(b); }

  @Patch('ofertas/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  updateOferta(@Param('id', ParseIntPipe) id: number, @Body() b: any) { return this.service.updateOferta(id, b); }

  @Delete('ofertas/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  deleteOferta(@Param('id', ParseIntPipe) id: number) { return this.service.deleteOferta(id); }

  // Selecciona qué productos (SKUs) entran en la campaña de descuento
  @Post('ofertas/:id/items')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  addOfertaItems(@Param('id', ParseIntPipe) id: number, @Body('itemIds') itemIds: number[]) {
    return this.service.addOfertaItems(id, itemIds);
  }

  @Delete('ofertas/:id/items/:itemId')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  removeOfertaItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number) {
    return this.service.removeOfertaItem(id, itemId);
  }

  @Get('cupones')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  getCupones() { return this.service.getCupones(); }

  @Post('cupones')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  createCupon(@Body() b: any) { return this.service.createCupon(b); }

  // Sin límite, era posible probar códigos de cupón por fuerza bruta contra
  // este endpoint público (enumeración). Se limita por IP igual que /auth.
  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post('cupones/validate')
  validate(@Body('codigo') c: string) { return this.service.validateCupon(c); }
}
