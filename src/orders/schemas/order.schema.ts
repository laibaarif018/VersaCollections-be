import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from '../../common/enums';
import { applyJsonTransform } from '../../common/schema-transform';

/**
 * A frozen copy of what was bought. Renaming or repricing a product later must
 * never rewrite history on an order already placed.
 */
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true }) product!: Types.ObjectId;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) slug!: string;
  @Prop({ default: null }) image!: string | null;
  @Prop({ required: true }) unitPrice!: number;
  @Prop({ required: true }) quantity!: number;
  @Prop({ default: null }) size!: string | null;
  @Prop({ required: true }) lineTotal!: number;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true }) fullName!: string;
  @Prop({ required: true }) line1!: string;
  @Prop({ default: '' }) line2!: string;
  @Prop({ required: true }) city!: string;
  @Prop({ default: '' }) region!: string;
  @Prop({ required: true }) postalCode!: string;
  @Prop({ required: true }) country!: string;
}
export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true, index: true })
  orderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ default: '' })
  phone!: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items!: OrderItem[];

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress!: ShippingAddress;

  @Prop({ required: true }) subtotal!: number;
  @Prop({ required: true }) shipping!: number;
  @Prop({ required: true }) total!: number;
  @Prop({ default: 'USD' }) currency!: string;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.Pending, index: true })
  status!: OrderStatus;

  @Prop({ default: '' })
  note!: string;

  /** Set when stock has been returned, so a double-cancel cannot double-restock. */
  @Prop({ default: false })
  stockReleased!: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

applyJsonTransform(OrderSchema);
