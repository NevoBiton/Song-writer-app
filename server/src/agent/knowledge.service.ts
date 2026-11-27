import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { VoyageEmbeddings } from '@langchain/community/embeddings/voyage';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private vectorStore: PGVectorStore;
  private readonly voyageEmbeddings: VoyageEmbeddings;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.voyageEmbeddings = new VoyageEmbeddings({
      apiKey: this.config.get<string>('VOYAGE_API_KEY'),
      modelName: 'voyage-3',
    });
  }

  async onModuleInit() {
    this.vectorStore = await PGVectorStore.initialize(this.voyageEmbeddings, {
      pool: this.db.pool,
      tableName: 'knowledge_embeddings',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
    });
    this.logger.log('KnowledgeService: PGVectorStore initialized');
    await this.ingestIfEmpty();
  }

  private async ingestIfEmpty() {
    const result = await this.db.pool.query(
      'SELECT COUNT(*)::int AS count FROM knowledge_embeddings',
    );
    if (result.rows[0].count > 0) {
      this.logger.log('KnowledgeService: knowledge already embedded, skipping ingestion');
      return;
    }

    const knowledgeDir = path.join(__dirname, 'knowledge');
    const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.md'));

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 512,
      chunkOverlap: 50,
    });

    let totalChunks = 0;
    for (const file of files) {
      const text = fs.readFileSync(path.join(knowledgeDir, file), 'utf-8');
      const chunks = await splitter.createDocuments([text]);
      const docs = chunks.map(chunk => ({
        pageContent: chunk.pageContent,
        metadata: { source: file.replace('.md', '') },
      }));
      await this.vectorStore.addDocuments(docs);
      totalChunks += docs.length;
      this.logger.log(`KnowledgeService: embedded ${docs.length} chunks from ${file}`);
    }

    this.logger.log(`KnowledgeService: ingestion complete — ${totalChunks} total chunks from ${files.length} files`);
  }

  async search(query: string, limit = 5): Promise<string[]> {
    const results = await this.vectorStore.similaritySearch(query, limit);
    return results.map(r => r.pageContent);
  }
}
