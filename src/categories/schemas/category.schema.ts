import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { applyJsonTransform } from '../../common/schema-transform';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug!: string;

  /**
   * Self-reference that turns the flat list into a two-level tree:
   * `null` is a top-level collection (Women, Kids), anything else is one of
   * its subcategories (Kurtis, Lawn Suits). The depth cap lives in
   * `CategoriesService.assertValidParent` — the schema itself would happily
   * nest forever, but the storefront and admin UI are built for two levels.
   */
  @Prop({ type: Types.ObjectId, ref: 'Category', default: null, index: true })
  parent!: Types.ObjectId | null;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ default: '' })
  heroImage!: string;

  /** Cloudinary public id for `heroImage` — see `ProductImage.publicId`. */
  @Prop({ default: '' })
  heroImagePublicId!: string;

  /** Controls the order categories appear in storefront navigation. */
  @Prop({ default: 0 })
  sortOrder!: number;

  /**
   * Whether this category is shown on the public storefront (homepage tiles,
   * nav, footer, /collections index). Admin tooling always sees every
   * category regardless of this flag — it only gates the public-facing
   * pages, so a collection can be prepped with products before it launches.
   */
  @Prop({ default: true })
  isActive!: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

applyJsonTransform(CategorySchema);
