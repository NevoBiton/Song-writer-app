import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { SongsService } from '../../songs/songs.service';

@Injectable()
export class CreateSongTool {
  constructor(private readonly songsService: SongsService) {}

  build(userId: string): DynamicStructuredTool {
    const songsService = this.songsService;
    return new DynamicStructuredTool({
      name: 'create_song',
      description: "Create a new song in the user's library.",
      schema: z.object({
        title: z.string().describe('Song title (required)'),
        artist: z.string().optional().describe('Artist name (optional)'),
        key: z.string().optional().describe('Musical key, e.g. "Am", "G" (optional)'),
        capo: z.number().optional().describe('Capo fret number (optional, default 0)'),
        language: z.enum(['en', 'he', 'mixed']).optional().describe('Song language (optional, default "en")'),
      }),
      func: async ({ title, artist, key, capo, language }) => {
        const song = await songsService.create(userId, {
          title,
          artist,
          key,
          capo,
          language: language ?? 'en',
          sections: [],
        });
        return `Created "${song.title}" (id: ${song.id})`;
      },
    });
  }
}
