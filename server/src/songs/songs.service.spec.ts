import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SongsService } from './songs.service';
import { DatabaseService } from '../database/database.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const userId = 'user-uuid-1';
const songId = 'song-uuid-1';

const mockSong = {
  id: songId,
  userId,
  title: 'Test Song',
  artist: 'Test Artist',
  key: 'G',
  capo: 0,
  language: 'en',
  sections: [],
  recentChords: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ── DB builder helpers ────────────────────────────────────────────────────────

function selectChain(result: unknown) {
  return { from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ orderBy: jest.fn().mockResolvedValue([result]) }) }) };
}
function selectWhereChain(result: unknown) {
  return { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([result]) }) };
}
function insertChain(result: unknown) {
  return { values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([result]) }) };
}
function updateChain(result: unknown) {
  return { set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([result]) }) }) };
}
function deleteChain(result: unknown) {
  return { where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([result]) }) };
}

const mockDb = { db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SongsService', () => {
  let service: SongsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongsService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<SongsService>(SongsService);
    jest.clearAllMocks();
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns all songs for the user ordered by updatedAt', async () => {
      mockDb.db.select.mockReturnValue(selectChain(mockSong));

      const result = await service.findAll(userId);

      expect(result).toEqual([mockSong]);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('inserts a song and returns it', async () => {
      mockDb.db.insert.mockReturnValue(insertChain(mockSong));

      const result = await service.create(userId, {
        title: 'Test Song',
        artist: 'Test Artist',
        key: 'G',
      });

      expect(mockDb.db.insert).toHaveBeenCalled();
      expect(result.title).toBe('Test Song');
    });

    it('defaults capo to 0 and language to "en" when not provided', async () => {
      const songWithDefaults = { ...mockSong, capo: 0, language: 'en' };
      mockDb.db.insert.mockReturnValue(insertChain(songWithDefaults));

      const result = await service.create(userId, { title: 'Minimal Song' });

      expect(result.capo).toBe(0);
      expect(result.language).toBe('en');
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates a song and returns the updated record', async () => {
      const updated = { ...mockSong, title: 'Updated Title' };
      mockDb.db.update.mockReturnValue(updateChain(updated));

      const result = await service.update(songId, userId, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('throws NotFoundException when song does not exist or is not owned', async () => {
      mockDb.db.update.mockReturnValue(updateChain(null));

      await expect(service.update('wrong-id', userId, { title: 'Nope' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── updateRecentChords ─────────────────────────────────────────────────────

  describe('updateRecentChords()', () => {
    it('updates recent chords and returns { success: true }', async () => {
      mockDb.db.update.mockReturnValue(updateChain({ id: songId }));

      const result = await service.updateRecentChords(songId, userId, ['Am', 'G', 'F']);

      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException when song is not found', async () => {
      mockDb.db.update.mockReturnValue(updateChain(null));

      await expect(service.updateRecentChords('bad-id', userId, ['C']))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── softDelete ─────────────────────────────────────────────────────────────

  describe('softDelete()', () => {
    it('moves song to deletedSongs and returns { success: true }', async () => {
      mockDb.db.delete.mockReturnValue(deleteChain(mockSong));
      mockDb.db.insert.mockReturnValue(insertChain({}));

      const result = await service.softDelete(songId, userId);

      expect(result).toEqual({ success: true });
      expect(mockDb.db.insert).toHaveBeenCalled(); // inserted into deletedSongs
    });

    it('throws NotFoundException when song does not exist or is not owned', async () => {
      mockDb.db.delete.mockReturnValue(deleteChain(null));

      await expect(service.softDelete('bad-id', userId))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── restore ────────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('removes from deletedSongs, re-inserts into songs, and returns the song', async () => {
      const deletedSong = { ...mockSong, deletedAt: new Date() };
      mockDb.db.delete.mockReturnValue(deleteChain(deletedSong));
      mockDb.db.insert.mockReturnValue(insertChain(mockSong));

      const result = await service.restore(songId, userId);

      expect(result).toEqual(mockSong);
    });

    it('throws NotFoundException when deleted song is not found', async () => {
      mockDb.db.delete.mockReturnValue(deleteChain(null));

      await expect(service.restore('bad-id', userId))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── permanentDelete ────────────────────────────────────────────────────────

  describe('permanentDelete()', () => {
    it('removes from deletedSongs and returns { success: true }', async () => {
      mockDb.db.delete.mockReturnValue(deleteChain({ id: songId }));

      const result = await service.permanentDelete(songId, userId);

      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException when deleted song is not found', async () => {
      mockDb.db.delete.mockReturnValue(deleteChain(null));

      await expect(service.permanentDelete('bad-id', userId))
        .rejects.toThrow(NotFoundException);
    });
  });
});
