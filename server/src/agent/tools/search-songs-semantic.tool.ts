import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { EmbeddingService } from '../embedding.service';
import { SongsService } from '../../songs/songs.service';
import { GuardrailsService } from '../guardrails.service';

@Injectable()
export class SearchSongsSemanticTool {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly songsService: SongsService,
    private readonly guardrails: GuardrailsService,
  ) {}

  build(userId: string): DynamicStructuredTool {
    const embeddingService = this.embeddingService;
    const songsService = this.songsService;
    const guardrails = this.guardrails;

    return new DynamicStructuredTool({
      name: 'search_songs_semantic',
      description:
        "Search the user's songs by meaning rather than exact title. Use when the user describes a song vaguely (e.g. 'that sad Beatles song in G') instead of naming it exactly.",
      schema: z.object({
        query: z.string().describe('Natural language description of the song to find'),
      }),
      func: async ({ query }) => {
        const songIds = await embeddingService.searchSimilar(userId, query);
        if (songIds.length === 0) return 'No similar songs found.';

        const results: string[] = [];
        for (const id of songIds) {
          try {
            const song = await songsService.findOne(id, userId);
            const title = guardrails.sanitizeUserContent(song.title);
            const artist = song.artist ? ` (${guardrails.sanitizeUserContent(song.artist)})` : '';
            const key = song.key ? ` — Key: ${song.key}` : '';
            results.push(`${title}${artist}${key} [id: ${song.id}]`);
          } catch {
            // song may have been deleted since embedding was stored
          }
        }

        if (results.length === 0) return 'No similar songs found.';
        return `Best matches:\n${results.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
      },
    });
  }
}
