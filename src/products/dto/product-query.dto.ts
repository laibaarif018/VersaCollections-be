import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProductStatus } from '../../common/enums';

/** Accepts `?featured=true` / `?featured=1` from query strings. */
const toBool = ({ value }: { value: unknown }) =>
  value === undefined ? undefined : value === true || value === 'true' || value === '1';

export enum ProductSort {
  Newest = 'newest',
  PriceAsc = 'price-asc',
  PriceDesc = 'price-desc',
  NameAsc = 'name-asc',
}

export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  category?: string;

  @ApiPropertyOptional({ description: 'Editorial line name, e.g. "Nocturne"' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  line?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @ApiPropertyOptional({ description: 'Free-text search over name and description' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: ProductSort, default: ProductSort.Newest })
  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort;

  @ApiPropertyOptional({
    enum: ProductStatus,
    description: 'Admin only — the storefront always sees published products',
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
