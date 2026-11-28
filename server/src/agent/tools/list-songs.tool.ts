import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { SongsService } from '../../songs/songs.service';
import { RunContext } from '../dto/structured-data.dto';
import { GuardrailsService } from '../guardrails.service';

@Injectable()
export class ListSongsTool {
  constructor(
    private readonly songsService: SongsService,
    private readonly guardrails: GuardrailsService,
  ) {}

  build(userId: string, runContext: RunContext): DynamicStructuredTool {
    const songsService = this.songsService;
    const guardrails = this.guardrails;
    return new DynamicStructuredTool({
      name: 'list_songs',
      description: "List ALL songs in the user's library. Only call this when the user explicitly asks to see their full song list. To find a specific song by name before deleting, updating, or getting details — use search_songs_semantic instead.",
      schema: z.object({}),
      func: async () => {
        const songs = await songsService.findAll(userId);

        if (songs.length === 0) return 'The library is empty — no songs yet.';

        const lines = songs.map((s, i) => {
          const title = guardrails.sanitizeUserContent(s.title);
          const parts: string[] = [];
          if (s.artist) parts.push(guardrails.sanitizeUserContent(s.artist));
          if (s.key) parts.push(`Key: ${s.key}`);
          if (s.capo) parts.push(`Capo: ${s.capo}`);
          return `${i + 1}. ${title}${parts.length ? ` (${parts.join(', ')})` : ''} [id: ${s.id}]`;
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
