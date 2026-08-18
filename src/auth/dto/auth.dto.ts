import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: 'AtelierNo5!' })
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
}

export class LoginDto {
  @ApiProperty({ example: 'admin@versacollections.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Versa!Admin2026' })
  @IsString()
  @MinLength(1)
  password!: string;
}

/**
 * A password change is authorised by the code emailed to the address on the
 * account — not by the current password. Someone at an unlocked browser
 * already knows nothing they need; the code is the thing they cannot get.
 */
export class ChangePasswordDto {
  @ApiProperty({ example: '482915', description: 'The six digits emailed to you' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'The code is six digits' })
  code!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  newPassword!: string;
}
