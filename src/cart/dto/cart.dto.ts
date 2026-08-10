import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ObjectId' })
  @IsMongoId()
  productId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity = 1;

  @ApiPropertyOptional({ description: 'Required when the product defines sizes' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  size?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 0, maximum: 20, description: '0 removes the line' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  size?: string;
}
