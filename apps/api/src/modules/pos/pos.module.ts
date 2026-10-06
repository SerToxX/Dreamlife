import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryModule } from '../inventory/inventory.module';
@Module({ imports: [NotificationsModule, InventoryModule], controllers: [PosController], providers: [PosService] })
export class PosModule {}
