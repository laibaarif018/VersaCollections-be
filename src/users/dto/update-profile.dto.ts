import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MembershipTier } from '../../common/enums';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName?: string;
}

export class UpdateMembershipTierDto {
  @ApiPropertyOptional({ enum: MembershipTier })
  @IsEnum(MembershipTier)
  membershipTier!: MembershipTier;
}
