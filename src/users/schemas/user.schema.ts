import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MembershipTier, Role } from '../../common/enums';
import { applyJsonTransform } from '../../common/schema-transform';

@Schema({ _id: false })
export class Address {
  @Prop({ required: true, trim: true }) line1!: string;
  @Prop({ trim: true }) line2?: string;
  @Prop({ required: true, trim: true }) city!: string;
  @Prop({ trim: true }) region?: string;
  @Prop({ required: true, trim: true }) postalCode!: string;
  @Prop({ required: true, trim: true }) country!: string;
}
export const AddressSchema = SchemaFactory.createForClass(Address);

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ type: String, enum: Role, default: Role.Customer, index: true })
  role!: Role;

  @Prop({ type: String, enum: MembershipTier, default: MembershipTier.None })
  membershipTier!: MembershipTier;

  @Prop({ type: [AddressSchema], default: [] })
  addresses!: Address[];

  /** bcrypt hash of the live refresh token; cleared on logout. */
  @Prop({ default: null })
  refreshTokenHash!: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Never let the password or refresh hash escape through a JSON response.
applyJsonTransform(UserSchema, ['passwordHash', 'refreshTokenHash']);
