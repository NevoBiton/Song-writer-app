import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SongsService } from '../../songs/songs.service';
import { BaseTool } from './base-tool.interface';
import { ToolResult } from '../dto/structured-data.dto';

@Injectable()
export class CreateSongTool implements BaseTool {
  constructor(private readonly songsService: SongsService) {}

  definition: Anthropic.Tool = {
    name: 'create_song',
    description: "Create a new song in the user's library.",
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Song title (required)' },
        artist: { type: 'string', description: 'Artist name (optional)' },
        key: { type: 'string', description: 'Musical key, e.g. "Am", "G" (optional)' },
        capo: { type: 'number', description: 'Capo fret number (optional, default 0)' },
        language: {
          type: 'string',
          enum: ['en', 'he', 'mixed'],
          description: 'Song language (optional, default "en")',
        },
      },
      required: ['title'],
    },
  };

  async execute(input: Record<string, unknown>, userId: string): Promise<ToolResult> {
    const song = await this.songsService.create(userId, {
      title: input['title'] as string,
      artist: input['artist'] as string | undefined,
      key: input['key'] as string | undefined,
      capo: input['capo'] as number | undefined,
      language: (input['language'] as 'en' | 'he' | 'mixed') ?? 'en',
      sections: [],
    });
    return { text: `Created "${song.title}" (id: ${song.id})` };
  }
}
