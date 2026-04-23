import { Test, TestingModule } from '@nestjs/testing';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReq = { user: { id: userId } } as any;

const mockSongsService = {
  findAll: jest.fn().mockResolvedValue([mockSong]),
  create: jest.fn().mockResolvedValue(mockSong),
  update: jest.fn().mockResolvedValue(mockSong),
  updateRecentChords: jest.fn().mockResolvedValue({ success: true }),
  softDelete: jest.fn().mockResolvedValue({ success: true }),
  listDeleted: jest.fn().mockResolvedValue([]),
  restore: jest.fn().mockResolvedValue(mockSong),
  permanentDelete: jest.fn().mockResolvedValue({ success: true }),
};

describe('SongsController', () => {
  let controller: SongsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SongsController],
      providers: [{ provide: SongsService, useValue: mockSongsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) // bypass JWT guard in unit tests
      .compile();

    controller = module.get<SongsController>(SongsController);
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it("returns the user's songs", async () => {
      mockSongsService.findAll.mockResolvedValue([mockSong]);
      const result = await controller.findAll(mockReq);
      expect(mockSongsService.findAll).toHaveBeenCalledWith(userId);
      expect(result).toEqual([mockSong]);
    });
  });

  describe('create()', () => {
    it('creates a song and returns it', async () => {
      mockSongsService.create.mockResolvedValue(mockSong);
      const dto = { title: 'Test Song' };
      const result = await controller.create(mockReq, dto as any);
      expect(mockSongsService.create).toHaveBeenCalledWith(userId, dto);
      expect(result).toEqual(mockSong);
    });
  });

  describe('update()', () => {
    it('updates a song and returns it', async () => {
      const updated = { ...mockSong, title: 'Updated' };
      mockSongsService.update.mockResolvedValue(updated);
      const result = await controller.update(songId, mockReq, { title: 'Updated' } as any);
      expect(mockSongsService.update).toHaveBeenCalledWith(songId, userId, { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });
  });

  describe('updateRecentChords()', () => {
    it('updates recent chords and returns { success: true }', async () => {
      mockSongsService.updateRecentChords.mockResolvedValue({ success: true });
      const result = await controller.updateRecentChords(songId, mockReq, { chords: ['Am', 'G'] });
      expect(mockSongsService.updateRecentChords).toHaveBeenCalledWith(songId, userId, ['Am', 'G']);
      expect(result).toEqual({ success: true });
    });
  });

  describe('softDelete()', () => {
    it('soft-deletes a song and returns { success: true }', async () => {
      mockSongsService.softDelete.mockResolvedValue({ success: true });
      const result = await controller.softDelete(songId, mockReq);
      expect(mockSongsService.softDelete).toHaveBeenCalledWith(songId, userId);
      expect(result).toEqual({ success: true });
    });
  });

  describe('listDeleted()', () => {
    it('returns deleted songs for the user', async () => {
      const deleted = [{ ...mockSong, deletedAt: new Date() }];
      mockSongsService.listDeleted.mockResolvedValue(deleted);
      const result = await controller.listDeleted(mockReq);
      expect(mockSongsService.listDeleted).toHaveBeenCalledWith(userId);
      expect(result).toEqual(deleted);
    });
  });

  describe('restore()', () => {
    it('restores a deleted song and returns it', async () => {
      mockSongsService.restore.mockResolvedValue(mockSong);
      const result = await controller.restore(songId, mockReq);
      expect(mockSongsService.restore).toHaveBeenCalledWith(songId, userId);
      expect(result).toEqual(mockSong);
    });
  });

  describe('permanentDelete()', () => {
    it('permanently deletes a song and returns { success: true }', async () => {
      mockSongsService.permanentDelete.mockResolvedValue({ success: true });
      const result = await controller.permanentDelete(songId, mockReq);
      expect(mockSongsService.permanentDelete).toHaveBeenCalledWith(songId, userId);
      expect(result).toEqual({ success: true });
    });
  });
});
