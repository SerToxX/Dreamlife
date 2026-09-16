import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query, ForbiddenException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from './cart.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private service: CartService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getCart(@CurrentUser('id') clienteId: number, @Query('sessionId') sessionId?: string) {
    return this.service.getOrCreate(clienteId, sessionId);
  }

  @Public()
  @Get('session')
  getSessionCart(@Query('sessionId') sessionId: string) {
    return this.service.getOrCreate(undefined, sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('items')
  async addItem(@Body() body: { carritoId: number; itemId: number; cantidad: number }, @CurrentUser('id') clienteId: number) {
    await this.assertOwnsCarrito(body.carritoId, clienteId);
    return this.service.addItem(body.carritoId, body.itemId, body.cantidad);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('items/:id')
  async updateItem(@Param('id', ParseIntPipe) id: number, @Body('cantidad') cantidad: number, @Body('carritoId', ParseIntPipe) carritoId: number, @CurrentUser('id') clienteId: number) {
    await this.assertOwnsCarrito(carritoId, clienteId);
    return this.service.updateItem(id, cantidad);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('items/:id')
  async removeItem(@Param('id', ParseIntPipe) id: number, @Query('carritoId', ParseIntPipe) carritoId: number, @CurrentUser('id') clienteId: number) {
    await this.assertOwnsCarrito(carritoId, clienteId);
    return this.service.removeItem(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':carritoId/clear')
  async clear(@Param('carritoId', ParseIntPipe) carritoId: number, @CurrentUser('id') clienteId: number) {
    await this.assertOwnsCarrito(carritoId, clienteId);
    return this.service.clear(carritoId);
  }

  // Evita que un cliente autenticado manipule el carrito de otro cliente
  // adivinando/incrementando el id (IDOR).
  private async assertOwnsCarrito(carritoId: number, clienteId: number) {
    const carrito = await this.service.findById(carritoId);
    if (!carrito || carrito.clienteId !== clienteId) {
      throw new ForbiddenException('Este carrito no te pertenece');
    }
  }
}
