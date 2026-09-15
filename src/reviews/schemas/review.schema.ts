import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ReviewStatus } from '../../common/enums';
import { applyJsonTransform } from '../../common/schema-transform';

export type ReviewDocument = HydratedDocument<Review>;

/**
 * One customer's rating and comment on one product. A customer may hold at
 * most one review per product (enforced by the compound unique index below);
 * editing it resets `status` back to `Pending` so the updated text is
 * re-moderated rather than grandfathered in on the old approval.
 *
 * `reviewerName` is a frozen snapshot, the same reasoning as `OrderItem`
 * freezing the product name it was bought under: a later profile name change
 * must never rewrite what earlier reviews are attributed to.
 */
@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  reviewerName!: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ default: '', trim: true, maxlength: 2000 })
  comment!: string;

  /** Recomputed from order history on every submit, so an order that
   *  delivers after the review was first left still earns the badge. */
  @Prop({ default: false })
  verifiedPurchase!: boolean;

  @Prop({
    type: String,
    enum: ReviewStatus,
    default: ReviewStatus.Pending,
    index: true,
  })
  status!: ReviewStatus;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// One review per customer per product — resubmitting edits it in place.
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

applyJsonTransform(ReviewSchema);
