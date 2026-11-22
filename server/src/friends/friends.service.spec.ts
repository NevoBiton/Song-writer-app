import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { DatabaseService } from '../database/database.service';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const requesterId = 'requester-uuid';
const addresseeId = 'addressee-uuid';
const friendshipId = 'friendship-uuid';

const mockAddressee = { id: addresseeId, username: 'addressee' };
const mockRequester = { id: requesterId, username: 'requester', avatar: null };
const mockPendingFriendship = { id: friendshipId, requesterId, addresseeId, status: 'pending' };
const mockAcceptedFriendship = { id: friendshipId, requesterId, addresseeId, status: 'accepted' };

// ── DB builder helpers ────────────────────────────────────────────────────────

function selectWhereChain(result: unknown) {
  return { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([result]) }) };
}
function selectInnerJoinChain(results: unknown[]) {
  return { from: jest.fn().mockReturnValue({ innerJoin: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(results) }) }) };
}
function insertChain(result: unknown) {
  return { values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([result]) }) };
}
function updateChain(result: unknown) {
  return { set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([result]) }) }) };
}
function deleteNoReturnChain() {
  return { where: jest.fn().mockResolvedValue(undefined) };
}

const mockDb = { db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() } };
const mockGateway = { emitToUser: jest.fn(), isOnline: jest.fn().mockReturnValue(false) };
const mockNotificationsService = { create: jest.fn().mockResolvedValue({}) };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FriendsService', () => {
  let service: FriendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: AppGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
    jest.clearAllMocks();
  });

  // ── sendRequest ────────────────────────────────────────────────────────────

  describe('sendRequest()', () => {
    it('sends a friend request and returns the friendship', async () => {
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockAddressee))   // find addressee by email
        .mockReturnValueOnce(selectWhereChain(null))             // no existing friendship
        .mockReturnValueOnce(selectWhereChain(mockRequester));   // requester info for notification
      mockDb.db.insert.mockReturnValue(insertChain(mockPendingFriendship));

      const result = await service.sendRequest(requesterId, 'addressee@example.com');

      expect(result).toEqual(mockPendingFriendship);
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        addresseeId,
        'friend_request',
        expect.objectContaining({ friendship: mockPendingFriendship, from: mockRequester }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        addresseeId,
        'friend_request',
        expect.objectContaining({ friendshipId: mockPendingFriendship.id }),
      );
    });

    it('throws NotFoundException when addressee email is not found', async () => {
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.sendRequest(requesterId, 'nobody@example.com'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when trying to add yourself', async () => {
      // The addressee returned has the same id as the requester
      mockDb.db.select.mockReturnValueOnce(
        selectWhereChain({ id: requesterId, username: 'self' }),
      );

      await expect(service.sendRequest(requesterId, 'self@example.com'))
        .rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when already friends', async () => {
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockAddressee))
        .mockReturnValueOnce(selectWhereChain({ status: 'accepted' }));

      await expect(service.sendRequest(requesterId, 'addressee@example.com'))
        .rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when request already pending', async () => {
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockAddressee))
        .mockReturnValueOnce(selectWhereChain({ status: 'pending' }));

      await expect(service.sendRequest(requesterId, 'addressee@example.com'))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── getPendingRequests ─────────────────────────────────────────────────────

  describe('getPendingRequests()', () => {
    it('returns pending incoming friend requests', async () => {
      const mockRequest = {
        id: friendshipId,
        status: 'pending',
        createdAt: new Date(),
        requesterId,
        requesterUsername: 'requester',
        requesterAvatar: null,
      };
      mockDb.db.select.mockReturnValueOnce(selectInnerJoinChain([mockRequest]));

      const result = await service.getPendingRequests(addresseeId);

      expect(result).toEqual([mockRequest]);
    });
  });

  // ── getSentRequests ────────────────────────────────────────────────────────

  describe('getSentRequests()', () => {
    it('returns pending sent friend requests', async () => {
      const mockSent = {
        id: friendshipId,
        addresseeUsername: 'addressee',
        addresseeAvatar: null,
        createdAt: new Date(),
      };
      mockDb.db.select.mockReturnValueOnce(selectInnerJoinChain([mockSent]));

      const result = await service.getSentRequests(requesterId);

      expect(result).toEqual([mockSent]);
    });
  });

  // ── cancelRequest ──────────────────────────────────────────────────────────

  describe('cancelRequest()', () => {
    it('deletes the pending request and returns ok', async () => {
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(mockPendingFriendship));
      mockDb.db.delete.mockReturnValue(deleteNoReturnChain());

      const result = await service.cancelRequest(friendshipId, requesterId);

      expect(result).toEqual({ ok: true });
      expect(mockDb.db.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when friendship not found', async () => {
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.cancelRequest(friendshipId, requesterId))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not the requester', async () => {
      mockDb.db.select.mockReturnValueOnce(
        selectWhereChain({ ...mockPendingFriendship, requesterId: 'other-user' }),
      );

      await expect(service.cancelRequest(friendshipId, requesterId))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ── acceptRequest ──────────────────────────────────────────────────────────

  describe('acceptRequest()', () => {
    it('accepts the request, adds friend, emits socket event', async () => {
      const mockAccepter = { id: addresseeId, username: 'addressee', avatar: null };
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockPendingFriendship))  // find friendship
        .mockReturnValueOnce(selectWhereChain(mockAccepter));           // get accepter info
      mockDb.db.update.mockReturnValue(updateChain(mockAcceptedFriendship));

      const result = await service.acceptRequest(friendshipId, addresseeId);

      expect(result).toEqual(mockAcceptedFriendship);
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        requesterId,
        'friend_accepted',
        expect.objectContaining({ friendship: mockAcceptedFriendship }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        requesterId,
        'friend_accepted',
        expect.objectContaining({ friendshipId }),
      );
    });

    it('throws NotFoundException when friendship not found', async () => {
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.acceptRequest(friendshipId, addresseeId))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not the addressee', async () => {
      mockDb.db.select.mockReturnValueOnce(
        selectWhereChain({ ...mockPendingFriendship, addresseeId: 'other-user' }),
      );

      await expect(service.acceptRequest(friendshipId, addresseeId))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when request is not pending', async () => {
      mockDb.db.select.mockReturnValueOnce(
        selectWhereChain({ ...mockPendingFriendship, status: 'accepted' }),
      );

      await expect(service.acceptRequest(friendshipId, addresseeId))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── declineRequest ─────────────────────────────────────────────────────────

  describe('declineRequest()', () => {
    it('marks the request as declined and emits socket event to requester', async () => {
      const mockDeclinedFriendship = { ...mockPendingFriendship, status: 'declined' };
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(mockPendingFriendship));
      mockDb.db.update.mockReturnValue(updateChain(mockDeclinedFriendship));

      await service.declineRequest(friendshipId, addresseeId);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        requesterId,
        'friend_request_declined',
        expect.objectContaining({ friendshipId }),
      );
    });

    it('throws NotFoundException when friendship not found', async () => {
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.declineRequest(friendshipId, addresseeId))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not the addressee', async () => {
      mockDb.db.select.mockReturnValueOnce(
        selectWhereChain({ ...mockPendingFriendship, addresseeId: 'other-user' }),
      );

      await expect(service.declineRequest(friendshipId, addresseeId))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ── unfriend ───────────────────────────────────────────────────────────────

  describe('unfriend()', () => {
    it('deletes the friendship and notifies the other user', async () => {
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(mockAcceptedFriendship));
      mockDb.db.delete.mockReturnValue(deleteNoReturnChain());

      const result = await service.unfriend(friendshipId, requesterId);

      expect(result).toEqual({ ok: true });
      // requesterId is the caller, so the other party is addresseeId
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        addresseeId,
        'friend_removed',
        expect.objectContaining({ friendshipId }),
      );
    });

    it('throws NotFoundException when friendship not found', async () => {
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.unfriend(friendshipId, requesterId))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not a party to the friendship', async () => {
      mockDb.db.select.mockReturnValueOnce(
        selectWhereChain({ ...mockAcceptedFriendship, requesterId: 'x', addresseeId: 'y' }),
      );

      await expect(service.unfriend(friendshipId, requesterId))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ── getFriends ─────────────────────────────────────────────────────────────

  describe('getFriends()', () => {
    it('returns friends list with online status', async () => {
      const mockFriendRow = {
        id: friendshipId,
        status: 'accepted',
        friendId: 'f1',
        username: 'friend',
        avatar: null,
      };
      mockDb.db.select.mockReturnValueOnce(selectInnerJoinChain([mockFriendRow]));
      mockGateway.isOnline.mockReturnValue(true);

      const result = await service.getFriends(requesterId);

      expect(result).toHaveLength(1);
      expect(result[0].online).toBe(true);
      expect(result[0].friendId).toBe('f1');
      expect(result[0].username).toBe('friend');
    });
  });
});
