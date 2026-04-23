import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthResponse = {
  token: 'mock-jwt-token',
  user: { id: 'uuid-1', email: 'test@example.com', username: 'testuser', avatar: null },
};

const mockAuthService = {
  register: jest.fn().mockResolvedValue(mockAuthResponse),
  login: jest.fn().mockResolvedValue(mockAuthResponse),
  googleAuth: jest.fn().mockResolvedValue(mockAuthResponse),
  forgotPassword: jest.fn().mockResolvedValue({ message: 'If an account with that email exists, a reset link has been sent.' }),
  verifyResetToken: jest.fn().mockResolvedValue({ valid: true }),
  resetPassword: jest.fn().mockResolvedValue(mockAuthResponse),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('delegates to AuthService.register() and returns the result', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);
      const dto = { email: 'test@example.com', username: 'testuser', password: 'Password1' };

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('delegates to AuthService.login() and returns the result', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      const dto = { email: 'test@example.com', password: 'Password1' };

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  // ── googleAuth ─────────────────────────────────────────────────────────────

  describe('googleAuth()', () => {
    it('delegates to AuthService.googleAuth() and returns the result', async () => {
      mockAuthService.googleAuth.mockResolvedValue(mockAuthResponse);
      const dto = { credential: 'google-id-token' };

      const result = await controller.googleAuth(dto);

      expect(mockAuthService.googleAuth).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  // ── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('always returns the same generic message (prevents email enumeration)', async () => {
      const okMessage = { message: 'If an account with that email exists, a reset link has been sent.' };
      mockAuthService.forgotPassword.mockResolvedValue(okMessage);

      const result = await controller.forgotPassword({ email: 'anyone@example.com' });

      expect(result).toEqual(okMessage);
    });
  });

  // ── verifyResetToken ───────────────────────────────────────────────────────

  describe('verifyResetToken()', () => {
    it('returns { valid: true } for a valid token', async () => {
      mockAuthService.verifyResetToken.mockResolvedValue({ valid: true });

      const result = await controller.verifyResetToken('valid-token');

      expect(mockAuthService.verifyResetToken).toHaveBeenCalledWith('valid-token');
      expect(result.valid).toBe(true);
    });

    it('returns { valid: false } for an expired or used token', async () => {
      mockAuthService.verifyResetToken.mockResolvedValue({ valid: false });

      const result = await controller.verifyResetToken('expired-token');

      expect(result.valid).toBe(false);
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('delegates to AuthService.resetPassword() and logs user in', async () => {
      mockAuthService.resetPassword.mockResolvedValue(mockAuthResponse);
      const dto = { token: 'valid-token', password: 'NewPass1' };

      const result = await controller.resetPassword(dto);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result.token).toBe('mock-jwt-token');
    });
  });
});
