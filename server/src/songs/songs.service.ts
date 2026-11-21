import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { songs, deletedSongs, songCollaborators, songVersions, songDrafts } from '../db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: AppGateway,
  ) {}

  async findAll(userId: string) {
    // Owned songs
    const owned = await this.db.db
      .select()
      .from(songs)
      .where(eq(songs.userId, userId))
      .orderBy(songs.updatedAt);

    // Collaborated songs (accepted invites only)
    const colRows = await this.db.db
      .select({ songId: songCollaborators.songId })
      .from(songCollaborators)
      .where(and(eq(songCollaborators.userId, userId), eq(songCollaborators.status, 'accepted')));

    const collaboratedIds = colRows.map(r => r.songId);

    if (collaboratedIds.length === 0) return owned;

    const collaborated = await this.db.db
      .select()
      .from(songs)
      .where(inArray(songs.id, collaboratedIds))
      .orderBy(songs.updatedAt);

    const all = [...owned, ...collaborated];
    all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return all;
  }

  async findOne(id: string, userId: string) {
    // Allow owner or collaborator to read the song
    const [song] = await this.db.db.select().from(songs).where(eq(songs.id, id));
    if (!song) throw new NotFoundException('Song not found');

    if (song.userId === userId) return song;

    const [col] = await this.db.db
      .select()
      .from(songCollaborators)
      .where(
        and(
          eq(songCollaborators.songId, id),
          eq(songCollaborators.userId, userId),
          eq(songCollaborators.status, 'accepted'),
        ),
      );

    if (!col) throw new NotFoundException('Song not found');
    return song;
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
    this.logger.log(`Song created: "${song.title}" (id=${song.id}) by user=${userId}`);
    return song;
  }

  async update(id: string, userId: string, dto: UpdateSongDto) {
    // Fetch current song before update to compare sections for version snapshot
    const [current] = await this.db.db
      .select({ sections: songs.sections })
      .from(songs)
      .where(and(eq(songs.id, id), eq(songs.userId, userId)));

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

    // Create version snapshot when sections change (tracks owner edit history)
    if (current && JSON.stringify(current.sections) !== JSON.stringify(dto.sections ?? [])) {
      await this.db.db
        .insert(songVersions)
        .values({ songId: id, sections: dto.sections ?? [], proposedBy: userId });
    }

    // Auto-rebase unmodified collaborator drafts, then notify all collaborators
    const collabs = await this.db.db
      .select({ userId: songCollaborators.userId })
      .from(songCollaborators)
      .where(
        and(
          eq(songCollaborators.songId, id),
          eq(songCollaborators.status, 'accepted'),
          eq(songCollaborators.role, 'editor'),
        ),
      );

    if (collabs.length > 0) {
      const collabUserIds = collabs.map(c => c.userId);

      // Fetch all collaborator drafts for this song in one query
      const drafts = await this.db.db
        .select()
        .from(songDrafts)
        .where(
          and(
            eq(songDrafts.songId, id),
            eq(songDrafts.status, 'draft'),
            inArray(songDrafts.userId, collabUserIds),
          ),
        );

      const draftMap = new Map(drafts.map(d => [d.userId, d]));
      const prevSectionsJson = JSON.stringify(current?.sections ?? []);

      for (const col of collabs) {
        const draft = draftMap.get(col.userId);
        let draftRebased = false;

        if (draft && JSON.stringify(draft.sections) === prevSectionsJson) {
          // Draft matches the old song — it's unmodified, so rebase it to the new sections
          await this.db.db
            .update(songDrafts)
            .set({ sections: dto.sections ?? [], updatedAt: new Date() })
            .where(eq(songDrafts.id, draft.id));
          draftRebased = true;
          this.logger.debug(`Draft rebased for user=${col.userId} song=${id}`);
        }

        this.gateway.emitToUser(col.userId, 'song_updated', {
          songId: id,
          newSections: song.sections,
          draftRebased,
        });
      }
    }

    this.logger.log(`Song updated: "${song.title}" (id=${id}) by user=${userId}`);
    return song;
  }

  async updateRecentChords(id: string, userId: string, chords: string[]) {
    const [song] = await this.db.db
      .update(songs)
      .set({ recentChords: chords })
      .where(and(eq(songs.id, id), eq(songs.userId, userId)))
      .returning({ id: songs.id });

    if (!song) throw new NotFoundException('Song not found');
    this.logger.debug(`Recent chords updated: song=${id} user=${userId} chords=[${chords.join(', ')}]`);
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

    this.logger.log(`Song moved to trash: "${song.title}" (id=${id}) by user=${userId}`);
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

    this.logger.log(`Song restored: "${restored.title}" (id=${id}) by user=${userId}`);
    return restored;
  }

  async permanentDelete(id: string, userId: string) {
    const [deleted] = await this.db.db
      .delete(deletedSongs)
      .where(and(eq(deletedSongs.id, id), eq(deletedSongs.userId, userId)))
      .returning({ id: deletedSongs.id });

    if (!deleted) throw new NotFoundException('Deleted song not found');
    this.logger.log(`Song permanently deleted: id=${id} by user=${userId}`);
    return { success: true };
  }
}
