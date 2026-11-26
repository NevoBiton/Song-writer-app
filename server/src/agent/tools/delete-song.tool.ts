import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SongsService } from '../../songs/songs.service';
import { BaseTool } from './base-tool.interface';
import { ToolResult } from '../dto/structured-data.dto';

@Injectable()
export class DeleteSongTool implements BaseTool {
  constructor(private readonly songsService: SongsService) {}

  definition: Anthropic.Tool = {
    name: 'delete_song',
    description: 'Move a song to the trash (soft delete). The user can restore it within 30 days.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The song ID to delete' },
      },
      required: ['id'],
    },
  };

  async execute(input: Record<string, unknown>, userId: string): Promise<ToolResult> {
    const id = input['id'] as string;
    await this.songsService.softDelete(id, userId);
    return { text: 'Song moved to trash. The user can restore it within 30 days.' };
  }
}
