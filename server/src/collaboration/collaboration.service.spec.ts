import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { DatabaseService } from '../database/database.service';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ownerId = 'owner-uuid';
const collaboratorId = 'collaborator-uuid';
const songId = 'song-uuid';
const draftId = 'draft-uuid';

const mockSong = { id: songId, userId: ownerId, title: 'Test Song', sections: [] };
const mockFriendship = { id: 'friendship-uuid', requesterId: ownerId, addresseeId: collaboratorId, status: 'accepted' };
const mockCollaboratorRow = { id: 'col-uuid', songId, userId: collaboratorId, role: 'editor', status: 'accepted' };
const mockPendingInvite = { id: 'col-uuid', songId, userId: collaboratorId, role: 'editor', status: 'pending' };
const mockDraft = { id: draftId, songId, userId: collaboratorId, sections: [], status: 'draft', note: null };
const mockProposedDraft = { ...mockDraft, status: 'proposed' };

// ── DB builder helpers ────────────────────────────────────────────────────────

function selectWhereChain(result: unknown) {
  return { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(result !== undefined ? [result] : []) }) };
}

function selectWhereArrayChain(results: unknown[]) {
  return { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(results) }) };
}

function selectInnerJoinChain(results: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(results),
      }),
    }),
  };
}

function insertChain(result: unknown) {
  return { values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([result]) }) };
}

function insertNoReturnChain() {
  return { values: jest.fn().mockResolvedValue([{}]) };
}

function updateChain(result: unknown) {
  return {
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([result]),
      }),
    }),
  };
}

function updateNoReturnChain() {
  return { set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }) };
}

function deleteNoReturnChain() {
  return { where: jest.fn().mockResolvedValue(undefined) };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGateway = { emitToUser: jest.fn() };
const mockNotificationsService = { create: jest.fn() };
const mockDb = { db: { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: AppGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<CollaborationService>(CollaborationService);
    jest.clearAllMocks();
  });

  // ── inviteFriend ───────────────────────────────────────────────────────────

  describe('inviteFriend()', () => {
    it('creates a pending invite for the friend and emits socket', async () => {
      // select 1: getSongOrThrow → song
      // select 2: friendship check → friendship
      // select 3: existing collaborator check → null (no existing)
      // select 4: inviter username → { username: 'owner' }
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(mockFriendship))
        .mockReturnValueOnce(selectWhereChain(undefined))
        .mockReturnValueOnce(selectWhereChain({ username: 'owner' }));
      mockDb.db.insert.mockReturnValue(insertChain(mockPendingInvite));

      const result = await service.inviteFriend(songId, collaboratorId, ownerId);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        collaboratorId,
        'collaborator_invited',
        expect.objectContaining({ songId }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        collaboratorId,
        'collaborator_invited',
        expect.objectContaining({ songId }),
      );
      expect(result).toEqual(mockPendingInvite);
    });

    it('throws ForbiddenException when caller is not the song owner', async () => {
      const otherSong = { ...mockSong, userId: 'someone-else' };
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(otherSong));

      await expect(service.inviteFriend(songId, collaboratorId, ownerId))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when inviter and invitee are not friends', async () => {
      // select 1: getSongOrThrow → song (owned by ownerId)
      // select 2: friendship check → undefined (no friendship)
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.inviteFriend(songId, collaboratorId, ownerId))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when user is already a collaborator', async () => {
      // select 1: getSongOrThrow → song
      // select 2: friendship check → friendship
      // select 3: existing collaborator check → existing row
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(mockFriendship))
        .mockReturnValueOnce(selectWhereChain(mockCollaboratorRow));

      await expect(service.inviteFriend(songId, collaboratorId, ownerId))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── acceptInvite ───────────────────────────────────────────────────────────

  describe('acceptInvite()', () => {
    it('accepts the invite and notifies the owner', async () => {
      // select 1: getSongOrThrow → song
      // select 2: find pending invite → pendingInvite
      // select 3: joiner username after update → { username: 'collaborator' }
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(mockPendingInvite))
        .mockReturnValueOnce(selectWhereChain({ username: 'collaborator' }));
      mockDb.db.update.mockReturnValue(updateNoReturnChain());

      const result = await service.acceptInvite(songId, collaboratorId);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        mockSong.userId,
        'collaborator_joined',
        expect.objectContaining({ songId }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        mockSong.userId,
        'collaborator_joined',
        expect.objectContaining({ songId }),
      );
      expect(result).toEqual({ ok: true });
    });

    it('throws NotFoundException when no pending invite exists', async () => {
      // select 1: getSongOrThrow → song
      // select 2: find pending invite → undefined
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.acceptInvite(songId, collaboratorId))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── removeCollaborator ─────────────────────────────────────────────────────

  describe('removeCollaborator()', () => {
    it('owner removes a collaborator and emits socket', async () => {
      // select 1: getSongOrThrow → song
      // select 2: find collaborator row → collaboratorRow
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(mockCollaboratorRow));
      mockDb.db.delete.mockReturnValue(deleteNoReturnChain());

      const result = await service.removeCollaborator(songId, collaboratorId, ownerId);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        collaboratorId,
        'collaborator_removed',
        expect.objectContaining({ songId }),
      );
      expect(result).toEqual({ ok: true });
    });

    it('collaborator can remove themselves (leave)', async () => {
      // requesterId === targetUserId === collaboratorId (self-removal)
      // select 1: getSongOrThrow → song
      // select 2: find collaborator row → collaboratorRow
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(mockCollaboratorRow));
      mockDb.db.delete.mockReturnValue(deleteNoReturnChain());

      const result = await service.removeCollaborator(songId, collaboratorId, collaboratorId);

      // Both the removed user and the owner should be notified
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        collaboratorId,
        'collaborator_removed',
        expect.objectContaining({ songId }),
      );
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        mockSong.userId,
        'collaborator_removed',
        expect.objectContaining({ songId }),
      );
      expect(result).toEqual({ ok: true });
    });

    it('throws ForbiddenException when non-owner tries to remove another', async () => {
      const thirdPartyId = 'third-party-uuid';
      const anotherUserId = 'another-user-uuid';
      // song is owned by ownerId; requesterId is thirdPartyId (not owner, not self-removal)
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(mockSong));

      await expect(service.removeCollaborator(songId, anotherUserId, thirdPartyId))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ── proposeDraft ───────────────────────────────────────────────────────────

  describe('proposeDraft()', () => {
    it('marks the draft as proposed and notifies the owner', async () => {
      // select 1: isCollaborator check → collaboratorRow (truthy)
      // select 2: getSongOrThrow → song
      // select 3: find active draft → draft
      // select 4: proposer username → { username: 'collaborator' }
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockCollaboratorRow))
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(mockDraft))
        .mockReturnValueOnce(selectWhereChain({ username: 'collaborator' }));
      mockDb.db.update.mockReturnValue(updateChain(mockProposedDraft));

      const result = await service.proposeDraft(songId, collaboratorId);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        mockSong.userId,
        'song_proposal',
        expect.objectContaining({ songId, draftId: mockDraft.id }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        mockSong.userId,
        'proposal_submitted',
        expect.objectContaining({ songId }),
      );
      expect(result).toEqual(mockProposedDraft);
    });

    it('throws ForbiddenException when caller is not a collaborator', async () => {
      // select 1: isCollaborator check → undefined (not a collaborator)
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.proposeDraft(songId, collaboratorId))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when no active draft exists', async () => {
      // select 1: isCollaborator check → collaboratorRow
      // select 2: getSongOrThrow → song
      // select 3: find active draft → undefined
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockCollaboratorRow))
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.proposeDraft(songId, collaboratorId))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── acceptProposal ─────────────────────────────────────────────────────────

  describe('acceptProposal()', () => {
    it('applies draft sections to song, snapshots version, and notifies proposer', async () => {
      // select 1: getSongOrThrow → song
      // select 2: find proposed draft → proposedDraft
      // select 3: find collaborators for socket emit → [] (empty list)
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(mockProposedDraft))
        .mockReturnValueOnce(selectWhereArrayChain([]));
      mockDb.db.insert.mockReturnValue(insertNoReturnChain());
      mockDb.db.update
        .mockReturnValueOnce(updateNoReturnChain())  // update songs sections
        .mockReturnValueOnce(updateNoReturnChain()); // mark draft accepted

      const result = await service.acceptProposal(songId, draftId, ownerId);

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        mockProposedDraft.userId,
        'proposal_accepted',
        expect.objectContaining({ songId }),
      );
      expect(result).toEqual({ ok: true, sections: mockProposedDraft.sections });
    });

    it('throws ForbiddenException when caller is not the owner', async () => {
      const notOwner = 'not-the-owner-uuid';
      // song.userId is ownerId but we pass notOwner as ownerId
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(mockSong));

      await expect(service.acceptProposal(songId, draftId, notOwner))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when proposal draft is not found', async () => {
      // select 1: getSongOrThrow → song
      // select 2: find draft → undefined
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.acceptProposal(songId, draftId, ownerId))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── rejectProposal ─────────────────────────────────────────────────────────

  describe('rejectProposal()', () => {
    it('marks draft as rejected and emits socket to proposer', async () => {
      // select 1: getSongOrThrow → song
      // select 2: find proposed draft → proposedDraft
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(mockProposedDraft));
      mockDb.db.update.mockReturnValue(updateNoReturnChain());

      const result = await service.rejectProposal(songId, draftId, ownerId);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        mockProposedDraft.userId,
        'proposal_rejected',
        expect.objectContaining({ songId, draftId }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        mockProposedDraft.userId,
        'proposal_rejected',
        expect.objectContaining({ songId }),
      );
      expect(result).toEqual({ ok: true });
    });

    it('throws ForbiddenException when caller is not the owner', async () => {
      const notOwner = 'not-the-owner-uuid';
      mockDb.db.select.mockReturnValueOnce(selectWhereChain(mockSong));

      await expect(service.rejectProposal(songId, draftId, notOwner))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when proposal draft is not found', async () => {
      // select 1: getSongOrThrow → song
      // select 2: find draft → undefined
      mockDb.db.select
        .mockReturnValueOnce(selectWhereChain(mockSong))
        .mockReturnValueOnce(selectWhereChain(undefined));

      await expect(service.rejectProposal(songId, draftId, ownerId))
        .rejects.toThrow(NotFoundException);
    });
  });
});
