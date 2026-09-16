import { Controller, Get, Patch, Delete, Param, Query, Body, ParseIntPipe, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Get() @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  myOrders(@CurrentUser('id') id: number) { return this.service.findAll({ clienteId: id }); }

  // Un cliente solo puede ver su propio pedido; admin/worker pueden ver cualquiera.
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    const order = await this.service.findOne(id);
    if (user?.type === 'cliente' && order.clienteId !== user.id) {
      throw new ForbiddenException('Este pedido no te pertenece');
    }
    return order;
  }

  @Patch(':id/status') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: string) {
    return this.service.updateStatus(id, estado);
  }

  // Vincula un pedido huérfano (sin cliente) a una cuenta existente por correo
  @Patch(':id/link-customer') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  linkCustomer(@Param('id', ParseIntPipe) id: number, @Body('correo') correo: string) {
    return this.service.linkToCustomer(id, correo);
  }

  @Delete(':id/cancel') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  cancel(@Param('id', ParseIntPipe) id: number) { return this.service.cancel(id); }
}
