import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const userId = 'user-uuid-1';
const mockReq = { user: { id: userId } } as any;

const mockProfile = {
  id: userId,
  email: 'test@example.com',
  username: 'testuser',
  avatar: null,
};

const mockUsersService = {
  getProfile: jest.fn().mockResolvedValue(mockProfile),
  updateProfile: jest.fn().mockResolvedValue(mockProfile),
  changePassword: jest.fn().mockResolvedValue({ success: true }),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  // ── getProfile ─────────────────────────────────────────────────────────────

  describe('getProfile()', () => {
    it('returns the authenticated user profile', async () => {
      mockUsersService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(mockReq);

      expect(mockUsersService.getProfile).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockProfile);
    });
  });

  // ── updateProfile ──────────────────────────────────────────────────────────

  describe('updateProfile()', () => {
    it('updates profile fields and returns updated user', async () => {
      const updated = { ...mockProfile, username: 'newname' };
      mockUsersService.updateProfile.mockResolvedValue(updated);

      const result = await controller.updateProfile(mockReq, { username: 'newname' });

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(userId, { username: 'newname' });
      expect(result.username).toBe('newname');
    });

    it('passes avatar: null to clear avatar', async () => {
      const withNoAvatar = { ...mockProfile, avatar: null };
      mockUsersService.updateProfile.mockResolvedValue(withNoAvatar);

      const result = await controller.updateProfile(mockReq, { avatar: null });

      expect(result.avatar).toBeNull();
    });
  });

  // ── changePassword ─────────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('returns { success: true } on successful password change', async () => {
      mockUsersService.changePassword.mockResolvedValue({ success: true });

      const result = await controller.changePassword(mockReq, {
        currentPassword: 'OldPass1',
        newPassword: 'NewPass1',
      });

      expect(mockUsersService.changePassword).toHaveBeenCalledWith(userId, {
        currentPassword: 'OldPass1',
        newPassword: 'NewPass1',
      });
      expect(result).toEqual({ success: true });
    });
  });
});
