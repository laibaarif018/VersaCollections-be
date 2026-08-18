import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'leather-goods' })
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens' })
  @MaxLength(80)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/…/women/_cover/abc.webp' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroImage?: string;

  @ApiPropertyOptional({ description: 'Cloudinary public id for the hero image' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  heroImagePublicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  /**
   * Id of the top-level collection this sits under. Omit (or send `null`) for a
   * top-level collection — `@IsOptional` deliberately lets `null` through so an
   * existing subcategory can be promoted back up via PATCH.
   */
  @ApiPropertyOptional({ nullable: true, description: 'Parent collection id, or null for top level' })
  @IsOptional()
  @IsMongoId()
  parent?: string | null;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
