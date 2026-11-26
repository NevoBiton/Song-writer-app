import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { users } from '../db/schema';
import { MessageDto } from './dto/agent-chat.dto';
import { StructuredData } from './dto/structured-data.dto';
import { ToolRegistry } from './tools/tool-registry.service';

export interface ChatResult {
  reply: string;
  data?: StructuredData;
}

@Injectable()
export class AgentService {
  private readonly client: Anthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly toolRegistry: ToolRegistry,
  ) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async chat(userId: string, messages: MessageDto[], lang: 'en' | 'he' = 'en'): Promise<ChatResult> {
    const [user] = await this.db.db.select({ username: users.username }).from(users).where(eq(users.id, userId));
    const username = user?.username ?? 'there';

    const systemPrompt = `You are a friendly music assistant for WordChord, a chord notebook app. The user's name is ${username}.

You help manage their song library (list, view, create, update, delete, restore songs) and answer music questions about chords, keys, progressions, and theory from your own knowledge.

Formatting rules — follow these strictly:
- Plain text only. No markdown. No asterisks, no hashtags, no dashes, no bold.
- When the user asks to see their songs, call the list_songs tool and then reply with just a short confirmation like "Here are your songs" — the song list will be displayed as a card in the UI, so do not repeat all the song names in your text reply.
- Omit any field that is empty or null — do not write "Artist: null".
- Keep replies short and conversational.
- When deleting a song, always confirm the exact song name with the user before calling the delete tool.
- When creating a song, proceed if you have a title. Only ask for more details if the user seems to want them.

Language: ALWAYS respond in ${lang === 'he' ? 'Hebrew (עברית)' : 'English'}, regardless of what language the user writes in.`;

    const claudeMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    let structuredData: StructuredData | undefined;
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        tools: this.toolRegistry.getDefinitions(),
        messages: claudeMessages,
      });

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text');
        const reply = textBlock ? (textBlock as Anthropic.TextBlock).text : '';
        return { reply, data: structuredData };
      }

      if (response.stop_reason === 'tool_use') {
        claudeMessages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          const toolUse = block as Anthropic.ToolUseBlock;

          let text: string;
          try {
            const result = await this.toolRegistry.execute(
              toolUse.name,
              toolUse.input as Record<string, unknown>,
              userId,
            );
            text = result.text;
            // Keep the last structured data produced during this conversation turn
            if (result.data) structuredData = result.data;
          } catch (err: unknown) {
            text = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: text,
          });
        }

        claudeMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      break;
    }

    return { reply: 'I was unable to complete your request. Please try again.' };
  }
}
