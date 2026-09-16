import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { FinanceModule } from '../finance/finance.module';
import { ExcelModule } from '../../common/excel/excel.module';
@Module({ imports: [FinanceModule, ExcelModule], controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
