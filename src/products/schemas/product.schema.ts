import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductStatus, StitchType } from '../../common/enums';
import { applyJsonTransform } from '../../common/schema-transform';

@Schema({ _id: false })
export class ProductImage {
  @Prop({ required: true }) url!: string;
  @Prop({ required: true }) alt!: string;
  /**
   * The Cloudinary public id, kept alongside the URL because moving or deleting
   * an asset needs it, and recovering it by parsing a delivery URL is fragile —
   * the version segment is optional and transformations may be embedded.
   * Empty for anything predating Cloudinary.
   */
  @Prop({ default: '' }) publicId!: string;
}
export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);

/** A colourway offered for a garment; `hex` drives the swatch on the product page. */
@Schema({ _id: false })
export class ProductColor {
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ required: true, trim: true, lowercase: true }) hex!: string;
}
export const ProductColorSchema = SchemaFactory.createForClass(ProductColor);

/**
 * One row of the size guide. Measurements are stored as free text ("38 in",
 * "96 cm") because they are copy for a shopper to read, never arithmetic.
 */
@Schema({ _id: false })
export class SizeChartRow {
  @Prop({ required: true, trim: true }) size!: string;
  @Prop({ default: '', trim: true }) chest!: string;
  @Prop({ default: '', trim: true }) waist!: string;
  @Prop({ default: '', trim: true }) length!: string;
  @Prop({ default: '', trim: true }) sleeve!: string;
}
export const SizeChartRowSchema = SchemaFactory.createForClass(SizeChartRow);

export type ProductDocument = HydratedDocument<Product>;

/**
 * Money is stored in minor units (paisa) as integers throughout the API —
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

  @Prop({ type: Number, default: null })
  compareAtPrice!: number | null;

  @Prop({ default: 'PKR' })
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

  @Prop({ type: [ProductColorSchema], default: [] })
  colors!: ProductColor[];

  /** e.g. "Lawn", "Chiffon", "Khaddar" — indexed so it can be filtered on later. */
  @Prop({ default: '', trim: true, index: true })
  fabric!: string;

  @Prop({ type: String, enum: StitchType, default: StitchType.NotApplicable, index: true })
  stitchType!: StitchType;

  @Prop({ type: [SizeChartRowSchema], default: [] })
  sizeChart!: SizeChartRow[];

  @Prop({ default: 0, min: 0 })
  stock!: number;

  @Prop({ default: false, index: true })
  isFeatured!: boolean;

  @Prop({ default: false })
  isExclusive!: boolean;

  @Prop({ type: [String], default: [], index: true })
  tags!: string[];

  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.Published, index: true })
  status!: ProductStatus;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

applyJsonTransform(ProductSchema);
