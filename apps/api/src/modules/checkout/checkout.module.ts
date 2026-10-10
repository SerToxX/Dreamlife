import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({ imports: [NotificationsModule, InventoryModule, PaymentsModule], controllers: [CheckoutController], providers: [CheckoutService] })
export class CheckoutModule {}
