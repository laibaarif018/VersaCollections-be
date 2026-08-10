import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

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
