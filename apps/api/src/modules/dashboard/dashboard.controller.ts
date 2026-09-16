import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'worker')
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('summary')
  getSummary(@Query('periodo') periodo?: string) {
    return this.service.getSummary(periodo || 'mes');
  }

  @Get('sales-chart')
  getSalesChart(@Query('periodo') periodo?: string) {
    return this.service.getSalesChart(periodo || 'semana');
  }

  @Get('top-products')
  getTopProducts(@Query('periodo') periodo?: string, @Query('limit') limit?: number) {
    return this.service.getTopProducts(periodo || 'mes', limit ? +limit : 5);
  }

  @Get('expenses-by-category')
  getExpensesByCategory(@Query('periodo') periodo?: string) {
    return this.service.getExpensesByCategory(periodo || 'mes');
  }

  @Get('revenue-by-channel')
  getRevenueByChannel(@Query('periodo') periodo?: string) {
    return this.service.getRevenueByChannel(periodo || 'mes');
  }

  @Get('stock-health')
  getStockHealth() {
    return this.service.getStockHealth();
  }
}
