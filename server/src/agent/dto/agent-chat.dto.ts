import { IsArray, ValidateNested, IsIn, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export const SUPPORTED_MODELS = ['claude-haiku-4-5', 'gpt-4o-mini'] as const;
export type SupportedModel = typeof SUPPORTED_MODELS[number];

export class AgentChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsIn(['en', 'he'])
  lang?: 'en' | 'he';

  @IsOptional()
  @IsIn(SUPPORTED_MODELS)
  model?: SupportedModel;

  /**
   * Thread ID returned by the server when a destructive tool is interrupted.
   * The client must echo it back to resume the paused graph.
   */
  @IsOptional()
  @IsString()
  threadId?: string;

  /**
   * Confirmation value for a previously interrupted graph.
   * true  = proceed with the destructive action
   * false = cancel
   */
  @IsOptional()
  @IsBoolean()
  resume?: boolean;
}
