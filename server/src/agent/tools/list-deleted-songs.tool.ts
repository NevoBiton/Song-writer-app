import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { SongsService } from '../../songs/songs.service';

@Injectable()
export class ListDeletedSongsTool {
  constructor(private readonly songsService: SongsService) {}

  build(userId: string): DynamicStructuredTool {
    const songsService = this.songsService;
    return new DynamicStructuredTool({
      name: 'list_deleted_songs',
      description: 'List songs in the trash (deleted within the last 30 days) that can still be restored.',
      schema: z.object({}),
      func: async () => {
        const deleted = await songsService.listDeleted(userId);
        if (deleted.length === 0) return 'The trash is empty.';
        const lines = deleted.map((s, i) => {
          const deletedDate = new Date(s.deletedAt).toLocaleDateString();
          const artist = s.artist ? ` (${s.artist})` : '';
          return `${i + 1}. ${s.title}${artist} — deleted ${deletedDate} [id: ${s.id}]`;
        });
        return `${deleted.length} song${deleted.length !== 1 ? 's' : ''} in trash:\n${lines.join('\n')}`;
      },
    });
  }
}
