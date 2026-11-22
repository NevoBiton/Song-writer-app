import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { DatabaseService } from '../database/database.service';
import { AppGateway } from '../gateway/app.gateway';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const userId = 'user-uuid-1';
const notifId = 'notif-uuid-1';
const friendshipId = 'friendship-uuid-1';

const mockNotification = {
  id: notifId,
  userId,
  type: 'friend_request' as const,
  data: { friendshipId, fromUserId: 'user-2', fromUsername: 'alice', fromAvatar: null },
  isRead: false,
  createdAt: new Date('2026-01-01'),
};

// ── DB builder helpers ────────────────────────────────────────────────────────

function selectOrderLimitChain(results: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(results),
        }),
      }),
    }),
  };
}

function insertChain(result: unknown) {
  return { values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([result]) }) };
}

function updateNoReturnChain() {
  return { set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) };
}

function deleteNoReturnChain() {
  return { where: jest.fn().mockResolvedValue(undefined) };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGateway = { emitToUser: jest.fn() };
const mockDb = { db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: AppGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a notification and emits a socket event', async () => {
      mockDb.db.insert.mockReturnValue(insertChain(mockNotification));

      const result = await service.create(userId, 'friend_request', mockNotification.data);

      expect(mockDb.db.insert).toHaveBeenCalled();
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        userId,
        'new_notification',
        expect.objectContaining({
          id: mockNotification.id,
          type: mockNotification.type,
          data: mockNotification.data,
          isRead: mockNotification.isRead,
          createdAt: mockNotification.createdAt,
        }),
      );
      expect(result).toEqual(mockNotification);
    });
  });

  // ── getForUser ─────────────────────────────────────────────────────────────

  describe('getForUser()', () => {
    it('returns notifications for the user ordered by createdAt desc', async () => {
      mockDb.db.select.mockReturnValue(selectOrderLimitChain([mockNotification]));

      const result = await service.getForUser(userId);

      expect(result).toEqual([mockNotification]);
    });
  });

  // ── markRead ───────────────────────────────────────────────────────────────

  describe('markRead()', () => {
    it('marks a specific notification as read', async () => {
      mockDb.db.update.mockReturnValue(updateNoReturnChain());

      const result = await service.markRead(notifId, userId);

      expect(mockDb.db.update).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });

  // ── markAllRead ────────────────────────────────────────────────────────────

  describe('markAllRead()', () => {
    it('marks all notifications as read', async () => {
      mockDb.db.update.mockReturnValue(updateNoReturnChain());

      const result = await service.markAllRead(userId);

      expect(result).toEqual({ ok: true });
    });
  });

  // ── markPassiveRead ────────────────────────────────────────────────────────

  describe('markPassiveRead()', () => {
    it('marks only non-actionable notifications as read', async () => {
      mockDb.db.update.mockReturnValue(updateNoReturnChain());

      const result = await service.markPassiveRead(userId);

      expect(result).toEqual({ ok: true });
    });
  });

  // ── markReadByFriendshipId ─────────────────────────────────────────────────

  describe('markReadByFriendshipId()', () => {
    it('marks friend_request notification as read by friendshipId', async () => {
      mockDb.db.update.mockReturnValue(updateNoReturnChain());

      const result = await service.markReadByFriendshipId(friendshipId, userId);

      expect(mockDb.db.update).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });

  // ── deleteByFriendshipId ───────────────────────────────────────────────────

  describe('deleteByFriendshipId()', () => {
    it('deletes friend_request notification by friendshipId', async () => {
      mockDb.db.delete.mockReturnValue(deleteNoReturnChain());

      const result = await service.deleteByFriendshipId(friendshipId, userId);

      expect(mockDb.db.delete).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });
});
