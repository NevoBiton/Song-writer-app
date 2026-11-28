import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public readonly db: NodePgDatabase<typeof schema>;
  public readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    this.pool = new Pool({ connectionString: this.config.get<string>('DATABASE_URL') });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async ensureHnswIndex(table: string, indexName: string): Promise<void> {
    try {
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} USING hnsw (embedding vector_cosine_ops)`,
      );
      this.logger.log(`HNSW index ready on ${table}`);
    } catch (err) {
      if ((err as Error).message?.includes('does not have dimensions')) {
        await this.pool.query(
          `ALTER TABLE ${table} ALTER COLUMN embedding TYPE vector(1024)`,
        );
        await this.pool.query(
          `CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} USING hnsw (embedding vector_cosine_ops)`,
        );
        this.logger.log(`HNSW index created on ${table} (column upgraded to vector(1024))`);
      } else {
        throw err;
      }
    }
  }
}
