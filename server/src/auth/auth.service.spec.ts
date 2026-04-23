import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: '$2a$10$hashedpassword', // bcrypt hash placeholder
  googleId: null,
  avatar: null,
  createdAt: new Date(),
};

const mockDb = {
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      GOOGLE_CLIENT_ID: 'google-client-id',
      RESEND_API_KEY: 'resend-api-key',
      APP_URL: 'http://localhost:5173',
    };
    return config[key];
  }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Chains .values().returning() for insert mocks */
function mockInsert(returnValue: unknown) {
  return { values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([returnValue]) }) };
}

/** Chains .from().where() for select mocks */
function mockSelect(returnValue: unknown) {
  return { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([returnValue]) }) };
}

/** Chains .set().where().returning() for update mocks */
function mockUpdate(returnValue: unknown) {
  return {
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([returnValue]) }),
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('creates a user and returns token + user payload', async () => {
      mockDb.db.insert.mockReturnValue(mockInsert(mockUser));

      const result = await service.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password1',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws ConflictException when email is already taken', async () => {
      mockDb.db.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('unique constraint')),
        }),
      });

      await expect(
        service.register({ email: 'taken@example.com', username: 'user', password: 'Password1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns token + user payload on valid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockDb.db.select.mockReturnValue(mockSelect(mockUser));

      const result = await service.login({ email: 'test@example.com', password: 'Password1' });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockDb.db.select.mockReturnValue(mockSelect(null));

      await expect(service.login({ email: 'ghost@example.com', password: 'Password1' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockDb.db.select.mockReturnValue(mockSelect(mockUser));

      await expect(service.login({ email: 'test@example.com', password: 'WrongPass1' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for Google-only account', async () => {
      mockDb.db.select.mockReturnValue(mockSelect({ ...mockUser, passwordHash: null }));

      await expect(service.login({ email: 'test@example.com', password: 'Password1' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ── verifyResetToken ───────────────────────────────────────────────────────

  describe('verifyResetToken()', () => {
    it('returns { valid: true } when token exists and is not expired', async () => {
      const validToken = {
        id: 'token-uuid',
        token: 'abc123',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
      };
      mockDb.db.select.mockReturnValue(mockSelect(validToken));

      const result = await service.verifyResetToken('abc123');
      expect(result.valid).toBe(true);
    });

    it('returns { valid: false } when token does not exist', async () => {
      mockDb.db.select.mockReturnValue(mockSelect(null));

      const result = await service.verifyResetToken('invalid-token');
      expect(result.valid).toBe(false);
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('throws BadRequestException when token is invalid or expired', async () => {
      mockDb.db.select.mockReturnValue(mockSelect(null));

      await expect(service.resetPassword({ token: 'bad-token', password: 'NewPass1' }))
        .rejects.toThrow(BadRequestException);
    });
  });
});
