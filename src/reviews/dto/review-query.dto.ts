import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ReviewStatus } from '../../common/enums';

export class ReviewQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Product ObjectId' })
  @IsOptional()
  @IsMongoId()
  product?: string;

  @ApiPropertyOptional({
    enum: ReviewStatus,
    description: 'Admin only — the storefront always sees approved reviews',
  })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}
