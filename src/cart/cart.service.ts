import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { ProductDocument } from '../products/schemas/product.schema';
import { Product } from '../products/schemas/product.schema';
import { ProductStatus } from '../common/enums';

export interface CartOwner {
  userId?: string;
  sessionId?: string;
}

export interface CartLineView {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  size: string | null;
  lineTotal: number;
  /** Stock currently on hand — lets the storefront warn before checkout fails. */
  available: number;
  membershipOnly: boolean;
}

export interface CartView {
  items: CartLineView[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
}

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly config: ConfigService,
  ) {}

  private ownerFilter(owner: CartOwner) {
    if (owner.userId) return { user: new Types.ObjectId(owner.userId) };
    if (owner.sessionId) return { sessionId: owner.sessionId };
    throw new BadRequestException('No cart owner could be resolved');
  }

  async getOrCreate(owner: CartOwner): Promise<CartDocument> {
    const filter = this.ownerFilter(owner);
    const existing = await this.cartModel.findOne(filter).exec();
    if (existing) return existing;

    return this.cartModel.create({
      user: owner.userId ? new Types.ObjectId(owner.userId) : null,
      sessionId: owner.userId ? null : (owner.sessionId ?? null),
      items: [],
    });
  }

  async add(owner: CartOwner, dto: AddToCartDto): Promise<CartView> {
    const product = await this.productModel.findById(dto.productId).exec();
    if (!product || product.status !== ProductStatus.Published) {
      throw new NotFoundException('Product is not available');
    }
    if (product.sizes.length > 0 && !dto.size) {
      throw new BadRequestException('A size must be chosen for this piece');
    }
    if (dto.size && product.sizes.length > 0 && !product.sizes.includes(dto.size)) {
      throw new BadRequestException(`Size "${dto.size}" is not offered for this piece`);
    }

    const cart = await this.getOrCreate(owner);
    const size = dto.size ?? null;
    const line = cart.items.find(
      (i) => i.product.toString() === dto.productId && (i.size ?? null) === size,
    );

    const desired = (line?.quantity ?? 0) + dto.quantity;
    if (desired > product.stock) {
      throw new BadRequestException(
        product.stock === 0
          ? 'This piece is currently unavailable'
          : `Only ${product.stock} remaining`,
      );
    }

    if (line) {
      line.quantity = desired;
    } else {
      cart.items.push({ product: new Types.ObjectId(dto.productId), quantity: dto.quantity, size });
    }

    await cart.save();
    return this.toView(cart);
  }

  async updateItem(
    owner: CartOwner,
    productId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartView> {
    const cart = await this.getOrCreate(owner);
    const size = dto.size ?? null;
    const index = cart.items.findIndex(
      (i) => i.product.toString() === productId && (i.size ?? null) === size,
    );
    if (index === -1) throw new NotFoundException('That line is not in your bag');

    if (dto.quantity === 0) {
      cart.items.splice(index, 1);
    } else {
      const product = await this.productModel.findById(productId).exec();
      if (!product) throw new NotFoundException('Product is not available');
      if (dto.quantity > product.stock) {
        throw new BadRequestException(`Only ${product.stock} remaining`);
      }
      cart.items[index].quantity = dto.quantity;
    }

    await cart.save();
    return this.toView(cart);
  }

  async removeItem(owner: CartOwner, productId: string, size?: string): Promise<CartView> {
    const cart = await this.getOrCreate(owner);
    const target = size ?? null;
    cart.items = cart.items.filter(
      (i) => !(i.product.toString() === productId && (i.size ?? null) === target),
    );
    await cart.save();
    return this.toView(cart);
  }

  async clear(owner: CartOwner): Promise<CartView> {
    const cart = await this.getOrCreate(owner);
    cart.items = [];
    await cart.save();
    return this.toView(cart);
  }

  async get(owner: CartOwner): Promise<CartView> {
    return this.toView(await this.getOrCreate(owner));
  }

  /**
   * Called on sign-in. Guest lines are folded into the account cart (quantities
   * summed, capped at available stock) and the guest cart is discarded.
   */
  async mergeGuestCartIntoUser(sessionId: string, userId: string): Promise<void> {
    const guestCart = await this.cartModel.findOne({ sessionId }).exec();
    if (!guestCart || guestCart.items.length === 0) {
      await this.cartModel.deleteOne({ sessionId }).exec();
      return;
    }

    const userCart = await this.getOrCreate({ userId });

    for (const guestLine of guestCart.items) {
      const size = guestLine.size ?? null;
      const existing = userCart.items.find(
        (i) => i.product.toString() === guestLine.product.toString() && (i.size ?? null) === size,
      );
      const product = await this.productModel.findById(guestLine.product).exec();
      const cap = product?.stock ?? 0;
      if (cap === 0) continue;

      if (existing) {
        existing.quantity = Math.min(existing.quantity + guestLine.quantity, cap);
      } else {
        userCart.items.push({
          product: guestLine.product,
          quantity: Math.min(guestLine.quantity, cap),
          size,
        });
      }
    }

    await userCart.save();
    await this.cartModel.deleteOne({ _id: guestCart._id }).exec();
  }

  /**
   * Builds the client-facing cart. Any line whose product has been deleted or
   * unpublished is dropped here rather than silently priced at zero.
   */
  async toView(cart: CartDocument): Promise<CartView> {
    const currency = this.config.getOrThrow<string>('app.currency');
    const flatShipping = this.config.getOrThrow<number>('app.shippingFlatRate');
    const freeThreshold = this.config.getOrThrow<number>('app.freeShippingThreshold');

    const products = await this.productModel
      .find({ _id: { $in: cart.items.map((i) => i.product) } })
      .exec();
    const byId = new Map(products.map((p) => [(p._id as Types.ObjectId).toString(), p]));

    const lines: CartLineView[] = [];
    let staleLineFound = false;

    for (const item of cart.items) {
      const product = byId.get(item.product.toString());
      if (!product || product.status !== ProductStatus.Published) {
        staleLineFound = true;
        continue;
      }
      lines.push({
        productId: (product._id as Types.ObjectId).toString(),
        slug: product.slug,
        name: product.name,
        image: product.images[0]?.url ?? null,
        unitPrice: product.price,
        quantity: item.quantity,
        size: item.size ?? null,
        lineTotal: product.price * item.quantity,
        available: product.stock,
        membershipOnly: product.membershipOnly,
      });
    }

    if (staleLineFound) {
      cart.items = cart.items.filter((i) => {
        const p = byId.get(i.product.toString());
        return p && p.status === ProductStatus.Published;
      });
      await cart.save();
    }

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const shipping = subtotal === 0 || subtotal >= freeThreshold ? 0 : flatShipping;

    return {
      items: lines,
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal,
      shipping,
      total: subtotal + shipping,
      currency,
    };
  }
}
