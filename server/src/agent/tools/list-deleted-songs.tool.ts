import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SongsService } from '../../songs/songs.service';
import { BaseTool } from './base-tool.interface';
import { ToolResult } from '../dto/structured-data.dto';

@Injectable()
export class ListDeletedSongsTool implements BaseTool {
  constructor(private readonly songsService: SongsService) {}

  definition: Anthropic.Tool = {
    name: 'list_deleted_songs',
    description: 'List songs in the trash (deleted within the last 30 days) that can still be restored.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  };

  async execute(_input: Record<string, unknown>, userId: string): Promise<ToolResult> {
    const deleted = await this.songsService.listDeleted(userId);
    if (deleted.length === 0) return { text: 'The trash is empty.' };
    const lines = deleted.map((s, i) => {
      const deletedDate = new Date(s.deletedAt).toLocaleDateString();
      const artist = s.artist ? ` (${s.artist})` : '';
      return `${i + 1}. ${s.title}${artist} — deleted ${deletedDate} [id: ${s.id}]`;
    });
    return { text: `${deleted.length} song${deleted.length !== 1 ? 's' : ''} in trash:\n${lines.join('\n')}` };
  }
}
