import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { KnowledgeService } from '../knowledge.service';

@Injectable()
export class SearchKnowledgeTool {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  build(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: 'search_wordchord_docs',
      description:
        "Search the WordChord knowledge base to answer questions about: (1) how the app works — features, collaboration, AI assistant, notifications, dark mode, languages; (2) music theory for songwriters — capo usage, chord progressions by genre, song structure; (3) WordChord Spark Challenges — ranks, points, prizes, rules. Use this whenever the user asks 'how do I...', 'what is...', 'can WordChord...', or any music-related question.",
      schema: z.object({
        query: z.string().describe('The user question or topic to search for'),
      }),
      func: async ({ query }) => {
        const chunks = await this.knowledgeService.search(query);
        if (chunks.length === 0) return 'No relevant documentation found.';
        return chunks.join('\n\n---\n\n');
      },
    });
  }
}
