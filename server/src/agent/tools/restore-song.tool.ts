import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { SongsService } from '../../songs/songs.service';

@Injectable()
export class RestoreSongTool {
  constructor(private readonly songsService: SongsService) {}

  build(userId: string): DynamicStructuredTool {
    const songsService = this.songsService;
    return new DynamicStructuredTool({
      name: 'restore_song',
      description: 'Restore a deleted song from the trash back to the library.',
      schema: z.object({
        id: z.string().describe('The deleted song ID to restore'),
      }),
      func: async ({ id }) => {
        const song = await songsService.restore(id, userId);
        return `Restored "${song.title}" back to the library.`;
      },
    });
  }
}
