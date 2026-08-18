import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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

export class MarkDeliveryPaymentDto {
  @ApiProperty({ description: 'True once the advance delivery charge has been received' })
  @IsBoolean()
  paid!: boolean;

  @ApiPropertyOptional({ description: 'Transaction id or reconciliation note', example: 'TID 8842190' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class UpdateOrderStatusDto {
  /**
   * Only read when moving to `shipped`. Optional so a hand-delivered parcel
   * does not need an invented tracking number; the email omits whatever is
   * missing rather than printing an empty row.
   */
  @ApiPropertyOptional({ description: 'Courier, e.g. TCS or Leopards', example: 'TCS' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  courier?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingNumber?: string;

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
