import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { SongsService } from '../../songs/songs.service';

@Injectable()
export class UpdateSongTool {
  constructor(private readonly songsService: SongsService) {}

  build(userId: string): DynamicStructuredTool {
    const songsService = this.songsService;
    return new DynamicStructuredTool({
      name: 'update_song',
      description: "Update a song's metadata — title, artist, key, capo, or language. Only the fields you provide are changed.",
      schema: z.object({
        id: z.string().describe('The song ID to update'),
        title: z.string().optional().describe('New title (optional)'),
        artist: z.string().optional().describe('New artist name (optional)'),
        key: z.string().optional().describe('New musical key e.g. "Am", "G" (optional)'),
        capo: z.number().optional().describe('New capo fret number (optional)'),
        language: z.enum(['en', 'he', 'mixed']).optional().describe('New language (optional)'),
      }),
      func: async ({ id, title, artist, key, capo, language }) => {
        const current = await songsService.findOne(id, userId);
        const updated = await songsService.update(id, userId, {
          title: title ?? current.title,
          artist: artist ?? current.artist ?? undefined,
          key: key ?? current.key ?? undefined,
          capo: capo ?? current.capo ?? 0,
          language: language ?? current.language ?? 'en',
          sections: current.sections as unknown[],
        });
        const changes: string[] = [];
        if (title) changes.push(`title: "${updated.title}"`);
        if (artist !== undefined) changes.push(`artist: "${updated.artist ?? 'removed'}"`);
        if (key !== undefined) changes.push(`key: "${updated.key ?? 'removed'}"`);
        if (capo !== undefined) changes.push(`capo: ${updated.capo}`);
        if (language !== undefined) changes.push(`language: ${updated.language}`);
        return `Updated "${updated.title}" — changed ${changes.join(', ')}.`;
      },
    });
  }
}
