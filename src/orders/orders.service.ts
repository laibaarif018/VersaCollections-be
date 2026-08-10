import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderItem } from './schemas/order.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';
import { CreateOrderDto, OrderQueryDto } from './dto/order.dto';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { MembershipTier, ORDER_STATUS_TRANSITIONS, OrderStatus } from '../common/enums';
import { Paginated, paginate } from '../common/dto/pagination.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
  ) {}

  private async nextOrderNumber(): Promise<string> {
    const counter = await this.counterModel
      .findOneAndUpdate({ key: 'order' }, { $inc: { value: 1 } }, { new: true, upsert: true })
      .exec();
    return `VC-${String(counter.value).padStart(5, '0')}`;
  }

  /**
   * Turns the signed-in shopper's bag into an order.
   *
   * Stock is taken with an atomic conditional decrement per line; if any line
   * cannot be satisfied, every decrement already applied in this attempt is
   * put back before the request fails, so a partial checkout never strands
   * inventory. (Mongo transactions would be tidier but require a replica set,
   * which a bare Atlas free tier does not guarantee.)
   */
  async createFromCart(userId: string, dto: CreateOrderDto): Promise<OrderDocument> {
    const cart = await this.cartService.get({ userId });
    if (cart.items.length === 0) throw new BadRequestException('Your bag is empty');

    const user = await this.usersService.findByIdOrFail(userId);
    const restricted = cart.items.filter((i) => i.membershipOnly);
    if (restricted.length > 0 && user.membershipTier === MembershipTier.None) {
      throw new ForbiddenException(
        `${restricted.map((i) => i.name).join(', ')} — reserved for members. Request an invitation to proceed.`,
      );
    }

    const taken: { productId: string; quantity: number }[] = [];
    try {
      for (const line of cart.items) {
        const ok = await this.productsService.decrementStock(line.productId, line.quantity);
        if (!ok) throw new BadRequestException(`${line.name} is no longer available in that quantity`);
        taken.push({ productId: line.productId, quantity: line.quantity });
      }
    } catch (error) {
      await Promise.all(
        taken.map((t) => this.productsService.incrementStock(t.productId, t.quantity)),
      );
      throw error;
    }

    const items: OrderItem[] = cart.items.map((line) => ({
      product: new Types.ObjectId(line.productId),
      name: line.name,
      slug: line.slug,
      image: line.image,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      size: line.size,
      lineTotal: line.lineTotal,
    }));

    const order = await this.orderModel.create({
      orderNumber: await this.nextOrderNumber(),
      user: new Types.ObjectId(userId),
      email: dto.email,
      phone: dto.phone ?? '',
      items,
      shippingAddress: { line2: '', region: '', ...dto.shippingAddress },
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      total: cart.total,
      currency: cart.currency,
      status: OrderStatus.Pending,
      note: dto.note ?? '',
    });

    await this.cartService.clear({ userId });
    return order;
  }

  async findMine(userId: string, query: OrderQueryDto): Promise<Paginated<OrderDocument>> {
    const filter: QueryFilter<OrderDocument> = { user: new Types.ObjectId(userId) };
    if (query.status) filter.status = query.status;
    return this.paginateOrders(filter, query);
  }

  async findAll(query: OrderQueryDto): Promise<Paginated<OrderDocument>> {
    const filter: QueryFilter<OrderDocument> = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      const rx = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ orderNumber: rx }, { email: rx }];
    }
    return this.paginateOrders(filter, query);
  }

  private async paginateOrders(
    filter: QueryFilter<OrderDocument>,
    query: OrderQueryDto,
  ): Promise<Paginated<OrderDocument>> {
    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOneForUser(id: string, userId: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findOne({ _id: id, user: new Types.ObjectId(userId) })
      .exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findOne(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Enforces the ORDER_STATUS_TRANSITIONS map and restocks on cancellation. */
  async updateStatus(id: string, next: OrderStatus): Promise<OrderDocument> {
    const order = await this.findOne(id);
    if (order.status === next) return order;

    const allowed = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot move an order from "${order.status}" to "${next}". Allowed: ${
          allowed.length ? allowed.join(', ') : 'none — this status is final'
        }`,
      );
    }

    if (next === OrderStatus.Cancelled && !order.stockReleased) {
      await Promise.all(
        order.items.map((item) => this.productsService.incrementStock(item.product, item.quantity)),
      );
      order.stockReleased = true;
    }

    order.status = next;
    await order.save();
    return order;
  }

  async stats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    revenue: number;
    currency: string;
  }> {
    const [totalOrders, pendingOrders, revenueAgg] = await Promise.all([
      this.orderModel.countDocuments().exec(),
      this.orderModel.countDocuments({ status: OrderStatus.Pending }).exec(),
      this.orderModel
        .aggregate<{ _id: null; revenue: number }>([
          { $match: { status: { $ne: OrderStatus.Cancelled } } },
          { $group: { _id: null, revenue: { $sum: '$total' } } },
        ])
        .exec(),
    ]);

    return {
      totalOrders,
      pendingOrders,
      revenue: revenueAgg[0]?.revenue ?? 0,
      currency: 'USD',
    };
  }
}
