import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { SongsService } from '../../songs/songs.service';

@Injectable()
export class DeleteSongTool {
  constructor(private readonly songsService: SongsService) {}

  build(userId: string): DynamicStructuredTool {
    const songsService = this.songsService;
    return new DynamicStructuredTool({
      name: 'delete_song',
      description: 'Move a song to the trash (soft delete). The user can restore it within 30 days.',
      schema: z.object({
        id: z.string().describe('The song ID to delete'),
      }),
      func: async ({ id }) => {
        await songsService.softDelete(id, userId);
        return 'Song moved to trash. The user can restore it within 30 days.';
      },
    });
  }
}
