import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../common/enums';

/**
 * An account created by an admin rather than by the person themselves.
 *
 * The password rules match `RegisterDto` deliberately: an account made here
 * signs in through exactly the same endpoint, so a rule that held on one path
 * and not the other would be a hole rather than a convenience.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'colleague@versacollections.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.Customer })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
