import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  MarkDeliveryPaymentDto,
  OrderQueryDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OrderEmailKind, Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ensureSessionId } from '../auth/cookies';
import { SESSION_COOKIE } from '../auth/auth.constants';
import type { CartOwner } from '../cart/cart.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Mirrors `CartController.owner` — the bag and the order must agree on who owns them. */
  private owner(user: AuthUser | null, req: Request, res: Response): CartOwner {
    if (user) return { userId: user.id };
    return { sessionId: ensureSessionId(req, res) };
  }

  /**
   * Public so guests can check out. The global guard still decodes the access
   * cookie when present, so a signed-in shopper's order is attributed to them.
   *
   * This is the one response that carries `accessToken` — the guest's only way
   * back to the order, and therefore to the payment instructions.
   */
  @Public()
  @Post()
  @ApiOperation({ summary: 'Place an order from the current bag (guest or signed in)' })
  async create(
    @CurrentUser() user: AuthUser | null,
    @Body() dto: CreateOrderDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const order = await this.ordersService.createFromCart(this.owner(user, req, res), dto);
    return { ...order.toJSON(), accessToken: user ? undefined : order.accessToken };
  }

  /** Guest orders placed from this browser, for the 30-day life of `vc_sid`. */
  @Public()
  @Get('guest')
  @ApiOperation({ summary: 'Unclaimed orders placed from this browser' })
  async findGuest(
    @CurrentUser() user: AuthUser | null,
    @Query() query: OrderQueryDto,
    @Req() req: Request,
  ) {
    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    // No cookie means no guest orders — do not mint one just to read a list.
    if (user || !sessionId) {
      return { items: [], total: 0, page: query.page, limit: query.limit, pages: 0 };
    }
    const result = await this.ordersService.findForSession(sessionId, query);
    return { ...result, items: result.items.map((o) => o.toJSON()) };
  }

  /** Guest access to one order, by unguessable token or by the placing browser. */
  @Public()
  @Get('track/:id')
  @ApiOperation({ summary: 'Read a guest order by access token or placing session' })
  async track(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
  ) {
    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    return (await this.ordersService.findOneForGuest(id, token, sessionId)).toJSON();
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
    const order = await this.ordersService.updateStatus(id, dto.status, {
      courier: dto.courier,
      trackingNumber: dto.trackingNumber,
    });
    return order.toJSON();
  }

  /** For when a customer says an email never arrived. */
  @Post(':id/emails/:kind')
  @Roles(Role.Admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend one of the order emails (admin)' })
  @ApiParam({ name: 'kind', enum: OrderEmailKind })
  async resendEmail(@Param('id') id: string, @Param('kind') kind: string) {
    if (!Object.values(OrderEmailKind).includes(kind as OrderEmailKind)) {
      throw new BadRequestException(
        `Unknown email "${kind}". Expected one of: ${Object.values(OrderEmailKind).join(', ')}`,
      );
    }
    return this.ordersService.resendEmail(id, kind as OrderEmailKind);
  }

  @Patch(':id/payment')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Record the advance delivery-charge payment (admin)' })
  async markPayment(@Param('id') id: string, @Body() dto: MarkDeliveryPaymentDto) {
    return (await this.ordersService.markDeliveryPayment(id, dto.paid, dto.reference)).toJSON();
  }
}
