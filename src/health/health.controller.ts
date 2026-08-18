import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { UsersService } from '../users/users.service';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import { OrdersService } from '../orders/orders.service';

const CONNECTION_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly usersService: UsersService,
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
    private readonly ordersService: OrdersService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness and database connectivity' })
  health() {
    return {
      status: 'ok',
      service: 'versaCollections-be',
      db: CONNECTION_STATES[this.connection.readyState] ?? 'unknown',
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  @Get('stats')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Dashboard counters (admin)' })
  async stats() {
    const [orderStats, products, published, categories, users] = await Promise.all([
      this.ordersService.stats(),
      this.productsService.countAll(),
      this.productsService.countPublished(),
      this.categoriesService.countAll(),
      this.usersService.countAll(),
    ]);

    return {
      ...orderStats,
      products,
      publishedProducts: published,
      categories,
      users,
    };
  }
}
