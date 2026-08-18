import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { Counter, CounterSchema } from './schemas/counter.schema';
import { OrdersService } from './orders.service';
import { OrderNotifierService } from './order-notifier.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { MailModule } from '../mail/mail.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    CartModule,
    ProductsModule,
    // Customer emails: the transport, and the payment details the first one
    // has to quote.
    MailModule,
    SettingsModule,
  ],
  providers: [OrdersService, OrderNotifierService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
