import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderEmailKind, OrderStatus } from '../../common/enums';
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
  @Prop({ type: String, default: null }) image!: string | null;
  @Prop({ required: true }) unitPrice!: number;
  @Prop({ required: true }) quantity!: number;
  @Prop({ type: String, default: null }) size!: string | null;
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

/** A record that one of the transactional emails reached the mail server. */
@Schema({ _id: false })
export class SentEmail {
  @Prop({ type: String, enum: OrderEmailKind, required: true })
  kind!: OrderEmailKind;

  @Prop({ required: true })
  sentAt!: Date;

  /** The address at the time — an account can change email later. */
  @Prop({ required: true })
  to!: string;
}
export const OrderEmailSchema = SchemaFactory.createForClass(SentEmail);

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true, index: true })
  orderNumber!: string;

  /**
   * Null on a guest order until it is claimed. Checkout does not require an
   * account, so ownership is established by one of three things: this ref, the
   * guest session that placed it, or the access token below.
   */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  user!: Types.ObjectId | null;

  /** The `vc_sid` of the browser that placed a guest order; cleared on claim. */
  @Prop({ type: String, default: null, index: true })
  guestSessionId!: string | null;

  /**
   * Unguessable handle that lets a guest reopen their order — and therefore the
   * payment instructions — without an account. Order numbers are sequential and
   * cannot serve this purpose. Never serialised: see `applyJsonTransform` below.
   */
  @Prop({ required: true, index: true })
  accessToken!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ default: '' })
  phone!: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items!: OrderItem[];

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress!: ShippingAddress;

  /** Garments only — collected cash on delivery. */
  @Prop({ required: true }) subtotal!: number;
  /** The delivery charge, frozen at order time and paid in advance. */
  @Prop({ required: true }) shipping!: number;
  @Prop({ required: true }) total!: number;
  @Prop({ default: 'PKR' }) currency!: string;

  /**
   * Whether the customer's advance delivery-charge transfer has been seen.
   * Flipped by an admin after checking the screenshot sent on WhatsApp; an
   * order cannot be confirmed for dispatch until it is true.
   */
  @Prop({ default: false, index: true })
  deliveryPaid!: boolean;

  @Prop({ type: Date, default: null })
  deliveryPaidAt!: Date | null;

  /** Transaction id or note the admin types when reconciling the payment. */
  @Prop({ default: '', trim: true })
  paymentReference!: string;

  /** Captured when the order is marked shipped, and shown in the email. */
  @Prop({ default: '', trim: true })
  courier!: string;

  @Prop({ default: '', trim: true })
  trackingNumber!: string;

  /**
   * What the customer has actually been sent. Written only on a successful
   * send, so the admin panel can show gaps and offer a resend rather than
   * assuming an email arrived.
   */
  @Prop({ type: [OrderEmailSchema], default: [] })
  emails!: SentEmail[];

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.Pending, index: true })
  status!: OrderStatus;

  @Prop({ default: '' })
  note!: string;

  /** Set when stock has been returned, so a double-cancel cannot double-restock. */
  @Prop({ default: false })
  stockReleased!: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// The token is the guest's password to this order — it is handed back once, by
// the create endpoint, and never appears in any other response.
applyJsonTransform(OrderSchema, ['accessToken']);
