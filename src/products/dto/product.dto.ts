import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
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
import { ProductStatus, StitchType } from '../../common/enums';
import { SLUG_PATTERN } from '../../categories/dto/category.dto';

export class ProductImageDto {
  @ApiProperty({ example: '/uploads/6f1b….webp' })
  @IsString()
  @MaxLength(500)
  url!: string;

  @ApiProperty({ example: 'A embroidered lawn kurta photographed against plaster' })
  @IsString()
  @MaxLength(300)
  alt!: string;

  @ApiPropertyOptional({ description: 'Cloudinary public id', example: 'versacollections/2026/_staging/abc' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  publicId?: string;
}

export class ProductColorDto {
  @ApiProperty({ example: 'Ivory' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ example: '#f3efe7' })
  @IsHexColor()
  hex!: string;
}

export class SizeChartRowDto {
  @ApiProperty({ example: 'M' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  size!: string;

  @ApiPropertyOptional({ example: '38 in' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  chest?: string;

  @ApiPropertyOptional({ example: '32 in' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  waist?: string;

  @ApiPropertyOptional({ example: '42 in' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  length?: string;

  @ApiPropertyOptional({ example: '23 in' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  sleeve?: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name!: string;

  @ApiProperty({ example: 'embroidered-lawn-kurta' })
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

  @ApiProperty({ description: 'Price in minor units (paisa)', example: 289000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ description: 'Was-price in minor units (paisa)' })
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

  @ApiPropertyOptional({ description: 'Editorial line', example: 'Sahar' })
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

  @ApiPropertyOptional({ type: [ProductColorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductColorDto)
  colors?: ProductColorDto[];

  @ApiPropertyOptional({ description: 'Cloth used', example: 'Lawn' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fabric?: string;

  @ApiPropertyOptional({ enum: StitchType })
  @IsOptional()
  @IsEnum(StitchType)
  stitchType?: StitchType;

  @ApiPropertyOptional({ type: [SizeChartRowDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeChartRowDto)
  sizeChart?: SizeChartRowDto[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isExclusive?: boolean;

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
