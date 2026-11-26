import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SongsService } from '../../songs/songs.service';
import { BaseTool } from './base-tool.interface';
import { ToolResult } from '../dto/structured-data.dto';

@Injectable()
export class RestoreSongTool implements BaseTool {
  constructor(private readonly songsService: SongsService) {}

  definition: Anthropic.Tool = {
    name: 'restore_song',
    description: 'Restore a deleted song from the trash back to the library.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The deleted song ID to restore' },
      },
      required: ['id'],
    },
  };

  async execute(input: Record<string, unknown>, userId: string): Promise<ToolResult> {
    const id = input['id'] as string;
    const song = await this.songsService.restore(id, userId);
    return { text: `Restored "${song.title}" back to the library.` };
  }
}
