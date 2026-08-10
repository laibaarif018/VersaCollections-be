import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApplicationStatus, MembershipTier } from '../../common/enums';
import { applyJsonTransform } from '../../common/schema-transform';

export type MembershipApplicationDocument = HydratedDocument<MembershipApplication>;

@Schema({ timestamps: true })
export class MembershipApplication {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ type: String, enum: MembershipTier, required: true })
  tier!: MembershipTier;

  @Prop({ default: '', trim: true })
  message!: string;

  @Prop({ type: String, enum: ApplicationStatus, default: ApplicationStatus.Pending, index: true })
  status!: ApplicationStatus;

  /** Linked when the applicant already holds an account. */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  user!: Types.ObjectId | null;

  @Prop({ default: '' })
  reviewNote!: string;
}

export const MembershipApplicationSchema =
  SchemaFactory.createForClass(MembershipApplication);

applyJsonTransform(MembershipApplicationSchema);
