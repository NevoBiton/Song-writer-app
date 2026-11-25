import Anthropic from '@anthropic-ai/sdk';

export interface BaseTool {
  definition: Anthropic.Tool;
  execute(input: Record<string, unknown>, userId: string): Promise<string>;
}
