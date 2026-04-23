import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { songs, deletedSongs } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';

@Injectable()
export class SongsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(userId: string) {
    return this.db.db.select().from(songs).where(eq(songs.userId, userId)).orderBy(songs.updatedAt);
  }

  async create(userId: string, dto: CreateSongDto) {
    const [song] = await this.db.db
      .insert(songs)
      .values({
        userId,
        title: dto.title,
        artist: dto.artist ?? null,
        key: dto.key ?? null,
        capo: dto.capo ?? 0,
        language: dto.language ?? 'en',
        sections: dto.sections ?? [],
      })
      .returning();
    return song;
  }

  async update(id: string, userId: string, dto: UpdateSongDto) {
    const [song] = await this.db.db
      .update(songs)
      .set({
        title: dto.title,
        artist: dto.artist ?? null,
        key: dto.key ?? null,
        capo: dto.capo ?? 0,
        language: dto.language ?? 'en',
        sections: dto.sections ?? [],
        updatedAt: new Date(),
      })
      .where(and(eq(songs.id, id), eq(songs.userId, userId)))
      .returning();

    if (!song) throw new NotFoundException('Song not found');
    return song;
  }

  async updateRecentChords(id: string, userId: string, chords: string[]) {
    const [song] = await this.db.db
      .update(songs)
      .set({ recentChords: chords })
      .where(and(eq(songs.id, id), eq(songs.userId, userId)))
      .returning({ id: songs.id });

    if (!song) throw new NotFoundException('Song not found');
    return { success: true };
  }

  async softDelete(id: string, userId: string) {
    const [song] = await this.db.db
      .delete(songs)
      .where(and(eq(songs.id, id), eq(songs.userId, userId)))
      .returning();

    if (!song) throw new NotFoundException('Song not found');

    await this.db.db.insert(deletedSongs).values({
      id: song.id,
      userId: song.userId,
      title: song.title,
      artist: song.artist,
      key: song.key,
      capo: song.capo,
      language: song.language,
      sections: song.sections,
      createdAt: song.createdAt,
      updatedAt: song.updatedAt,
      deletedAt: new Date(),
    });

    return { success: true };
  }

  listDeleted(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.db.db
      .select()
      .from(deletedSongs)
      .where(and(eq(deletedSongs.userId, userId), gte(deletedSongs.deletedAt, thirtyDaysAgo)))
      .orderBy(deletedSongs.deletedAt);
  }

  async restore(id: string, userId: string) {
    const [deleted] = await this.db.db
      .delete(deletedSongs)
      .where(and(eq(deletedSongs.id, id), eq(deletedSongs.userId, userId)))
      .returning();

    if (!deleted) throw new NotFoundException('Deleted song not found');

    const [restored] = await this.db.db
      .insert(songs)
      .values({
        id: deleted.id,
        userId: deleted.userId,
        title: deleted.title,
        artist: deleted.artist,
        key: deleted.key,
        capo: deleted.capo ?? 0,
        language: deleted.language ?? 'en',
        sections: deleted.sections,
        createdAt: deleted.createdAt,
        updatedAt: new Date(),
      })
      .returning();

    return restored;
  }

  async permanentDelete(id: string, userId: string) {
    const [deleted] = await this.db.db
      .delete(deletedSongs)
      .where(and(eq(deletedSongs.id, id), eq(deletedSongs.userId, userId)))
      .returning({ id: deletedSongs.id });

    if (!deleted) throw new NotFoundException('Deleted song not found');
    return { success: true };
  }
}
