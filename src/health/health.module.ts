import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { OrdersModule } from '../orders/orders.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [UsersModule, ProductsModule, CategoriesModule, OrdersModule, MembershipModule],
  controllers: [HealthController],
})
export class HealthModule {}
