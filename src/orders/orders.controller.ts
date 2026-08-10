import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place an order from the signed-in shopper’s bag' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return (await this.ordersService.createFromCart(user.id, dto)).toJSON();
  }

  @Get('mine')
  @ApiOperation({ summary: 'Order history for the signed-in shopper' })
  async findMine(@CurrentUser() user: AuthUser, @Query() query: OrderQueryDto) {
    const result = await this.ordersService.findMine(user.id, query);
    return { ...result, items: result.items.map((o) => o.toJSON()) };
  }

  @Get('mine/:id')
  @ApiOperation({ summary: 'Read one of your own orders' })
  async findMineOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return (await this.ordersService.findOneForUser(id, user.id)).toJSON();
  }

  @Get('stats')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Order and revenue totals (admin)' })
  stats() {
    return this.ordersService.stats();
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List every order (admin)' })
  async findAll(@Query() query: OrderQueryDto) {
    const result = await this.ordersService.findAll(query);
    return { ...result, items: result.items.map((o) => o.toJSON()) };
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Read any order (admin)' })
  async findOne(@Param('id') id: string) {
    return (await this.ordersService.findOne(id)).toJSON();
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Advance an order through its lifecycle (admin)' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return (await this.ordersService.updateStatus(id, dto.status)).toJSON();
  }
}
