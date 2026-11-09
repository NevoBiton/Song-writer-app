import { IsString, IsOptional, IsInt, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSongDto {
  @ApiProperty({ example: 'Hallelujah', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Leonard Cohen', required: false })
  @IsOptional()
  @IsString()
  artist?: string;

  @ApiProperty({ example: 'C', required: false, description: 'Musical key' })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({ example: 0, required: false, description: 'Capo fret number (0 = no capo)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  capo?: number;

  @ApiProperty({ example: 'en', required: false, enum: ['en', 'he'] })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false, description: 'Song sections (verse, chorus, etc.) as JSON array' })
  @IsOptional()
  @IsArray()
  sections?: unknown[];
}
