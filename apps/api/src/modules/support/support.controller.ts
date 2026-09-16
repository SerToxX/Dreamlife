import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { SupportService } from './support.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private service: SupportService) {}

  // ── Reclamaciones ──
  // Sin límite de tasa, cualquiera podía inundar la tabla de reclamaciones
  // llamando este endpoint público en bucle. Igual que en /auth, se limita
  // por IP.
  @Public() @Throttle({ default: { limit: 5, ttl: 60000 } }) @Post('reclamaciones')
  createReclamacion(@Body() body: any) {
    return this.service.createReclamacion(body);
  }

  @Get('reclamaciones')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  listReclamaciones() {
    return this.service.listReclamaciones();
  }

  @Patch('reclamaciones/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  updateReclamacion(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateReclamacion(id, body);
  }

  // ── Contacto ──
  @Public() @Throttle({ default: { limit: 5, ttl: 60000 } }) @Post('contacto')
  createContacto(@Body() body: any) {
    return this.service.createContacto(body);
  }

  @Get('contactos')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  listContactos() {
    return this.service.listContactos();
  }

  @Patch('contactos/:id/leido')
  @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  marcarLeido(@Param('id', ParseIntPipe) id: number) {
    return this.service.marcarLeido(id);
  }
}
