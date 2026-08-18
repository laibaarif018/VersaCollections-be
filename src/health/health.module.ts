import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [UsersModule, ProductsModule, CategoriesModule, OrdersModule],
  controllers: [HealthController],
})
export class HealthModule {}
