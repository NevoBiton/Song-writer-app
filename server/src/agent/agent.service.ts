import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { users } from '../db/schema';
import { SongsService } from '../songs/songs.service';
import { MessageDto } from './dto/agent-chat.dto';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly client: Anthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly songsService: SongsService,
  ) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  private readonly tools: Anthropic.Tool[] = [
    {
      name: 'list_songs',
      description: "List all songs in the user's library. Returns id, title, artist, key, capo, and updatedAt for each song.",
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_song_details',
      description: 'Get full details of a specific song by its ID. Returns all song metadata plus section count.',
      input_schema: {
        type: 'object' as const,
        properties: {
          id: { type: 'string', description: 'The song ID' },
        },
        required: ['id'],
      },
    },
    {
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
    },
    {
      name: 'delete_song',
      description: 'Move a song to the trash (soft delete). The user can restore it within 30 days.',
      input_schema: {
        type: 'object' as const,
        properties: {
          id: { type: 'string', description: 'The song ID to delete' },
        },
        required: ['id'],
      },
    },
    {
      name: 'update_song',
      description: 'Update a song\'s metadata — title, artist, key, capo, or language. Only the fields you provide are changed.',
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
    },
    {
      name: 'list_deleted_songs',
      description: 'List songs in the trash (deleted within the last 30 days) that can still be restored.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'restore_song',
      description: 'Restore a deleted song from the trash back to the library.',
      input_schema: {
        type: 'object' as const,
        properties: {
          id: { type: 'string', description: 'The deleted song ID to restore' },
        },
        required: ['id'],
      },
    },
  ];

  async chat(userId: string, messages: MessageDto[], lang: 'en' | 'he' = 'en'): Promise<string> {
    const [user] = await this.db.db.select({ username: users.username }).from(users).where(eq(users.id, userId));
    const username = user?.username ?? 'there';

    const systemPrompt = `You are a friendly music assistant for WordChord, a chord notebook app. The user's name is ${username}.

You help manage their song library (list, view, create, delete songs) and answer music questions about chords, keys, progressions, and theory.

Formatting rules — follow these strictly:
- Plain text only. No markdown. No asterisks, no hashtags, no dashes, no bold.
- When listing songs use a simple numbered list: "1. Title (Artist, Key: Am, Capo: 2)"
- Omit any field that is empty or null — do not write "Artist: null".
- Keep replies short and conversational.
- When deleting a song, always confirm the exact song name with the user before calling the delete tool.
- When creating a song, proceed if you have a title. Only ask for more details if the user seems to want them.

Language: ALWAYS respond in ${lang === 'he' ? 'Hebrew (עברית)' : 'English'}, regardless of what language the user writes in.`;

    const claudeMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        tools: this.tools,
        messages: claudeMessages,
      });

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text');
        return textBlock ? (textBlock as Anthropic.TextBlock).text : '';
      }

      if (response.stop_reason === 'tool_use') {
        claudeMessages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          const toolUse = block as Anthropic.ToolUseBlock;
          this.logger.debug(`Tool call: ${toolUse.name} input=${JSON.stringify(toolUse.input)}`);

          let result: string;
          try {
            result = await this.executeTool(toolUse.name, toolUse.input as Record<string, unknown>, userId);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            result = `Error: ${message}`;
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        claudeMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      break;
    }

    return 'I was unable to complete your request. Please try again.';
  }

  private async executeTool(name: string, input: Record<string, unknown>, userId: string): Promise<string> {
    switch (name) {
      case 'list_songs': {
        const songList = await this.songsService.findAll(userId);
        if (songList.length === 0) return 'The library is empty — no songs yet.';
        const lines = songList.map((s, i) => {
          const parts: string[] = [];
          if (s.artist) parts.push(s.artist);
          if (s.key) parts.push(`Key: ${s.key}`);
          if (s.capo) parts.push(`Capo: ${s.capo}`);
          const meta = parts.length ? ` (${parts.join(', ')})` : '';
          return `${i + 1}. ${s.title}${meta} [id: ${s.id}]`;
        });
        return `${songList.length} song${songList.length !== 1 ? 's' : ''} in the library:\n${lines.join('\n')}`;
      }

      case 'get_song_details': {
        const id = input['id'] as string;
        const song = await this.songsService.findOne(id, userId);
        const sections = Array.isArray(song.sections) ? song.sections : [];
        const lines = [`Title: ${song.title}`];
        if (song.artist) lines.push(`Artist: ${song.artist}`);
        if (song.key) lines.push(`Key: ${song.key}`);
        if (song.capo) lines.push(`Capo: ${song.capo}`);
        lines.push(`Language: ${song.language}`);
        lines.push(`Sections: ${sections.length}`);
        lines.push(`ID: ${song.id}`);
        return lines.join('\n');
      }

      case 'create_song': {
        const song = await this.songsService.create(userId, {
          title: input['title'] as string,
          artist: input['artist'] as string | undefined,
          key: input['key'] as string | undefined,
          capo: input['capo'] as number | undefined,
          language: (input['language'] as 'en' | 'he' | 'mixed') ?? 'en',
          sections: [],
        });
        return `Created "${song.title}" (id: ${song.id})`;
      }

      case 'delete_song': {
        const id = input['id'] as string;
        await this.songsService.softDelete(id, userId);
        return 'Song moved to trash. The user can restore it within 30 days.';
      }

      case 'update_song': {
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
        return `Updated "${updated.title}" — changed ${changes.join(', ')}.`;
      }

      case 'list_deleted_songs': {
        const deleted = await this.songsService.listDeleted(userId);
        if (deleted.length === 0) return 'The trash is empty.';
        const lines = deleted.map((s, i) => {
          const deletedDate = new Date(s.deletedAt).toLocaleDateString();
          const artist = s.artist ? ` (${s.artist})` : '';
          return `${i + 1}. ${s.title}${artist} — deleted ${deletedDate} [id: ${s.id}]`;
        });
        return `${deleted.length} song${deleted.length !== 1 ? 's' : ''} in trash:\n${lines.join('\n')}`;
      }

      case 'restore_song': {
        const id = input['id'] as string;
        const song = await this.songsService.restore(id, userId);
        return `Restored "${song.title}" back to the library.`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  }
}
