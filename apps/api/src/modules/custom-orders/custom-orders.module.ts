import { Module } from '@nestjs/common';
import { CustomOrdersController } from './custom-orders.controller';
import { CustomOrdersService } from './custom-orders.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CustomOrdersController],
  providers: [CustomOrdersService],
})
export class CustomOrdersModule {}
