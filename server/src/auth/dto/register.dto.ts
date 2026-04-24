import { IsEmail, IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'myusername' })
  @IsString()
  @MinLength(1)
  username: string;

  @ApiProperty({ example: 'MyPassword1', description: 'Min 8 chars, uppercase, lowercase and number' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  password: string;

  @ApiPropertyOptional({ example: 'he', description: 'UI language for the confirmation email (en or he)' })
  @IsOptional()
  @IsString()
  lang?: string;
}
