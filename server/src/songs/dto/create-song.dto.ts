import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, Min } from 'class-validator';

export class CreateSongDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capo?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  sections?: unknown[];
}
