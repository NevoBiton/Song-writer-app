import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SongsService } from '../../songs/songs.service';
import { BaseTool } from './base-tool.interface';
import { ToolResult } from '../dto/structured-data.dto';

@Injectable()
export class ListSongsTool implements BaseTool {
  constructor(private readonly songsService: SongsService) {}

  definition: Anthropic.Tool = {
    name: 'list_songs',
    description: "List all songs in the user's library. Returns title, artist, key, capo, and id for each song.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  };

  async execute(_input: Record<string, unknown>, userId: string): Promise<ToolResult> {
    const songList = await this.songsService.findAll(userId);

    if (songList.length === 0) {
      return { text: 'The library is empty — no songs yet.' };
    }

    // Plain text summary Claude reads to understand the result
    const lines = songList.map((s, i) => {
      const parts: string[] = [];
      if (s.artist) parts.push(s.artist);
      if (s.key) parts.push(`Key: ${s.key}`);
      if (s.capo) parts.push(`Capo: ${s.capo}`);
      const meta = parts.length ? ` (${parts.join(', ')})` : '';
      return `${i + 1}. ${s.title}${meta} [id: ${s.id}]`;
    });

    return {
      text: `${songList.length} song${songList.length !== 1 ? 's' : ''} in the library:\n${lines.join('\n')}`,
      data: {
        type: 'song_list',
        total: songList.length,
        songs: songList.map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          key: s.key,
          capo: s.capo,
        })),
      },
    };
  }
}
