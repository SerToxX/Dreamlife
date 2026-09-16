import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CustomOrdersService } from './custom-orders.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Custom Orders')
@ApiBearerAuth()
@Controller('custom-orders')
export class CustomOrdersController {
  constructor(private service: CustomOrdersService) {}

  // Admin/Worker: listar todos
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  findAll() { return this.service.findAll(); }

  // Cliente autenticado: ver sus propios pedidos
  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  findMy(@CurrentUser('id') clienteId: number) { return this.service.findByCliente(clienteId); }

  // Un cliente solo puede ver su propia solicitud; admin/worker pueden ver cualquiera.
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    const pedido = await this.service.findOne(id);
    if (!pedido) throw new NotFoundException('Solicitud no encontrada');
    if (user?.type === 'cliente' && pedido.clienteId !== user.id) {
      throw new ForbiddenException('Esta solicitud no te pertenece');
    }
    return pedido;
  }

  // Cliente autenticado: solicita uno o varios diseños personalizados a la vez
  // (ej. 2 camisetas + 1 taza), agrupados para cotizar y pagar juntos.
  @UseGuards(AuthGuard('jwt'))
  @Post('batch')
  createBatch(@Body('items') items: any[], @CurrentUser() user: any) {
    if (user?.type !== 'cliente') {
      throw new ForbiddenException('Debes iniciar sesión con una cuenta de cliente para solicitar un diseño personalizado');
    }
    return this.service.createBatch(user.id, items);
  }

  // Admin actualiza estado/precio
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.update(id, body);
  }

  // Cliente paga TODAS las cotizaciones de un grupo (ej. sus 3 productos
  // personalizados) en un solo pago, con los mismos datos que pide el
  // checkout normal del catálogo.
  @Post('group/:grupoId/pay')
  @UseGuards(AuthGuard('jwt'))
  payGroup(@Param('grupoId') grupoId: string, @Body() body: any, @CurrentUser() user: any) {
    if (user?.type !== 'cliente') {
      throw new ForbiddenException('Debes iniciar sesión con una cuenta de cliente para pagar');
    }
    return this.service.pagarGrupo(grupoId, user.id, body);
  }

  // Cliente: ve el detalle de su grupo (para la página de checkout dedicada)
  @Get('group/:grupoId')
  @UseGuards(AuthGuard('jwt'))
  async getGroup(@Param('grupoId') grupoId: string, @CurrentUser() user: any) {
    const items = await this.service.findByGrupo(grupoId);
    if (!items.length) throw new NotFoundException('Grupo no encontrado');
    if (user?.type === 'cliente' && items.some((it) => it.clienteId !== user.id)) {
      throw new ForbiddenException('Este grupo no te pertenece');
    }
    return items;
  }
}
