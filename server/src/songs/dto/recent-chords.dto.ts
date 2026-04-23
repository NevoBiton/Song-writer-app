import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecentChordsDto {
  @ApiProperty({ example: ['Am', 'F', 'C', 'G'], description: 'Recently used chord names' })
  @IsArray()
  @IsString({ each: true })
  chords: string[];
}
