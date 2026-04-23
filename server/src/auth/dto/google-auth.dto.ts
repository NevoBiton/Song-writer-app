import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token from the Google OAuth flow' })
  @IsString()
  @IsNotEmpty()
  credential: string;
}
