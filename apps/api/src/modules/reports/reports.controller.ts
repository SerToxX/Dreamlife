import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseFromDate, parseToDate } from '../../common/utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('sales') getSales(@Query('from') f: string, @Query('to') t: string) {
    return this.service.getSales(parseFromDate(f) ?? new Date(0), parseToDate(t) ?? new Date());
  }
  @Get('top-products') getTop(@Query('from') f?: string, @Query('to') t?: string, @Query('limit') l?: number) {
    return this.service.getTopProducts(parseFromDate(f), parseToDate(t), l ? +l : 10);
  }
  @Get('by-location') byLocation(@Query('from') f?: string, @Query('to') t?: string) {
    return this.service.getSalesByLocation(parseFromDate(f), parseToDate(t));
  }
  @Get('by-channel') byChannel(@Query('from') f?: string, @Query('to') t?: string) {
    return this.service.getSalesByChannel(parseFromDate(f), parseToDate(t));
  }

  // Serie temporal de ingresos/egresos
  @Get('financial-chart') financialChart(@Query('from') f: string, @Query('to') t: string) {
    return this.service.getFinancialChart(parseFromDate(f) ?? new Date(0), parseToDate(t) ?? new Date());
  }
  @Get('expenses-by-category') expensesByCategory(@Query('from') f: string, @Query('to') t: string) {
    return this.service.getExpensesByCategory(parseFromDate(f) ?? new Date(0), parseToDate(t) ?? new Date());
  }
  @Get('summary') summary(@Query('from') f: string, @Query('to') t: string) {
    return this.service.getSummary(parseFromDate(f) ?? new Date(0), parseToDate(t) ?? new Date());
  }
}
