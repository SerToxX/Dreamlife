import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PosService } from './pos.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('POS')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'worker')
@Controller('pos')
export class PosController {
  constructor(private service: PosService) {}
  @Post('caja/open') openCaja(@Body() body: any, @CurrentUser('id') uid: number) { return this.service.openCaja(uid, body.ubicacionId, body.montoInicial); }
  @Post('caja/:id/close') closeCaja(@Param('id', ParseIntPipe) id: number, @Body('montoFinal') mf: number) { return this.service.closeCaja(id, mf); }
  @Get('caja/actual') getCajaAbierta(@CurrentUser('id') uid: number) { return this.service.getCajaAbierta(uid); }
  @Post('sale') sale(@Body() body: any, @CurrentUser('id') uid: number) { return this.service.sale({ ...body, usuarioId: uid }); }
  @Get('cajas') getCajas(@CurrentUser('id') uid: number, @CurrentUser('rol') rol: string) { return this.service.getCajas(rol === 'admin' ? undefined : uid); }
}
