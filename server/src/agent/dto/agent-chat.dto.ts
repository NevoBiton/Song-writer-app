import { IsArray, ValidateNested, IsIn, IsString, IsOptional } from 'class-validator';
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
}
