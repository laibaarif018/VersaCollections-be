import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EditorialLayout, HeroSlideKind } from '../../common/enums';
import { applyJsonTransform } from '../../common/schema-transform';

export type SettingsDocument = HydratedDocument<Settings>;

/** The one document this collection ever holds, addressed by a fixed key. */
export const SETTINGS_KEY = 'store';

/**
 * The scrolling band's opening copy. Short, factual lines about the label —
 * every one of them is meant to be rewritten from the admin panel.
 */
export const DEFAULT_MARQUEE = [
  'Lahore, Pakistan',
  'Established 2026',
  'Cloth chosen by hand',
  'Stitched and unstitched',
  'Delivered across Pakistan',
];

/** A mobile-wallet account — EasyPaisa and JazzCash share the same shape. */
@Schema({ _id: false })
export class WalletAccount {
  @Prop({ default: false }) enabled!: boolean;
  @Prop({ default: '', trim: true }) accountTitle!: string;
  @Prop({ default: '', trim: true }) number!: string;
}
export const WalletAccountSchema = SchemaFactory.createForClass(WalletAccount);

@Schema({ _id: false })
export class BankAccount {
  @Prop({ default: false }) enabled!: boolean;
  @Prop({ default: '', trim: true }) bankName!: string;
  @Prop({ default: '', trim: true }) accountTitle!: string;
  @Prop({ default: '', trim: true }) accountNumber!: string;
  @Prop({ default: '', trim: true }) iban!: string;
}
export const BankAccountSchema = SchemaFactory.createForClass(BankAccount);

/** One frame of the landing hero: an uploaded image or an uploaded video. */
@Schema({ _id: false })
export class HeroSlide {
  @Prop({ type: String, enum: HeroSlideKind, required: true })
  kind!: HeroSlideKind;

  @Prop({ required: true, trim: true }) url!: string;
  @Prop({ default: '', trim: true }) alt!: string;
  /** Cloudinary public id — see the note on `ProductImage.publicId`. */
  @Prop({ default: '', trim: true }) publicId!: string;
}
export const HeroSlideSchema = SchemaFactory.createForClass(HeroSlide);

/**
 * Everything about the landing hero that the admin can change without a
 * deploy. Empty `slides` is meaningful: the storefront falls back to its
 * built-in editorial photograph rather than rendering an empty black box.
 */
@Schema({ _id: false })
export class HeroContent {
  @Prop({ default: 'Autumn — Winter 2026', trim: true })
  eyebrow!: string;

  /** Newline-separated; each line renders as its own line in the statement. */
  @Prop({ default: 'Made slowly.\nKept for decades.', trim: true })
  heading!: string;

  /** 0–100. How dark the gradient over the media is; 65 is the original design. */
  @Prop({ default: 65, min: 0, max: 100 })
  overlayOpacity!: number;

  /** Seconds an image holds before advancing. Videos ignore it and play out. */
  @Prop({ default: 6, min: 2 })
  slideSeconds!: number;

  @Prop({ type: [HeroSlideSchema], default: [] })
  slides!: HeroSlide[];
}
export const HeroContentSchema = SchemaFactory.createForClass(HeroContent);

/**
 * One of the editorial bands further down the landing page — a photograph with
 * a line of copy beside or over it.
 *
 * An empty `editorial` array is meaningful: the storefront falls back to its
 * built-in blocks rather than losing three sections of the page.
 */
@Schema({ _id: false })
export class EditorialBlock {
  @Prop({ type: String, enum: EditorialLayout, default: EditorialLayout.ImageLeft })
  layout!: EditorialLayout;

  @Prop({ default: '', trim: true }) imageUrl!: string;
  @Prop({ default: '', trim: true }) imagePublicId!: string;
  @Prop({ default: '', trim: true }) imageAlt!: string;

  @Prop({ default: '', trim: true }) eyebrow!: string;
  @Prop({ default: '', trim: true }) heading!: string;
  /** Ignored by the full-bleed layout, which has no room for body copy. */
  @Prop({ default: '', trim: true }) body!: string;

  @Prop({ default: '', trim: true }) linkLabel!: string;
  @Prop({ default: '', trim: true }) linkHref!: string;
}
export const EditorialBlockSchema = SchemaFactory.createForClass(EditorialBlock);

/**
 * The parts of the landing page that are only words: the scrolling band under
 * the hero, and the heading over each product grid.
 *
 * The defaults are the copy the site actually shows, so an admin opening the
 * form sees the current page rather than empty boxes. An empty marquee hides
 * the band altogether, which is a legitimate choice rather than an oversight.
 */
@Schema({ _id: false })
export class HomeSections {
  @Prop({ type: [String], default: () => [...DEFAULT_MARQUEE] })
  marquee!: string[];

  /** Over the four featured pieces, directly under the collection tiles. */
  @Prop({ default: 'This season', trim: true }) featuredTitle!: string;
  @Prop({ default: 'View all', trim: true }) featuredLinkLabel!: string;

  /** Over the newest eight, at the foot of the page. */
  @Prop({ default: 'New in', trim: true }) newestTitle!: string;
  @Prop({ default: 'View all', trim: true }) newestLinkLabel!: string;
}
export const HomeSectionsSchema = SchemaFactory.createForClass(HomeSections);

/**
 * Store settings the admin can change without a deploy.
 *
 * This is a singleton: exactly one document, keyed `store`, materialised by
 * `SettingsService.get()` on first read — the same keyed-upsert trick the order
 * counter uses. It exists because these values used to live in `.env` behind
 * `ConfigService`, which is constructed with `cache: true` and so cannot be
 * changed without restarting the API.
 */
@Schema({ timestamps: true })
export class Settings {
  @Prop({ required: true, unique: true, default: SETTINGS_KEY })
  key!: string;

  /** Delivery charge in minor units (paisa). 25000 = Rs 250. Flat, every order. */
  @Prop({ required: true, default: 25000, min: 0 })
  deliveryCharge!: number;

  /** Free-text shown above the account details on the order page. */
  @Prop({ default: '', trim: true })
  paymentInstructions!: string;

  /** Where customers send their payment screenshot, as the admin typed it. */
  @Prop({ default: '', trim: true })
  whatsappNumber!: string;

  @Prop({ type: WalletAccountSchema, default: () => ({}) })
  easypaisa!: WalletAccount;

  @Prop({ type: WalletAccountSchema, default: () => ({}) })
  jazzcash!: WalletAccount;

  @Prop({ type: BankAccountSchema, default: () => ({}) })
  bank!: BankAccount;

  // `default: () => ({})` so an existing settings document materialises the
  // hero defaults the next time it is read, rather than returning undefined.
  @Prop({ type: HeroContentSchema, default: () => ({}) })
  hero!: HeroContent;

  /** Up to three; empty means the storefront uses its built-in blocks. */
  @Prop({ type: [EditorialBlockSchema], default: [] })
  editorial!: EditorialBlock[];

  @Prop({ type: HomeSectionsSchema, default: () => ({}) })
  home!: HomeSections;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);

applyJsonTransform(SettingsSchema);
