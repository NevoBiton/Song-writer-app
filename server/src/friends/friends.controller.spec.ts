import { Test, TestingModule } from '@nestjs/testing';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const requesterId = 'requester-uuid';
const addresseeId = 'addressee-uuid';
const friendshipId = 'friendship-uuid';

const mockAcceptedFriendship = { id: friendshipId, requesterId, addresseeId, status: 'accepted' };
const mockDeclinedFriendship = { id: friendshipId, requesterId, addresseeId, status: 'declined' };

const mockReq = { user: { id: requesterId } } as any;

const mockFriendsService = {
  searchUsers: jest.fn().mockResolvedValue([]),
  sendRequest: jest.fn().mockResolvedValue({ id: friendshipId, addresseeId }),
  getPendingRequests: jest.fn().mockResolvedValue([]),
  getSentRequests: jest.fn().mockResolvedValue([]),
  cancelRequest: jest.fn().mockResolvedValue({ ok: true }),
  acceptRequest: jest.fn().mockResolvedValue(mockAcceptedFriendship),
  declineRequest: jest.fn().mockResolvedValue(mockDeclinedFriendship),
  unfriend: jest.fn().mockResolvedValue({ ok: true }),
  getFriends: jest.fn().mockResolvedValue([]),
};

describe('FriendsController', () => {
  let controller: FriendsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendsController],
      providers: [{ provide: FriendsService, useValue: mockFriendsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) // bypass JWT guard in unit tests
      .compile();

    controller = module.get<FriendsController>(FriendsController);
    jest.clearAllMocks();
  });

  describe('search()', () => {
    it('calls searchUsers with query and userId and returns results', async () => {
      const mockResults = [{ id: 'u1', username: 'alice', avatar: null }];
      mockFriendsService.searchUsers.mockResolvedValue(mockResults);

      const result = await controller.search('alice', mockReq);

      expect(mockFriendsService.searchUsers).toHaveBeenCalledWith('alice', requesterId);
      expect(result).toEqual(mockResults);
    });
  });

  describe('sendRequest()', () => {
    it('calls sendRequest with userId and dto.email and returns the friendship', async () => {
      const friendship = { id: friendshipId, addresseeId };
      mockFriendsService.sendRequest.mockResolvedValue(friendship);

      const result = await controller.sendRequest({ email: 'addressee@example.com' } as any, mockReq);

      expect(mockFriendsService.sendRequest).toHaveBeenCalledWith(requesterId, 'addressee@example.com');
      expect(result).toEqual(friendship);
    });
  });

  describe('getRequests()', () => {
    it('calls getPendingRequests with userId and returns the list', async () => {
      const pending = [{ id: friendshipId, status: 'pending' }];
      mockFriendsService.getPendingRequests.mockResolvedValue(pending);

      const result = await controller.getRequests(mockReq);

      expect(mockFriendsService.getPendingRequests).toHaveBeenCalledWith(requesterId);
      expect(result).toEqual(pending);
    });
  });

  describe('getSentRequests()', () => {
    it('calls getSentRequests with userId and returns the list', async () => {
      const sent = [{ id: friendshipId, addresseeUsername: 'addressee' }];
      mockFriendsService.getSentRequests.mockResolvedValue(sent);

      const result = await controller.getSentRequests(mockReq);

      expect(mockFriendsService.getSentRequests).toHaveBeenCalledWith(requesterId);
      expect(result).toEqual(sent);
    });
  });

  describe('cancelRequest()', () => {
    it('calls cancelRequest with friendship id and userId and returns ok', async () => {
      mockFriendsService.cancelRequest.mockResolvedValue({ ok: true });

      const result = await controller.cancelRequest(friendshipId, mockReq);

      expect(mockFriendsService.cancelRequest).toHaveBeenCalledWith(friendshipId, requesterId);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('accept()', () => {
    it('calls acceptRequest with friendship id and userId and returns the updated friendship', async () => {
      mockFriendsService.acceptRequest.mockResolvedValue(mockAcceptedFriendship);

      const result = await controller.accept(friendshipId, mockReq);

      expect(mockFriendsService.acceptRequest).toHaveBeenCalledWith(friendshipId, requesterId);
      expect(result).toEqual(mockAcceptedFriendship);
    });
  });

  describe('decline()', () => {
    it('calls declineRequest with friendship id and userId and returns the updated friendship', async () => {
      mockFriendsService.declineRequest.mockResolvedValue(mockDeclinedFriendship);

      const result = await controller.decline(friendshipId, mockReq);

      expect(mockFriendsService.declineRequest).toHaveBeenCalledWith(friendshipId, requesterId);
      expect(result).toEqual(mockDeclinedFriendship);
    });
  });

  describe('unfriend()', () => {
    it('calls unfriend with friendship id and userId and returns ok', async () => {
      mockFriendsService.unfriend.mockResolvedValue({ ok: true });

      const result = await controller.unfriend(friendshipId, mockReq);

      expect(mockFriendsService.unfriend).toHaveBeenCalledWith(friendshipId, requesterId);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('getFriends()', () => {
    it('calls getFriends with userId and returns the friends list', async () => {
      const friends = [{ friendId: 'f1', username: 'alice', avatar: null, online: false }];
      mockFriendsService.getFriends.mockResolvedValue(friends);

      const result = await controller.getFriends(mockReq);

      expect(mockFriendsService.getFriends).toHaveBeenCalledWith(requesterId);
      expect(result).toEqual(friends);
    });
  });
});
