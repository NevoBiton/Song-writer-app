import { IsArray, IsString } from 'class-validator';

export class RecentChordsDto {
  @IsArray()
  @IsString({ each: true })
  chords: string[];
}
