import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { agentMemory } from '../../db/schema';

@Injectable()
export class RememberFactTool {
  constructor(private readonly db: DatabaseService) {}

  build(userId: string): DynamicStructuredTool {
    const db = this.db;
    return new DynamicStructuredTool({
      name: 'remember_fact',
      description:
        "Persist something personal the user revealed about themselves so it can be recalled in future conversations. Call once per distinct fact. key is a short snake_case label that describes what the fact is. value is the fact itself.",
      schema: z.object({
        key: z.string().describe("Short snake_case label, e.g. 'preferred_key'"),
        value: z.string().describe('The information to remember'),
      }),
      func: async ({ key, value }) => {
        const existing = await db.db
          .select()
          .from(agentMemory)
          .where(and(eq(agentMemory.userId, userId), eq(agentMemory.key, key)));

        if (existing.length > 0) {
          await db.db
            .update(agentMemory)
            .set({ value, updatedAt: new Date() })
            .where(and(eq(agentMemory.userId, userId), eq(agentMemory.key, key)));
        } else {
          await db.db.insert(agentMemory).values({ userId, key, value });
        }

        return `Remembered: ${key} = ${value}`;
      },
    });
  }
}
