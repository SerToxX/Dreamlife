import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Public() @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoriaId') categoriaId?: number,
    @Query('destacado') destacado?: boolean,
  ) {
    return this.productsService.findAll({ page, limit, search, categoriaId, destacado });
  }

  @Public() @Get('featured')
  getFeatured() { return this.productsService.getFeatured(); }

  // Buscador liviano de SKUs, usado por el admin al armar una campaña de ofertas
  @Get('items/search')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  searchItems(@Query('search') search?: string) { return this.productsService.searchItems(search); }

  @Public() @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.productsService.findOne(id); }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  create(@Body() dto: CreateProductDto) { return this.productsService.create(dto); }

  @Post(':id/items')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  createItem(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.productsService.createItem(id, body);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin', 'worker')
  remove(@Param('id', ParseIntPipe) id: number) { return this.productsService.remove(id); }
}
