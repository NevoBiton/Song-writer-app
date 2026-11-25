import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SongsService } from '../../songs/songs.service';
import { BaseTool } from './base-tool.interface';

@Injectable()
export class GetSongDetailsTool implements BaseTool {
  constructor(private readonly songsService: SongsService) {}

  definition: Anthropic.Tool = {
    name: 'get_song_details',
    description: 'Get full details of a specific song by its ID. Returns all metadata plus section count.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The song ID' },
      },
      required: ['id'],
    },
  };

  async execute(input: Record<string, unknown>, userId: string): Promise<string> {
    const id = input['id'] as string;
    const song = await this.songsService.findOne(id, userId);
    const sections = Array.isArray(song.sections) ? song.sections : [];
    const lines = [`Title: ${song.title}`];
    if (song.artist) lines.push(`Artist: ${song.artist}`);
    if (song.key) lines.push(`Key: ${song.key}`);
    if (song.capo) lines.push(`Capo: ${song.capo}`);
    lines.push(`Language: ${song.language}`);
    lines.push(`Sections: ${sections.length}`);
    lines.push(`ID: ${song.id}`);
    return lines.join('\n');
  }
}
