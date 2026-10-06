import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({ imports: [NotificationsModule, InventoryModule], controllers: [CheckoutController], providers: [CheckoutService] })
export class CheckoutModule {}
