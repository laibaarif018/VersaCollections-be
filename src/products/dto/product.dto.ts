import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductStatus } from '../../common/enums';
import { SLUG_PATTERN } from '../../categories/dto/category.dto';

export class ProductImageDto {
  @ApiProperty({ example: '/images/nocturne-tote.jpg' })
  @IsString()
  @MaxLength(500)
  url!: string;

  @ApiProperty({ example: 'The Nocturne tote in black calfskin, photographed on obsidian stone' })
  @IsString()
  @MaxLength(300)
  alt!: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name!: string;

  @ApiProperty({ example: 'nocturne-tote' })
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens' })
  @MaxLength(140)
  slug!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({ description: 'Long-form provenance copy' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  story?: string;

  @ApiProperty({ description: 'Price in minor units (cents)', example: 289000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ description: 'Was-price in minor units (cents)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  compareAtPrice?: number | null;

  @ApiPropertyOptional({ type: [ProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @ApiProperty({ description: 'Category ObjectId' })
  @IsMongoId()
  category!: string;

  @ApiPropertyOptional({ description: 'Editorial line', example: 'Nocturne' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  line?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isExclusive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() membershipOnly?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
