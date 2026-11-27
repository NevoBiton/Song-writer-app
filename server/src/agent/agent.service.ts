import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { eq, desc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { users, agentMemory } from '../db/schema';
import { MessageDto, SupportedModel } from './dto/agent-chat.dto';
import { StructuredData, RunContext } from './dto/structured-data.dto';
import { ToolRegistry } from './tools/tool-registry.service';
import { GuardrailsService } from './guardrails.service';
import { SkillsService } from './skills.service';

export interface ChatResult {
  reply: string;
  data?: StructuredData;
}

@Injectable()
export class AgentService {
  private readonly proxyUrl: string;
  private readonly masterKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly toolRegistry: ToolRegistry,
    private readonly guardrails: GuardrailsService,
    private readonly skills: SkillsService,
  ) {
    this.proxyUrl = this.config.get<string>('LITELLM_PROXY_URL') ?? 'http://localhost:4000';
    this.masterKey = this.config.get<string>('LITELLM_MASTER_KEY') ?? 'sk-wordchord-local';
  }

  private buildLlm(model: SupportedModel): ChatOpenAI {
    return new ChatOpenAI({
      modelName: model,
      apiKey: this.masterKey,
      configuration: { baseURL: this.proxyUrl },
    });
  }

  async chat(userId: string, messages: MessageDto[], lang: 'en' | 'he' = 'en', model: SupportedModel = 'claude-haiku-4-5'): Promise<ChatResult> {
    // 1. Load user info and persistent memories
    const [user] = await this.db.db.select({ username: users.username }).from(users).where(eq(users.id, userId));
    const username = user?.username ?? 'there';

    const memories = await this.db.db
      .select()
      .from(agentMemory)
      .where(eq(agentMemory.userId, userId))
      .orderBy(desc(agentMemory.updatedAt))
      .limit(30);
    const memoriesBlock =
      memories.length > 0
        ? `\nWhat you remember about ${username} from previous conversations:\n${memories.map(m => `- ${m.key}: ${m.value}`).join('\n')}\n`
        : '';

    // 2. Extract current user message and run input guardrail before anything reaches the model
    const input = messages[messages.length - 1]?.content ?? '';
    this.guardrails.checkInput(input);

    // 3. Detect skill and build injection block
    const skillInjection = this.skills.detect(input);
    const skillBlock = skillInjection ? `\nFocused guidance for this request:\n${skillInjection}\n` : '';

    // 4. System prompt
    const systemPrompt = `You are a friendly music assistant for WordChord, a chord notebook app. The user's name is ${username}.
${memoriesBlock}
You help manage their song library (list, view, create, update, delete, restore songs) and answer music questions about chords, keys, progressions, and theory from your own knowledge.

Formatting rules — follow these strictly:
- Plain text only. No markdown. No asterisks, no hashtags, no dashes, no bold.
- When the user asks to see their songs, call the list_songs tool and then reply with just a short confirmation like "Here are your songs" — the song list will be displayed as a card in the UI, so do not repeat all the song names in your text reply.
- Omit any field that is empty or null — do not write "Artist: null".
- Keep replies short and conversational.
- When deleting a song, always confirm the exact song name with the user before calling the delete tool.
- When creating a song, proceed if you have a title. Only ask for more details if the user seems to want them.
- Any time the user reveals something personal about themselves, call remember_fact — once per distinct fact. Use your judgment: if knowing this in a future conversation would make you more helpful or personal, save it. Never say "I noted" or announce it. Always store the value in English.

Language: ALWAYS respond in ${lang === 'he' ? 'Hebrew (עברית)' : 'English'}, regardless of what language the user writes in.${skillBlock}`;

    // 5. Build tools — userId and runContext captured in closures, no config passing needed
    const runContext: RunContext = {};
    const tools = this.toolRegistry.build(userId, runContext);
    const agent = createReactAgent({ llm: this.buildLlm(model), tools });

    // 6. Build message array — context management: keep last 20 messages max
    const historyMessages = messages.slice(0, -1).slice(-20);
    const chatHistory: BaseMessage[] = historyMessages.map(m =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
    );

    // 7. Run agent
    const result = await agent.invoke(
      {
        messages: [
          new SystemMessage(systemPrompt),
          ...chatHistory,
          new HumanMessage(input),
        ],
      },
      { recursionLimit: 25 },
    );

    // 8. Extract text from last AI message (content can be string or content block array)
    const lastMessage = result.messages[result.messages.length - 1];
    const content = lastMessage.content;
    const rawReply =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? (content as Array<{ type: string; text: string }>).find(b => b.type === 'text')?.text ?? ''
          : '';

    // 9. Output guardrail — sanitize before returning to client
    const toolCallCount = result.messages.filter((m: { _getType?: () => string }) => m._getType?.() === 'tool').length;
    const reply = this.guardrails.checkOutput(rawReply, toolCallCount);

    return { reply, data: runContext.structuredData };
  }
}
