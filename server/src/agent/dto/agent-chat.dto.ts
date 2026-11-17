import { IsArray, ValidateNested, IsIn, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class AgentChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsIn(['en', 'he'])
  lang?: 'en' | 'he';
}
