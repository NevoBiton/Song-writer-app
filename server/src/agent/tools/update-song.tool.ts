import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SongsService } from '../../songs/songs.service';
import { BaseTool } from './base-tool.interface';
import { ToolResult } from '../dto/structured-data.dto';

@Injectable()
export class UpdateSongTool implements BaseTool {
  constructor(private readonly songsService: SongsService) {}

  definition: Anthropic.Tool = {
    name: 'update_song',
    description: "Update a song's metadata — title, artist, key, capo, or language. Only the fields you provide are changed.",
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The song ID to update' },
        title: { type: 'string', description: 'New title (optional)' },
        artist: { type: 'string', description: 'New artist name (optional)' },
        key: { type: 'string', description: 'New musical key e.g. "Am", "G" (optional)' },
        capo: { type: 'number', description: 'New capo fret number (optional)' },
        language: { type: 'string', enum: ['en', 'he', 'mixed'], description: 'New language (optional)' },
      },
      required: ['id'],
    },
  };

  async execute(input: Record<string, unknown>, userId: string): Promise<ToolResult> {
    const id = input['id'] as string;
    const current = await this.songsService.findOne(id, userId);
    const updated = await this.songsService.update(id, userId, {
      title: (input['title'] as string | undefined) ?? current.title,
      artist: (input['artist'] as string | undefined) ?? current.artist ?? undefined,
      key: (input['key'] as string | undefined) ?? current.key ?? undefined,
      capo: (input['capo'] as number | undefined) ?? current.capo ?? 0,
      language: (input['language'] as string | undefined) ?? current.language ?? 'en',
      sections: current.sections as unknown[],
    });
    const changes: string[] = [];
    if (input['title']) changes.push(`title: "${updated.title}"`);
    if (input['artist'] !== undefined) changes.push(`artist: "${updated.artist ?? 'removed'}"`);
    if (input['key'] !== undefined) changes.push(`key: "${updated.key ?? 'removed'}"`);
    if (input['capo'] !== undefined) changes.push(`capo: ${updated.capo}`);
    if (input['language'] !== undefined) changes.push(`language: ${updated.language}`);
    return { text: `Updated "${updated.title}" — changed ${changes.join(', ')}.` };
  }
}
