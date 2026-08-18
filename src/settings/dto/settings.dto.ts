import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EditorialLayout, HeroSlideKind } from '../../common/enums';

export class WalletAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'Versa Collections' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountTitle?: string;

  @ApiPropertyOptional({ example: '0300 1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  number?: string;
}

export class BankAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'Meezan Bank' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'PK00MEZN0000000000000000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  iban?: string;
}

export class HeroSlideDto {
  @ApiProperty({ enum: HeroSlideKind })
  @IsEnum(HeroSlideKind)
  kind!: HeroSlideKind;

  @ApiProperty({ example: '/uploads/6f1b….mp4' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({ description: 'Described for anyone who cannot see it' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  alt?: string;

  @ApiPropertyOptional({ description: 'Cloudinary public id' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  publicId?: string;
}

export class HeroContentDto {
  @ApiPropertyOptional({ example: 'Autumn — Winter 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eyebrow?: string;

  @ApiPropertyOptional({ description: 'Newline separated; each line renders as its own line' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  heading?: string;

  @ApiPropertyOptional({ description: 'Darkness of the scrim over the media, 0–100' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  overlayOpacity?: number;

  @ApiPropertyOptional({ description: 'Seconds an image holds; videos play to the end' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(60)
  slideSeconds?: number;

  @ApiPropertyOptional({ type: [HeroSlideDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeroSlideDto)
  slides?: HeroSlideDto[];
}

export class EditorialBlockDto {
  @ApiPropertyOptional({ enum: EditorialLayout })
  @IsOptional()
  @IsEnum(EditorialLayout)
  layout?: EditorialLayout;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Cloudinary public id' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  imagePublicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageAlt?: string;

  @ApiPropertyOptional({ example: 'The cloth' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eyebrow?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  heading?: string;

  @ApiPropertyOptional({ description: 'Ignored by the full-bleed layout' })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  linkLabel?: string;

  @ApiPropertyOptional({ example: '/collections' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  linkHref?: string;
}

export class HomeSectionsDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Lines of the scrolling band under the hero; empty hides it',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  marquee?: string[];

  @ApiPropertyOptional({ example: 'This season' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  featuredTitle?: string;

  @ApiPropertyOptional({ example: 'View all' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  featuredLinkLabel?: string;

  @ApiPropertyOptional({ example: 'New in' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  newestTitle?: string;

  @ApiPropertyOptional({ example: 'View all' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  newestLinkLabel?: string;
}

/**
 * Every field is optional so the admin form can PATCH a single section.
 * `key` is deliberately absent — the singleton handle is not editable, and the
 * global ValidationPipe runs `forbidNonWhitelisted`, so sending one is a 400.
 */
export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Delivery charge in minor units (paisa)', example: 25000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryCharge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  paymentInstructions?: string;

  @ApiPropertyOptional({ example: '0300 1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsappNumber?: string;

  @ApiPropertyOptional({ type: WalletAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WalletAccountDto)
  easypaisa?: WalletAccountDto;

  @ApiPropertyOptional({ type: WalletAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WalletAccountDto)
  jazzcash?: WalletAccountDto;

  @ApiPropertyOptional({ type: BankAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountDto)
  bank?: BankAccountDto;

  @ApiPropertyOptional({ type: HeroContentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroContentDto)
  hero?: HeroContentDto;

  @ApiPropertyOptional({ type: [EditorialBlockDto], description: 'Up to three; empty falls back to the built-in blocks' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EditorialBlockDto)
  editorial?: EditorialBlockDto[];

  @ApiPropertyOptional({ type: HomeSectionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeSectionsDto)
  home?: HomeSectionsDto;
}
