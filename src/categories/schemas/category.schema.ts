import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { applyJsonTransform } from '../../common/schema-transform';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ default: '' })
  heroImage!: string;

  /** Controls the order categories appear in storefront navigation. */
  @Prop({ default: 0 })
  sortOrder!: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

applyJsonTransform(CategorySchema);
