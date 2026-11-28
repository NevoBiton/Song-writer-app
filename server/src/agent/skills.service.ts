import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { VoyageEmbeddings } from '@langchain/community/embeddings/voyage';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { DatabaseService } from '../database/database.service';

// Cosine distance threshold — lower means stricter matching.
// distance < 0.3 ≈ cosine similarity > 0.7 → confident skill match
const SIMILARITY_THRESHOLD = 0.5;

@Injectable()
export class SkillsService implements OnModuleInit {
  private readonly logger = new Logger(SkillsService.name);
  private vectorStore: PGVectorStore;
  private readonly voyageEmbeddings: VoyageEmbeddings;
  private readonly skillBodies = new Map<string, string>();

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
      tableName: 'skill_embeddings',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
    });
    await this.db.ensureHnswIndex('skill_embeddings', 'idx_skill_embeddings_hnsw');
    this.logger.log('SkillsService: PGVectorStore initialized');
    this.loadBodies();
    await this.ingestIfEmpty();
  }

  /**
   * Parses a skill markdown file with YAML front matter.
   * Returns the description (used for embedding) and the body (injected into prompt).
   */
  private parseMd(content: string): { name: string; description: string; body: string } {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error('Skill file is missing front matter');
    const lines = match[1].split('\n');
    const extract = (key: string) =>
      lines.find(l => l.startsWith(`${key}:`))?.replace(`${key}:`, '').trim() ?? '';
    return {
      name: extract('name'),
      description: extract('description'),
      body: match[2].trim(),
    };
  }

  /**
   * Reads all skill .md files and loads their bodies into memory.
   * Always runs on startup — fast since it is just file reads.
   */
  private loadBodies() {
    const skillsDir = path.join(__dirname, 'skills');
    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(skillsDir, file), 'utf-8');
      const { name, body } = this.parseMd(content);
      this.skillBodies.set(file.replace('.md', ''), body);
      this.logger.log(`SkillsService: loaded skill "${name}" (key="${file.replace('.md', '')}", bodyLength=${body.length})`);
    }
  }

  /**
   * Embeds each skill's description once and stores in skill_embeddings.
   * Skips if rows already exist.
   */
  private async ingestIfEmpty() {
    const result = await this.db.pool.query(
      'SELECT COUNT(*)::int AS count FROM skill_embeddings',
    );
    if (result.rows[0].count > 0) {
      this.logger.log('SkillsService: skills already embedded, skipping ingestion');
      return;
    }

    const skillsDir = path.join(__dirname, 'skills');
    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));

    const docs = files.map(file => {
      const content = fs.readFileSync(path.join(skillsDir, file), 'utf-8');
      const { name, description } = this.parseMd(content);
      const source = file.replace('.md', '');
      return { pageContent: description, metadata: { source, name } };
    });

    await this.vectorStore.addDocuments(docs);
    this.logger.log(`SkillsService: ingestion complete — ${docs.length} skills embedded in a single request`);
  }

  /**
   * Embeds the user message and finds the closest skill.
   * Returns the skill's prompt injection body if confident, or "" if no match.
   */
  async detect(message: string): Promise<string> {
    const results = await this.vectorStore.similaritySearchWithScore(message, 1);
    if (results.length === 0) return '';

    const [doc, score] = results[0];
    const matched = score <= SIMILARITY_THRESHOLD;
    const body = this.skillBodies.get(doc.metadata.source as string) ?? '';
    this.logger.log(`SkillsService: best match "${doc.metadata.name}" (distance=${score.toFixed(3)}, bodyLength=${body.length}) → ${matched && body ? 'injected' : 'no match'}`);

    if (!matched || !body) return '';
    return body;
  }
}
