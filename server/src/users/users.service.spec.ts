import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('new-hash'),
  compare: jest.fn(),
}));

// ── Fixture ───────────────────────────────────────────────────────────────────

const userId = 'user-uuid-1';

const mockUser = {
  id: userId,
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed-password',
  googleId: null,
  avatar: null,
  createdAt: new Date(),
};

// ── DB builder helpers ────────────────────────────────────────────────────────

function selectChain(result: unknown) {
  return { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([result]) }) };
}
function updateChain(result: unknown) {
  return {
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([result]) }),
    }),
  };
}

const mockDb = { db: { select: jest.fn(), update: jest.fn() } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── getProfile ─────────────────────────────────────────────────────────────

  describe('getProfile()', () => {
    it('returns the public user profile', async () => {
      mockDb.db.select.mockReturnValue(selectChain(mockUser));

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        avatar: mockUser.avatar,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockDb.db.select.mockReturnValue(selectChain(null));

      await expect(service.getProfile('nonexistent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── updateProfile ──────────────────────────────────────────────────────────

  describe('updateProfile()', () => {
    it('updates username and returns updated profile', async () => {
      const updated = { ...mockUser, username: 'newname' };
      mockDb.db.update.mockReturnValue(updateChain(updated));

      const result = await service.updateProfile(userId, { username: 'newname' });

      expect(result.username).toBe('newname');
    });

    it('throws BadRequestException when no fields are provided', async () => {
      await expect(service.updateProfile(userId, {}))
        .rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when email is already taken', async () => {
      mockDb.db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('unique constraint')),
          }),
        }),
      });

      await expect(service.updateProfile(userId, { email: 'taken@example.com' }))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── changePassword ─────────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('returns { success: true } on valid password change', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockDb.db.select.mockReturnValue(selectChain(mockUser));
      mockDb.db.update.mockReturnValue(updateChain({}));

      const result = await service.changePassword(userId, {
        currentPassword: 'OldPass1',
        newPassword: 'NewPass1',
      });

      expect(result).toEqual({ success: true });
    });

    it('throws ForbiddenException when current password is wrong', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockDb.db.select.mockReturnValue(selectChain(mockUser));

      await expect(
        service.changePassword(userId, { currentPassword: 'WrongPass1', newPassword: 'NewPass1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for Google-only accounts (no password)', async () => {
      mockDb.db.select.mockReturnValue(selectChain({ ...mockUser, passwordHash: null }));

      await expect(
        service.changePassword(userId, { currentPassword: 'anything', newPassword: 'NewPass1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockDb.db.select.mockReturnValue(selectChain(null));

      await expect(
        service.changePassword('bad-id', { currentPassword: 'OldPass1', newPassword: 'NewPass1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
