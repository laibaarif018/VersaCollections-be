import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ReviewStatus } from '../../common/enums';

export class SubmitReviewDto {
  @ApiProperty({ description: 'Product ObjectId' })
  @IsMongoId()
  productId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment = '';
}

export class ModerateReviewDto {
  @ApiProperty({ enum: [ReviewStatus.Approved, ReviewStatus.Rejected] })
  @IsIn([ReviewStatus.Approved, ReviewStatus.Rejected])
  status!: ReviewStatus.Approved | ReviewStatus.Rejected;
}
