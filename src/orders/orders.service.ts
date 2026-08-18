import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { Order, OrderDocument, OrderItem } from './schemas/order.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';
import { CreateOrderDto, OrderQueryDto } from './dto/order.dto';
import { CartOwner, CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { OrderNotifierService } from './order-notifier.service';
import { OrderEmailKind, ORDER_STATUS_TRANSITIONS, OrderStatus } from '../common/enums';
import { Paginated, paginate } from '../common/dto/pagination.dto';

/**
 * Which status change tells the customer something. Delivered and cancelled
 * are deliberately silent — a delivered parcel is self-evident, and a
 * cancellation is a conversation, not a template.
 */
const EMAIL_FOR_STATUS: Partial<Record<OrderStatus, OrderEmailKind>> = {
  [OrderStatus.Confirmed]: OrderEmailKind.Confirmed,
  [OrderStatus.Shipped]: OrderEmailKind.Dispatched,
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
    private readonly notifier: OrderNotifierService,
    private readonly config: ConfigService,
  ) {}

  private async nextOrderNumber(): Promise<string> {
    const counter = await this.counterModel
      .findOneAndUpdate({ key: 'order' }, { $inc: { value: 1 } }, { returnDocument: 'after', upsert: true })
      .exec();
    return `VC-${String(counter.value).padStart(5, '0')}`;
  }

  /**
   * Turns a bag into an order. The bag may belong to a signed-in shopper or to
   * an anonymous guest session — checkout does not require an account.
   *
   * Stock is taken with an atomic conditional decrement per line; if any line
   * cannot be satisfied, every decrement already applied in this attempt is
   * put back before the request fails, so a partial checkout never strands
   * inventory. (Mongo transactions would be tidier but require a replica set,
   * which a bare Atlas free tier does not guarantee.)
   */
  async createFromCart(owner: CartOwner, dto: CreateOrderDto): Promise<OrderDocument> {
    const cart = await this.cartService.get(owner);
    if (cart.items.length === 0) throw new BadRequestException('Your bag is empty');

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
      user: owner.userId ? new Types.ObjectId(owner.userId) : null,
      guestSessionId: owner.userId ? null : (owner.sessionId ?? null),
      // 24 random bytes — this is the only credential a guest has for the order.
      accessToken: randomBytes(24).toString('base64url'),
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

    await this.cartService.clear(owner);

    // Not awaited: the shopper is waiting on this response, and an SMTP round
    // trip would sit in front of their payment instructions for no reason. The
    // notifier swallows its own errors and records only what actually sent.
    void this.notifier.notify(order, OrderEmailKind.Placed);

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

  /** Guest orders placed from this browser and not yet claimed by an account. */
  async findForSession(sessionId: string, query: OrderQueryDto): Promise<Paginated<OrderDocument>> {
    // `user: null` matters — once an order is claimed it must drop off the guest
    // list, or the next person to use this browser would still see it.
    const filter: QueryFilter<OrderDocument> = { guestSessionId: sessionId, user: null };
    if (query.status) filter.status = query.status;
    return this.paginateOrders(filter, query);
  }

  async findOneForUser(id: string, userId: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findOne({ _id: id, user: new Types.ObjectId(userId) })
      .exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Guest access to a single order, by either credential a guest can hold: the
   * token from their checkout link, or the browser session that placed it —
   * the latter is what makes the order reachable from the guest list without
   * putting tokens into a second response.
   *
   * A mismatch returns the same 404 as a missing order. Never a "wrong token"
   * message, which would confirm the id exists and invite guessing.
   */
  async findOneForGuest(id: string, token?: string, sessionId?: string): Promise<OrderDocument> {
    const or: QueryFilter<OrderDocument>[] = [];
    if (token) or.push({ accessToken: token });
    if (sessionId) or.push({ guestSessionId: sessionId, user: null });
    if (or.length === 0) throw new NotFoundException('Order not found');

    const order = await this.orderModel.findOne({ _id: id, $or: or }).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Attaches unclaimed guest orders to an account, on register or sign-in.
   *
   * Two routes in: the browser session that placed the order (proof of
   * possession, cannot be faked) and a matching email address. The email route
   * is what catches an order placed on a phone and an account opened on a
   * laptop — but note it trusts an address nobody has verified, so it is only
   * as strong as the sign-up flow. Add email verification before this carries
   * anything sensitive.
   */
  async claimForUser(userId: string, email: string, sessionId?: string): Promise<number> {
    const or: QueryFilter<OrderDocument>[] = [{ email: email.toLowerCase() }];
    if (sessionId) or.push({ guestSessionId: sessionId });

    const result = await this.orderModel
      .updateMany(
        { user: null, $or: or },
        { $set: { user: new Types.ObjectId(userId), guestSessionId: null } },
      )
      .exec();

    if (result.modifiedCount > 0) {
      this.logger.log(`Claimed ${result.modifiedCount} guest order(s) for user ${userId}`);
    }
    return result.modifiedCount;
  }

  async findOne(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Records that the customer's advance delivery-charge transfer has landed.
   * There is no payment gateway — an admin reconciles the screenshot sent on
   * WhatsApp against their account and flips this by hand.
   */
  async markDeliveryPayment(
    id: string,
    paid: boolean,
    reference?: string,
  ): Promise<OrderDocument> {
    const order = await this.findOne(id);

    const wasUnpaid = !order.deliveryPaid;

    order.deliveryPaid = paid;
    order.deliveryPaidAt = paid ? new Date() : null;
    if (reference !== undefined) order.paymentReference = reference;
    // Clearing the flag clears the reference too, so a mistaken entry does not
    // linger next to an order that is once again unpaid.
    if (!paid && reference === undefined) order.paymentReference = '';

    await order.save();

    // Only on the transition into paid — re-saving a reference on an already
    // paid order must not thank the customer twice.
    if (paid && wasUnpaid) {
      await this.notifier.notify(order, OrderEmailKind.PaymentReceived);
    }

    return order;
  }

  /**
   * Enforces the ORDER_STATUS_TRANSITIONS map, restocks on cancellation, and
   * tells the customer what happened.
   *
   * `dispatch` is only meaningful on the move to shipped: it carries the
   * courier and tracking number the customer needs to chase the parcel.
   */
  async updateStatus(
    id: string,
    next: OrderStatus,
    dispatch?: { courier?: string; trackingNumber?: string },
  ): Promise<OrderDocument> {
    const order = await this.findOne(id);
    if (order.status === next) return order;

    // Nothing ships before the delivery charge is in. The `shipping > 0` clause
    // matters: with the charge set to zero there is nothing to prepay, and the
    // order must still be confirmable.
    if (next === OrderStatus.Confirmed && order.shipping > 0 && !order.deliveryPaid) {
      throw new BadRequestException(
        'The delivery charge has not been paid yet. Mark it received before confirming this order.',
      );
    }

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

    if (next === OrderStatus.Shipped && dispatch) {
      if (dispatch.courier !== undefined) order.courier = dispatch.courier.trim();
      if (dispatch.trackingNumber !== undefined) {
        order.trackingNumber = dispatch.trackingNumber.trim();
      }
    }

    order.status = next;
    await order.save();

    // Awaited, unlike the checkout email: this is an admin action, and they
    // should see whether the customer was actually told before moving on.
    const email = EMAIL_FOR_STATUS[next];
    if (email) await this.notifier.notify(order, email);

    return order;
  }

  /** Re-sends one of the transactional emails, for when a customer never got it. */
  async resendEmail(id: string, kind: OrderEmailKind): Promise<{ sent: boolean }> {
    const order = await this.findOne(id);
    return { sent: await this.notifier.notify(order, kind) };
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
      currency: this.config.getOrThrow<string>('app.currency'),
    };
  }
}
