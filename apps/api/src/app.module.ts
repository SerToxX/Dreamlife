import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PosModule } from './modules/pos/pos.module';
import { FinanceModule } from './modules/finance/finance.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CustomOrdersModule } from './modules/custom-orders/custom-orders.module';
import { SupportModule } from './modules/support/support.module';
import { BackupModule } from './modules/backup/backup.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60000'),
      limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
    }]),
    PrismaModule,
    AuthModule, UsersModule, ProductsModule, CategoriesModule,
    InventoryModule, CartModule, CheckoutModule, OrdersModule,
    CustomersModule, PosModule, FinanceModule, MarketingModule,
    DashboardModule, ReportsModule, NotificationsModule,
    CustomOrdersModule, SupportModule, BackupModule,
  ],
  providers: [
    // ── Seguridad "fail-safe": por defecto TODO endpoint nuevo requiere
    // sesión válida, salvo que se marque explícitamente con @Public().
    // Antes dependía de que cada controlador recordara agregar el guard
    // manualmente — ya encontramos 2 casos donde no se hizo (checkout,
    // pedidos personalizados) y quedaron abiertos sin querer.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
