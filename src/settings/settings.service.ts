import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BankAccount,
  EditorialBlock,
  HeroContent,
  HomeSections,
  SETTINGS_KEY,
  Settings,
  SettingsDocument,
  WalletAccount,
} from './schemas/settings.schema';
import { UpdateSettingsDto } from './dto/settings.dto';

/**
 * What anyone may see: the fee the cart has to quote, and the landing hero.
 * Both are public content — the hero is literally the first thing on the site.
 */
export interface PublicSettings {
  deliveryCharge: number;
  currency: string;
  hero: HeroContent;
  editorial: EditorialBlock[];
  /** Marquee lines and product-row headings — words only, no media. */
  home: HomeSections;
}

/** What a signed-in customer sees on their order page, to pay the fee. */
export interface PaymentSettings {
  paymentInstructions: string;
  whatsappNumber: string;
  /** Digits only, country code included — ready for a `wa.me/<n>` link. */
  whatsappE164: string;
  easypaisa: WalletAccount | null;
  jazzcash: WalletAccount | null;
  bank: BankAccount | null;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>,
    private readonly config: ConfigService,
  ) {}

  /**
   * The singleton, created on first read with the schema defaults. Upserting
   * here rather than seeding means a fresh database serves sensible values
   * before an admin has ever opened the settings form.
   */
  async get(): Promise<SettingsDocument> {
    return this.settingsModel
      .findOneAndUpdate(
        { key: SETTINGS_KEY },
        {
          $setOnInsert: {
            key: SETTINGS_KEY,
            // SHIPPING_FLAT_RATE seeds the very first document and is never
            // consulted again — after this, the admin panel is the authority.
            deliveryCharge: this.config.getOrThrow<number>('app.shippingFlatRate'),
          },
        },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async update(dto: UpdateSettingsDto): Promise<SettingsDocument> {
    // Flattened to dot paths so patching one section does not blank the others:
    // `{ easypaisa: { enabled: true } }` as a whole-object $set would drop the
    // account title and number the admin had already saved.
    const patch = flatten(dto);

    return this.settingsModel
      .findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $set: patch, $setOnInsert: { key: SETTINGS_KEY } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  /** The single number the cart needs; kept narrow so callers cannot drift. */
  async deliveryCharge(): Promise<number> {
    return (await this.get()).deliveryCharge;
  }

  async publicView(): Promise<PublicSettings> {
    const settings = await this.get();
    return {
      deliveryCharge: settings.deliveryCharge,
      currency: this.config.getOrThrow<string>('app.currency'),
      hero: settings.hero,
      editorial: settings.editorial,
      home: settings.home,
    };
  }

  /**
   * Disabled methods are dropped here rather than filtered in the UI, so an
   * account number the admin has switched off never leaves the server.
   */
  async paymentView(): Promise<PaymentSettings> {
    const settings = await this.get();
    return {
      paymentInstructions: settings.paymentInstructions,
      whatsappNumber: settings.whatsappNumber,
      whatsappE164: toE164(settings.whatsappNumber),
      easypaisa: settings.easypaisa?.enabled ? settings.easypaisa : null,
      jazzcash: settings.jazzcash?.enabled ? settings.jazzcash : null,
      bank: settings.bank?.enabled ? settings.bank : null,
    };
  }
}

/**
 * Normalises a Pakistani mobile number to the digits `wa.me` expects.
 * "0300 1234567" and "+92 300 1234567" both become "923001234567".
 *
 * Done once here rather than in each frontend — two Next apps reimplementing
 * this would drift.
 */
function toE164(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return `92${digits}`;
}

/** `{ bank: { iban: 'x' } }` -> `{ 'bank.iban': 'x' }`, one level deep. */
function flatten(dto: UpdateSettingsDto): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dto)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [inner, innerValue] of Object.entries(value as Record<string, unknown>)) {
        if (innerValue !== undefined) out[`${key}.${inner}`] = innerValue;
      }
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}
