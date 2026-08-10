import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ type: String, default: null })
  size!: string | null;
}
export const CartItemSchema = SchemaFactory.createForClass(CartItem);

export type CartDocument = HydratedDocument<Cart>;

/**
 * A cart belongs to either a signed-in user or an anonymous session — never
 * both. Prices are deliberately *not* stored here; totals are recomputed from
 * live product documents on every read so a stale client cannot dictate price.
 */
@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  user!: Types.ObjectId | null;

  @Prop({ type: String, default: null, index: true })
  sessionId!: string | null;

  @Prop({ type: [CartItemSchema], default: [] })
  items!: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
