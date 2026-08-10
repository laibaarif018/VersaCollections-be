import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApplicationStatus, MembershipTier } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ApplyForMembershipDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: [MembershipTier.Atelier, MembershipTier.Maison, MembershipTier.Prive] })
  @IsEnum(MembershipTier)
  tier!: MembershipTier;

  @ApiPropertyOptional({ description: 'A note to the membership committee' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class ReviewApplicationDto {
  @ApiProperty({ enum: [ApplicationStatus.Approved, ApplicationStatus.Declined] })
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}

export class ApplicationQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
