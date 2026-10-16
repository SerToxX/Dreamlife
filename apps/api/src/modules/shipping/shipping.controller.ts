import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ShippingService } from './shipping.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Shipping')
@ApiBearerAuth()
@Controller('zonas-envio')
export class ShippingController {
  constructor(private service: ShippingService) {}

  // Checkout público: solo zonas activas, para que el cliente elija la suya.
  @Public() @Get()
  findPublic() { return this.service.findPublic(); }

  // Panel admin: incluye zonas inactivas para poder reactivarlas/editarlas.
  // Solo el rol administrador puede gestionar zonas de envío.
  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  findAllAdmin() { return this.service.findAllAdmin(); }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  create(@Body() body: any) { return this.service.create(body); }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
