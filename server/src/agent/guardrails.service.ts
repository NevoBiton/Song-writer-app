import { Injectable, BadRequestException, Logger } from '@nestjs/common';

const MAX_INPUT_LENGTH = 2000;
const MAX_OUTPUT_LENGTH = 3000;
const MAX_TOOL_CALLS = 10;

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(your|all|any)\s+/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(a|an)\s+/i,
  /forget\s+(everything|all)\s+(you\s+)?(know|were told)/i,
  /new\s+instructions?\s*:/i,
  /system\s*prompt\s*:/i,
  /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/i,
];

const OUTPUT_BLOCKLIST = [
  /<script[\s\S]*?>/i,
  /DROP\s+TABLE/i,
  /SELECT\s+\*\s+FROM/i,
  /INSERT\s+INTO\s+\w+\s+VALUES/i,
  /DELETE\s+FROM\s+\w+\s+WHERE/i,
];

@Injectable()
export class GuardrailsService {
  private readonly logger = new Logger(GuardrailsService.name);

  checkInput(message: string): void {
    // 1. Length cap
    if (message.length > MAX_INPUT_LENGTH) {
      throw new BadRequestException(
        `Message too long. Please keep it under ${MAX_INPUT_LENGTH} characters.`,
      );
    }

    // 2. Repetition abuse — same word/char repeated more than 200 times
    if (/(.)\1{200,}/.test(message)) {
      throw new BadRequestException('Message contains invalid repeated content.');
    }

    // 3. Prompt injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(message)) {
        this.logger.warn(`Prompt injection attempt blocked: "${message.slice(0, 100)}"`);
        throw new BadRequestException(
          'Your message contains content that cannot be processed. Please rephrase.',
        );
      }
    }
  }

  checkOutput(reply: string, toolCallCount: number = 0): string {
    // 1. Loop runaway warning
    if (toolCallCount > MAX_TOOL_CALLS) {
      this.logger.warn(`Agent made ${toolCallCount} tool calls in a single run — possible loop`);
    }

    // 2. Script / SQL injection in reply
    for (const pattern of OUTPUT_BLOCKLIST) {
      if (pattern.test(reply)) {
        this.logger.error(`Blocked dangerous content in agent reply: "${reply.slice(0, 100)}"`);
        return 'Sorry, I was unable to generate a safe response. Please try again.';
      }
    }

    // 3. Length cap — truncate cleanly at a sentence boundary if possible
    if (reply.length > MAX_OUTPUT_LENGTH) {
      this.logger.warn(`Agent reply truncated from ${reply.length} to ${MAX_OUTPUT_LENGTH} chars`);
      const truncated = reply.slice(0, MAX_OUTPUT_LENGTH);
      const lastPeriod = truncated.lastIndexOf('.');
      return lastPeriod > MAX_OUTPUT_LENGTH * 0.8
        ? truncated.slice(0, lastPeriod + 1)
        : truncated + '…';
    }

    return reply;
  }
}
