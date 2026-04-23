import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly db: NodePgDatabase<typeof schema>;
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    this.pool = new Pool({ connectionString: this.config.get<string>('DATABASE_URL') });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
