import Anthropic from '@anthropic-ai/sdk';
import { ToolResult } from '../dto/structured-data.dto';

export interface BaseTool {
  definition: Anthropic.Tool;
  execute(input: Record<string, unknown>, userId: string): Promise<ToolResult>;
}
