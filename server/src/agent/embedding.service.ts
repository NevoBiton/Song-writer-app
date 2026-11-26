import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoyageEmbeddings } from '@langchain/community/embeddings/voyage';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
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
    // PGVectorStore creates and manages the song_embeddings table automatically
    this.vectorStore = await PGVectorStore.initialize(this.voyageEmbeddings, {
      pool: this.db.pool,
      tableName: 'song_embeddings',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
    });
    this.logger.log('PGVectorStore initialized');
  }

  /**
   * Generate and store an embedding for a song.
   * Delete any existing row first so addDocuments() doesn't hit a duplicate key.
   */
  async embedSong(
    songId: string,
    userId: string,
    title: string,
    artist?: string | null,
    key?: string | null,
  ): Promise<void> {
    try {
      const content = [title, artist, key].filter(Boolean).join(' ');
      await this.vectorStore.delete({ ids: [songId] });
      await this.vectorStore.addDocuments(
        [{ pageContent: content, metadata: { songId, userId } }],
        { ids: [songId] },
      );
      this.logger.debug(`Embedded song "${title}" (id=${songId})`);
    } catch (err) {
      this.logger.error(`Failed to embed song id=${songId}: ${err}`);
    }
  }

  /**
   * Search songs by semantic similarity to a natural language query.
   * Filters by userId so users only see their own songs.
   */
  async searchSimilar(userId: string, query: string, limit = 5): Promise<string[]> {
    const results = await this.vectorStore.similaritySearch(query, limit, { userId });
    return results.map(r => r.metadata.songId as string);
  }
}
