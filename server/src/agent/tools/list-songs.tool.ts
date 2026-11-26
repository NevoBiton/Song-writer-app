import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { SongsService } from '../../songs/songs.service';
import { RunContext } from '../dto/structured-data.dto';

@Injectable()
export class ListSongsTool {
  constructor(private readonly songsService: SongsService) {}

  build(userId: string, runContext: RunContext): DynamicStructuredTool {
    const songsService = this.songsService;
    return new DynamicStructuredTool({
      name: 'list_songs',
      description: "List all songs in the user's library. Returns title, artist, key, capo, and id for each song.",
      schema: z.object({}),
      func: async () => {
        const songs = await songsService.findAll(userId);

        if (songs.length === 0) return 'The library is empty — no songs yet.';

        const lines = songs.map((s, i) => {
          const parts: string[] = [];
          if (s.artist) parts.push(s.artist);
          if (s.key) parts.push(`Key: ${s.key}`);
          if (s.capo) parts.push(`Capo: ${s.capo}`);
          return `${i + 1}. ${s.title}${parts.length ? ` (${parts.join(', ')})` : ''} [id: ${s.id}]`;
        });

        runContext.structuredData = {
          type: 'song_list',
          total: songs.length,
          songs: songs.map(s => ({ id: s.id, title: s.title, artist: s.artist, key: s.key, capo: s.capo })),
        };

        return `${songs.length} song${songs.length !== 1 ? 's' : ''} in the library:\n${lines.join('\n')}`;
      },
    });
  }
}
