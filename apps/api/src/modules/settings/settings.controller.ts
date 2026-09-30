import { Controller, Get, Patch, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private service: SettingsService) {}

  // Consultado por el middleware del sitio público en cada request para
  // saber si debe mostrar la pantalla de mantenimiento — sin auth.
  @Public() @Get('maintenance')
  getMaintenance() {
    return this.service.getMaintenance();
  }

  @Patch('maintenance')
  @ApiBearerAuth() @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
  setMaintenance(@Body() body: { activo: boolean; mensaje?: string }) {
    if (typeof body?.activo !== 'boolean') throw new BadRequestException('El campo "activo" es obligatorio y debe ser booleano');
    return this.service.setMaintenance(body.activo, body.mensaje?.trim() || undefined);
  }
}
