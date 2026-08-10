import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductStatus } from '../../common/enums';
import { applyJsonTransform } from '../../common/schema-transform';

@Schema({ _id: false })
export class ProductImage {
  @Prop({ required: true }) url!: string;
  @Prop({ required: true }) alt!: string;
}
export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);

export type ProductDocument = HydratedDocument<Product>;

/**
 * Money is stored in minor units (cents) as integers throughout the API —
 * floats and currency do not mix. The storefront formats on display.
 */
@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true, index: 'text' })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  /** Long-form provenance copy used by the storytelling sections. */
  @Prop({ default: '', trim: true })
  story!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ default: null })
  compareAtPrice!: number | null;

  @Prop({ default: 'USD' })
  currency!: string;

  @Prop({ type: [ProductImageSchema], default: [] })
  images!: ProductImage[];

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  category!: Types.ObjectId;

  /** Editorial line (e.g. "Nocturne", "Atelier Reserve") — distinct from category. */
  @Prop({ default: '', trim: true, index: true })
  line!: string;

  @Prop({ type: [String], default: [] })
  materials!: string[];

  @Prop({ type: [String], default: [] })
  sizes!: string[];

  @Prop({ default: 0, min: 0 })
  stock!: number;

  @Prop({ default: false, index: true })
  isFeatured!: boolean;

  @Prop({ default: false })
  isExclusive!: boolean;

  /** Visible to everyone, but only purchasable by members. */
  @Prop({ default: false })
  membershipOnly!: boolean;

  @Prop({ type: [String], default: [], index: true })
  tags!: string[];

  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.Published, index: true })
  status!: ProductStatus;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

applyJsonTransform(ProductSchema);
