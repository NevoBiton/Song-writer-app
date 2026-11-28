import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { SongsService } from '../../songs/songs.service';
import { GuardrailsService } from '../guardrails.service';

@Injectable()
export class GetSongDetailsTool {
  constructor(
    private readonly songsService: SongsService,
    private readonly guardrails: GuardrailsService,
  ) {}

  build(userId: string): DynamicStructuredTool {
    const songsService = this.songsService;
    const guardrails = this.guardrails;
    return new DynamicStructuredTool({
      name: 'get_song_details',
      description: 'Get full details of a specific song by its ID. Returns all metadata plus section count.',
      schema: z.object({
        id: z.string().describe('The song ID'),
      }),
      func: async ({ id }) => {
        const song = await songsService.findOne(id, userId);
        const sections = Array.isArray(song.sections) ? song.sections : [];
        const lines = [`Title: ${guardrails.sanitizeUserContent(song.title)}`];
        if (song.artist) lines.push(`Artist: ${guardrails.sanitizeUserContent(song.artist)}`);
        if (song.key) lines.push(`Key: ${song.key}`);
        if (song.capo) lines.push(`Capo: ${song.capo}`);
        lines.push(`Language: ${song.language}`);
        lines.push(`Sections: ${sections.length}`);
        lines.push(`ID: ${song.id}`);
        return lines.join('\n');
      },
    });
  }
}
