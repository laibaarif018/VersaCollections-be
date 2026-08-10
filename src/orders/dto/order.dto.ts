import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OrderStatus } from '../../common/enums';

export class ShippingAddressDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) line1!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) line2?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) city!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) region?: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(20) postalCode!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(60) country!: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiPropertyOptional({ description: 'Gift note or delivery instruction' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class OrderQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Matches order number or customer email' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}
