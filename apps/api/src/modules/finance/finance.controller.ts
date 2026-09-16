import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FinanceService } from './finance.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { parseFromDate, parseToDate } from '../../common/utils/date-range.util';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@Controller('finance')
export class FinanceController {
  constructor(private service: FinanceService) {}

  @Get('summary')
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getResumen(parseFromDate(from), parseToDate(to));
  }

  @Get('serie')
  getSerie(
    @Query('granularidad') granularidad?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getSerie((granularidad as any) || 'mes', parseFromDate(from), parseToDate(to));
  }

  @Get('ingresos')
  getIngresos(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('categoria') categoria?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getIngresos({
      from: parseFromDate(from),
      to: parseToDate(to),
      categoria: categoria || undefined,
      search: search || undefined,
    });
  }

  @Post('ingresos')
  createIngreso(@Body() body: any, @CurrentUser('id') uid: number) {
    return this.service.createIngreso({ ...body, usuarioId: uid });
  }

  @Get('gastos')
  getGastos(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('categoria') categoria?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getGastos({
      from: parseFromDate(from),
      to: parseToDate(to),
      categoria: categoria || undefined,
      search: search || undefined,
    });
  }

  @Post('gastos')
  createGasto(@Body() body: any, @CurrentUser('id') uid: number) {
    return this.service.createGasto({ ...body, usuarioId: uid });
  }
}
